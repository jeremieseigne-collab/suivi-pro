import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { supabase } from '../lib/supabase'
import { LoadingState, fmtEur } from '../components/shared'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { useSeason } from '../context/SeasonContext'
import { aller } from '../shell/navigation'
import { Toast } from '../cahier/Reperes'
import { nomPropre, formeComparaison, marquesSemblables } from '../cahier/commun'
import { DEFAULT_DELAIS, DEFAULT_NB_CHEQUE } from '../data/reglement'
import ChequePlanModal from '../reglement/ChequePlanModal'
import { libelleSaison } from './csvPolaris'
import '../cahier/cahier.css'
import './fournisseurs.css'

// Réglages → Fournisseurs et marques (plan C, étape 2 bis, Direction) : un fournisseur a une ou plusieurs marques.
// Le règlement (mode, conditions, plan chèque) se règle au fournisseur ; les contacts dans le Répertoire.
const MODES = ['', 'PRELEVEMENT', 'CHEQUE', 'GARANT', 'VIREMENT', 'GMS', 'LCR']
const texteMode = r => {
  if (!r?.modeReglement) return '—'
  const c = r.condition || {}
  if (r.modeReglement === 'CHEQUE') return `CHEQUE · ${parseInt(c.nb) || DEFAULT_NB_CHEQUE} chèques`
  const d = Array.isArray(c.delais) && c.delais.length ? c.delais : DEFAULT_DELAIS[r.modeReglement]
  return r.modeReglement + (d ? ` · ${d.join(' / ')} j` : '')
}
const msg = e => String(e?.message || e || 'Erreur')

function Feuille({ titre, onFermer, children, pied }) {
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">{children}</div>
        {pied && <div className="feuille-pied">{pied}</div>}
      </div>
    </>
  )
}

// ─── Ajouter une marque : garde-fou anti-doublon du Cahier, puis fournisseur du même nom (ou rattachement proposé, Q7) ───
function NouvelleMarque({ marques, frs, onFermer, onCree }) {
  const [nom, setNom] = useState('')
  const [rattacher, setRattacher] = useState('')        // '' = créer son fournisseur ; sinon n° d'un fournisseur homonyme
  const [malgre, setMalgre] = useState(false)
  const [erreur, setErreur] = useState('')
  const n = nomPropre(nom)
  const existante = n && marques.find(m => formeComparaison(m.nom) === formeComparaison(n))
  const proches = n && !existante ? marquesSemblables(n, marques.map(m => m.nom)) : []
  const homonymes = n ? frs.filter(f => formeComparaison(f.nom) === formeComparaison(n)) : []
  async function creer() {
    setErreur('')
    try {
      const id = await db.fournisseurs.add({ nom: n, modelesBySeason: {}, ...(rattacher ? { fournisseurReelId: Number(rattacher) } : {}) })
      onCree(id, n)
    } catch (e) { setErreur('Création impossible : ' + msg(e)) }
  }
  return (
    <Feuille titre="Ajouter une marque" onFermer={onFermer}
      pied={<><span className="total"> </span><button className="btn btn-prim" disabled={!n || !!existante || (proches.length > 0 && !malgre)} onClick={creer}>Créer la marque</button></>}>
      <input className="champ" autoFocus placeholder="Nom de la marque" value={nom} onChange={e => { setNom(e.target.value); setMalgre(false); setRattacher(''); setErreur('') }} aria-label="Nom de la marque" />
      {existante && <div className="encart err" style={{ marginTop: 10 }}>« {existante.nom} » existe déjà.</div>}
      {proches.length > 0 && !malgre && (
        <div className="encart att" style={{ marginTop: 10, flexDirection: 'column', gap: 6 }}>
          <b>Tu voulais dire… ?</b>
          {proches.map(p => <span key={p}>• {p}</span>)}
          <button className="btn" onClick={() => setMalgre(true)}>Non, créer « {n} »</button>
        </div>
      )}
      {n && !existante && homonymes.length > 0 && (
        <div className="carte" style={{ marginTop: 12 }}>
          <span className="etiquette" style={{ marginTop: 0 }}>Un fournisseur porte déjà ce nom</span>
          <label className="ligne-choix"><input type="radio" checked={!rattacher} onChange={() => setRattacher('')} /> Créer son propre fournisseur « {n} »</label>
          {homonymes.map(f => <label key={f.id} className="ligne-choix"><input type="radio" checked={rattacher === String(f.id)} onChange={() => setRattacher(String(f.id))} /> Rattacher au fournisseur « {f.nom} »</label>)}
        </div>
      )}
      {n && !existante && !homonymes.length && <p className="aide">Son fournisseur « {n} » sera créé ; tu pourras le renommer ou rattacher la marque à un autre fournisseur.</p>}
      {erreur && <div className="encart err" style={{ marginTop: 10 }}>{erreur}</div>}
    </Feuille>
  )
}

// ─── Effet d'un déplacement de marque sur le Plan de règlement (Q6 : avertissement détaillé) ───
async function effetDeplacement(marque, source, cible, magasins) {
  const [params, entrees, regl, pointages] = await Promise.all([
    db.parametres.where('fournisseurId').equals(marque.id).toArray(),
    db.entrees.where('fournisseurId').equals(marque.id).toArray(),
    db.reglementsFournisseurs.toArray(),
    db.reglementPaye.toArray(),
  ])
  const saisons = {}
  params.filter(p => p.reelN).forEach(p => { const s = (saisons[p.season] ||= { reel: 0, entrees: 0, pht: 0 }); s.reel += p.reelN })
  entrees.filter(e => e.statut !== 'Retour').forEach(e => { const s = (saisons[e.season] ||= { reel: 0, entrees: 0, pht: 0 }); s.entrees++; s.pht += Number(e.pht) || 0 })
  const cles = new Set(pointages.map(p => p.cle))
  const chequesPointes = [...cles].filter(k => k.startsWith(`cheque|${source.clePointage}|`) && saisons[k.split('|')[3]]).length
  const livPointees = entrees.filter(e => [...cles].some(k => k.startsWith(`liv|${e.id}|`))).length
  const modes = magasins.map(m => {
    const a = regl.find(r => r.fournisseurReelId === source.id && r.magasinId === m.id), b = cible && regl.find(r => r.fournisseurReelId === cible.id && r.magasinId === m.id)
    return { magasin: m.nom, avant: texteMode(a), apres: cible ? texteMode(b) : '— (nouveau fournisseur, à régler)' }
  })
  return { saisons, chequesPointes, livPointees, modes }
}

function DeplacerMarque({ marque, source, frs, magasins, onFermer, onToast }) {
  const [cibleId, setCibleId] = useState('')
  const [effet, setEffet] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const cible = cibleId && cibleId !== '__nouveau' ? frs.find(f => f.id === Number(cibleId)) : null
  async function choisir(v) {
    setCibleId(v); setEffet(null); setErreur('')
    if (!v) return
    try { setEffet(await effetDeplacement(marque, source, v === '__nouveau' ? null : frs.find(f => f.id === Number(v)), magasins)) } catch (e) { setErreur(msg(e)) }
  }
  async function deplacer() {
    setEnvoi(true); setErreur('')
    try {
      let id = cible?.id
      if (cibleId === '__nouveau') id = await db.fournisseursReels.add({ nom: marque.nom })
      await db.fournisseurs.update(marque.id, { fournisseurReelId: id })
      onToast({ texte: `${marque.nom} → fournisseur ${cible?.nom || marque.nom}`, annuler: () => db.fournisseurs.update(marque.id, { fournisseurReelId: source.id }) })
      onFermer()
    } catch (e) { setErreur('Déplacement impossible : ' + msg(e)); setEnvoi(false) }
  }
  const saisons = effet ? Object.entries(effet.saisons).sort() : []
  return (
    <Feuille titre={`Déplacer « ${marque.nom} »`} onFermer={onFermer}
      pied={<><span className="total"> </span><button className="btn btn-prim" disabled={!effet || envoi} onClick={deplacer}>{envoi ? 'Déplacement…' : 'Déplacer la marque'}</button></>}>
      <p className="aide" style={{ marginTop: 0 }}>Aujourd’hui chez <b>{source.nom}</b>. Vers :</p>
      <select className="champ" value={cibleId} onChange={e => choisir(e.target.value)} aria-label="Fournisseur de destination">
        <option value="">— Choisir un fournisseur —</option>
        <option value="__nouveau">Nouveau fournisseur « {marque.nom} »</option>
        {frs.filter(f => f.id !== source.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
      </select>
      {effet && (
        <div className="encart att" style={{ marginTop: 12, flexDirection: 'column', gap: 6 }}>
          <b>Effet sur le Plan de règlement (toutes les saisons, échéances passées comprises)</b>
          {saisons.length ? saisons.map(([s, x]) => (
            <span key={s}>• {libelleSaison(s)} : réel achat {fmtEur(x.reel)} et {x.entrees} livraison{x.entrees > 1 ? 's' : ''} ({fmtEur(x.pht)}) passent de {source.nom} à {cible?.nom || marque.nom}{x.reel ? ' — les chèques des deux fournisseurs sont recalculés' : ''}</span>
          )) : <span>• Aucun achat ni aucune livraison enregistrés : aucune échéance ne change.</span>}
          {effet.chequesPointes > 0 && <span>• {effet.chequesPointes} chèque{effet.chequesPointes > 1 ? 's' : ''} déjà pointé{effet.chequesPointes > 1 ? 's' : ''} chez {source.nom} sur ces saisons : leur montant change.</span>}
          {effet.livPointees > 0 && <span>• {effet.livPointees} livraison{effet.livPointees > 1 ? 's' : ''} déjà pointée{effet.livPointees > 1 ? 's' : ''} : elles restent pointées, sous le nom du nouveau fournisseur.</span>}
          <span style={{ marginTop: 4 }}>Mode de règlement de la marque, par magasin :</span>
          {effet.modes.map(m => <span key={m.magasin}>• {m.magasin} : {m.avant}{m.avant !== m.apres ? <> → <b>{m.apres}</b></> : ' (inchangé)'}</span>)}
        </div>
      )}
      {erreur && <div className="encart err" style={{ marginTop: 10 }}>{erreur}</div>}
    </Feuille>
  )
}

function Fusionner({ source, frs, onFermer, onToast }) {
  const [cibleId, setCibleId] = useState('')
  const [apercu, setApercu] = useState(null)
  const [tape, setTape] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  async function choisir(v) {
    setCibleId(v); setApercu(null); setErreur('')
    if (!v) return
    const { data, error } = await supabase.rpc('fusionner_fournisseurs', { p_source: source.id, p_cible: Number(v), p_essai: true })
    if (error) setErreur(error.message); else setApercu(data)
  }
  async function fusionner() {
    setEnvoi(true); setErreur('')
    const { error } = await supabase.rpc('fusionner_fournisseurs', { p_source: source.id, p_cible: Number(cibleId), p_essai: false })
    if (error) { setErreur(error.message); setEnvoi(false); return }
    onToast({ texte: `${source.nom} fusionné dans ${apercu.cible}` }); onFermer(true)
  }
  const ok = apercu && formeComparaison(tape) === formeComparaison(source.nom)
  return (
    <Feuille titre={`Fusionner « ${source.nom} »`} onFermer={() => onFermer(false)}
      pied={<><span className="total"> </span><button className="btn btn-danger-plein" disabled={!ok || envoi} onClick={fusionner}>{envoi ? 'Fusion…' : 'Fusionner'}</button></>}>
      <p className="aide" style={{ marginTop: 0 }}>Ses marques passent au fournisseur gardé ; contacts, règlements et plans chèques : le gardé gagne, celui-ci comble les trous ; ses chèques pointés sont rattachés au gardé.</p>
      <select className="champ" value={cibleId} onChange={e => choisir(e.target.value)} aria-label="Fournisseur gardé">
        <option value="">— Fournisseur gardé —</option>
        {frs.filter(f => f.id !== source.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
      </select>
      {apercu && (
        <div className="encart neutre" style={{ marginTop: 12, flexDirection: 'column', gap: 4 }}>
          <span>Marques déplacées : <b>{apercu.marques.length ? apercu.marques.join(', ') : 'aucune'}</b></span>
          <span>Règlements repris : {apercu.reglements_repris} ; écartés (le gardé a déjà le sien) : {apercu.reglements_ecartes.length}</span>
          <span>Plans chèques repris : {apercu.plans_repris} ; écartés : {apercu.plans_ecartes.length}</span>
          <span>Chèques pointés rattachés : {apercu.pointages_rattaches}{apercu.pointages_deja_chez_le_garde ? ` ; ${apercu.pointages_deja_chez_le_garde} déjà pointé(s) chez le gardé (conservé(s) sous l’ancien nom, « sans marque »)` : ''}</span>
        </div>
      )}
      {apercu && <label className="etiquette" style={{ marginTop: 14 }}>Pour confirmer, retape « {source.nom} »<input className="champ" value={tape} onChange={e => setTape(e.target.value)} /></label>}
      {erreur && <div className="encart err" style={{ marginTop: 10 }}>{erreur}</div>}
    </Feuille>
  )
}

// ─── Fiche d'un fournisseur ───
function FicheFournisseur({ fr, marques, frs, magasins, regl, plans, season, onFermer, onToast }) {
  const { seasons } = useSeason()
  const [nom, setNom] = useState(fr.nom)
  const [deplacer, setDeplacer] = useState(null)
  const [fusion, setFusion] = useState(false)
  const [supprimer, setSupprimer] = useState(false)
  const [plan, setPlan] = useState(null)
  const [erreur, setErreur] = useState('')
  const sesMarques = marques.filter(m => m.fournisseurReelId === fr.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  const proches = marquesSemblables(nom, frs.filter(f => f.id !== fr.id).map(f => f.nom))
  const saisonLib = (seasons.find(s => s.id === season) || {}).label || season
  const essai = async f => { setErreur(''); try { await f() } catch (e) { setErreur(msg(e)) } }
  const regle = mId => regl.find(r => r.fournisseurReelId === fr.id && r.magasinId === mId)
  async function setRegle(mId, champs) {
    const r = regle(mId)
    if (r) await db.reglementsFournisseurs.update(r.id, champs)
    else await db.reglementsFournisseurs.add({ fournisseurReelId: fr.id, magasinId: mId, modeReglement: '', condition: {}, ...champs })
  }
  const planDe = mId => plans.find(p => p.fournisseurReelId === fr.id && p.magasinId === mId && p.season === season)
  async function enregistrerPlan(mId, cheques) {
    const p = planDe(mId)
    if (p) { if (cheques.length) await db.plansCheques.update(p.id, { cheques }); else await db.plansCheques.delete(p.id) }
    else if (cheques.length) await db.plansCheques.add({ fournisseurReelId: fr.id, magasinId: mId, season, cheques })
  }
  return (
    <>
      <Feuille titre={fr.nom} onFermer={onFermer}>
        <span className="etiquette" style={{ marginTop: 0 }}>Nom du fournisseur</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="champ" value={nom} onChange={e => setNom(e.target.value)} aria-label="Nom du fournisseur" />
          <button className="btn" disabled={!nomPropre(nom) || nomPropre(nom) === fr.nom} onClick={() => essai(async () => { await db.fournisseursReels.update(fr.id, { nom: nomPropre(nom) }); onToast({ texte: `Fournisseur renommé « ${nomPropre(nom)} »` }) })}>Renommer</button>
        </div>
        {proches.length > 0 && nomPropre(nom) !== fr.nom && <div className="encart att" style={{ marginTop: 8 }}>Nom proche d’un autre fournisseur : {proches.join(', ')}. Ce sont peut-être les mêmes : pense à « Fusionner ».</div>}

        <h3 className="groupe-titre">Marques · {sesMarques.length}</h3>
        {!sesMarques.length ? <div className="aide" style={{ padding: '0 4px' }}>Sans marque. Il peut être supprimé s’il n’a ni chèque pointé ni plan de chèques.</div> : (
          <div className="liste">
            {sesMarques.map(m => (
              <div key={m.id} className="ligne" style={{ minHeight: 52, cursor: 'default' }}>
                <span className="txt"><span className="t1">{m.nom}</span><span className="t2">{m.contactsHerites === false ? 'contacts propres à la marque' : 'contacts du fournisseur'}</span></span>
                <button className="btn petit" onClick={() => setDeplacer(m)}>Déplacer…</button>
              </div>
            ))}
          </div>
        )}

        <h3 className="groupe-titre">Règlement par magasin</h3>
        <div className="liste">
          {magasins.map(m => {
            const r = regle(m.id), c = r?.condition || {}, p = planDe(m.id)
            return (
              <div key={m.id} className="ligne" style={{ cursor: 'default', flexWrap: 'wrap', gap: 8 }}>
                <span className="txt" style={{ minWidth: 140 }}><span className="t1">{m.nom}</span></span>
                <select className="champ" style={{ width: 'auto', minWidth: 140 }} value={r?.modeReglement || ''} aria-label={`Mode de règlement ${m.nom}`}
                  onChange={e => essai(() => setRegle(m.id, { modeReglement: e.target.value, condition: {} }))}>
                  {MODES.map(x => <option key={x} value={x}>{x || '—'}</option>)}
                </select>
                {r?.modeReglement === 'CHEQUE' && <>
                  <input key={`nb-${r.id}-${c.nb}`} className="champ" style={{ width: 90 }} type="number" min="1" defaultValue={c.nb ?? ''} placeholder={String(DEFAULT_NB_CHEQUE)} aria-label="Nombre de chèques"
                    onBlur={e => essai(() => setRegle(m.id, { condition: { nb: parseInt(e.target.value) || null } }))} />
                  <button className="btn petit" onClick={() => setPlan({ m, initial: p?.cheques || [] })}>{p ? `Plan ${saisonLib} : ${p.cheques.length} chèque${p.cheques.length > 1 ? 's' : ''}` : `Dates perso (${saisonLib})`}</button>
                </>}
                {r?.modeReglement && r.modeReglement !== 'CHEQUE' && (
                  <input key={`de-${r.id}-${(c.delais || []).join()}`} className="champ" style={{ width: 150 }} defaultValue={(c.delais || []).join(', ')} placeholder={(DEFAULT_DELAIS[r.modeReglement] || []).join(', ') + ' jours'} aria-label="Délais en jours"
                    onBlur={e => essai(() => setRegle(m.id, { condition: { delais: e.target.value.split(/[^0-9]+/).filter(Boolean).map(Number) } }))} />
                )}
              </div>
            )
          })}
        </div>
        <p className="aide">Le Plan de règlement additionne les achats et livraisons de toutes les marques du fournisseur. Contacts : dans le <button className="lien" style={{ padding: 0 }} onClick={() => aller('repertoire')}>Répertoire</button>.</p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button className="btn" onClick={() => setFusion(true)}>Fusionner avec un autre fournisseur…</button>
          {!sesMarques.length && <button className="btn btn-danger" onClick={() => setSupprimer(true)}>Supprimer ce fournisseur</button>}
        </div>
        {erreur && <div className="encart err" style={{ marginTop: 10 }}>{erreur}</div>}
      </Feuille>
      {deplacer && <DeplacerMarque marque={deplacer} source={fr} frs={frs} magasins={magasins} onToast={onToast} onFermer={() => setDeplacer(null)} />}
      {fusion && <Fusionner source={fr} frs={frs} onToast={onToast} onFermer={fini => { setFusion(false); if (fini) onFermer() }} />}
      {supprimer && <Confirmation danger titre={`Supprimer « ${fr.nom} » ?`} texte="Ce fournisseur n’a plus de marque." confirmer="Supprimer"
        onAnnuler={() => setSupprimer(false)} onConfirmer={() => { setSupprimer(false); essai(async () => { await db.fournisseursReels.delete(fr.id); onToast({ texte: `Fournisseur « ${fr.nom} » supprimé` }); onFermer() }) }} />}
      {plan && <ChequePlanModal fournisseur={fr.nom} magasin={plan.m.nom} seasonLabel={saisonLib} initial={plan.initial}
        onSave={cheques => { const m = plan.m; setPlan(null); essai(() => enregistrerPlan(m.id, cheques)) }} onClose={() => setPlan(null)} />}
    </>
  )
}

export default function FournisseursMarques() {
  const { season } = useSeason()
  const [rech, setRech] = useState('')
  const [ficheId, setFicheId] = useState(null)
  const [nouvelle, setNouvelle] = useState(false)
  const [toast, setToast] = useState(null)
  const d = useLiveQuery(async () => {
    const [frs, marques, magasins, regl, plans] = await Promise.all([db.fournisseursReels.toArray(), db.fournisseurs.toArray(), db.magasins.orderBy('nom').toArray(),
      db.reglementsFournisseurs.toArray(), db.plansCheques.toArray()])
    return { frs, marques, magasins, regl, plans }
  }, [])

  const vue = useMemo(() => {
    if (!d) return null
    const q = formeComparaison(rech)
    const parFr = {}; d.marques.forEach(m => (parFr[m.fournisseurReelId] ||= []).push(m))
    const liste = d.frs.map(f => ({ f, marques: (parFr[f.id] || []).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')) }))
      .filter(x => !q || [x.f.nom, ...x.marques.map(m => m.nom)].some(n => formeComparaison(n).includes(q)))
      .sort((a, b) => a.f.nom.localeCompare(b.f.nom, 'fr'))
    // Noms proches à vérifier : deux fournisseurs, ou une marque et un autre fournisseur (Q7)
    const proches = []
    d.frs.forEach(f => {
      marquesSemblables(f.nom, d.frs.filter(x => x.id > f.id).map(x => x.nom)).forEach(n => proches.push(`fournisseurs « ${f.nom} » et « ${n} »`))
      d.marques.filter(m => m.fournisseurReelId !== f.id && formeComparaison(m.nom) === formeComparaison(f.nom))
        .forEach(m => proches.push(`la marque « ${m.nom} » (chez ${d.frs.find(x => x.id === m.fournisseurReelId)?.nom}) et le fournisseur « ${f.nom} »`))
    })
    return { liste, proches }
  }, [d, rech])

  if (!d) return <LoadingState />
  const fiche = ficheId && d.frs.find(f => f.id === ficheId)
  const carte = ({ f, marques }) => (
    <button key={f.id} className="ligne cf-carte" onClick={() => setFicheId(f.id)}>
      <span className="txt">
        <span className="t1">{f.nom}{!marques.length && <span className="etat-mot att" style={{ marginLeft: 6 }}>sans marque</span>}</span>
        <span className="t2">{marques.length ? marques.map(m => m.nom).join(', ') : '—'}</span>
        {<span className="t2">{d.magasins.map(m => `${m.nom} : ${texteMode(d.regl.find(r => r.fournisseurReelId === f.id && r.magasinId === m.id))}`).join(' · ')}</span>}
      </span>
      <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
    </button>
  )
  const avec = vue.liste.filter(x => x.marques.length), sans = vue.liste.filter(x => !x.marques.length)
  return (
    <div className="fournisseurs-marques">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div className="recherche" style={{ flex: '1 1 260px', margin: 0 }}><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
          <input className="champ" placeholder="Fournisseur ou marque…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
        <button className="btn btn-prim" onClick={() => setNouvelle(true)}><Icone nom="ajout" taille={20} />Ajouter une marque</button>
      </div>
      <div className="sous-info">{d.frs.length} fournisseurs · {d.marques.length} marques · règlement (mode, conditions, plan chèque) dans la fiche du fournisseur</div>
      {vue.proches.length > 0 && (
        <div className="encart att" style={{ marginTop: 10, flexDirection: 'column', gap: 4 }}>
          <b>Noms proches à vérifier</b>{vue.proches.map(p => <span key={p}>• {p}</span>)}
        </div>
      )}
      {!vue.liste.length ? <div className="vide">Aucun fournisseur ne correspond.</div> : <>
        <div className="liste" style={{ marginTop: 10 }}>{avec.map(carte)}</div>
        {sans.length > 0 && <><h3 className="groupe-titre">Sans marque · {sans.length}</h3><div className="liste">{sans.map(carte)}</div></>}
      </>}
      {fiche && <FicheFournisseur key={fiche.id} fr={fiche} marques={d.marques} frs={d.frs} magasins={d.magasins} regl={d.regl} plans={d.plans} season={season}
        onToast={setToast} onFermer={() => setFicheId(null)} />}
      {nouvelle && <NouvelleMarque marques={d.marques} frs={d.frs} onFermer={() => setNouvelle(false)}
        onCree={async (id, n) => { setNouvelle(false); const m = await db.fournisseurs.get(id); setToast({ texte: `Marque « ${n} » créée` }); if (m) setFicheId(m.fournisseurReelId) }} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </div>
  )
}

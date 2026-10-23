import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState, fmtTel } from '../components/shared'
import RepertoireImportModal from '../components/RepertoireImportModal'
import Icone from '../components/ui/Icone'
import { useMagasin } from '../context/MagasinContext'
import { useCompte } from '../context/CompteContext'
import { PageShell } from '../shell/EnTete'
import { Toast } from '../cahier/Reperes'
import { ChoixMarque } from '../savdef/Champs'
import '../cahier/cahier.css'
import '../savdef/savdef.css'
import './repertoire.css'

// Coordonnées propres à chaque magasin (le reste — comptabilité, adresse, notes — est commun au fournisseur), comme aujourd'hui
// « Mail commandes » (13/10) : propre au magasin, sans valeur commune ; utilisé par les mails de réassort (repli : mail SAV, puis adresse commune)
const STORE_KEYS = ['contact', 'telephone', 'emailCommandes', 'contactSav', 'telephoneFixe', 'email', 'numeroClient', 'btob']
const TELS = ['telephone', 'telephoneFixe', 'telCompta']
const MAILS = ['email', 'emailCommandes', 'emailCompta']
const gmail = e => e ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}` : undefined
const lien = u => u ? (/^https?:\/\//i.test(u) ? u : 'https://' + u) : undefined
const telHref = t => t ? `tel:${t.replace(/[^\d+]/g, '')}` : undefined
// Valeur pour le magasin choisi, avec repli sur l'ancienne valeur commune (données existantes), comme aujourd'hui
const valeur = (f, magId, key) => STORE_KEYS.includes(key) ? (() => { const cm = f.coordsMagasin && f.coordsMagasin[magId]; return (cm && cm[key] != null) ? cm[key] : (f[key] || '') })() : (f[key] || '')

const CHAMPS = [
  { titre: 'Commercial', champs: [['contact', 'Nom'], ['telephone', 'Téléphone', 'tel'], ['emailCommandes', 'Mail commandes', 'mail']] },
  { titre: 'SAV', champs: [['contactSav', 'Contact'], ['telephoneFixe', 'Téléphone', 'tel'], ['email', 'Mail', 'mail']] },
  { titre: 'Compte (ce magasin)', champs: [['numeroClient', 'N° client'], ['btob', 'Espace BtoB', 'lien']] },
]
const COMMUNS = [
  { titre: 'Comptabilité', champs: [['contactCompta', 'Contact'], ['telCompta', 'Téléphone', 'tel'], ['emailCompta', 'Mail', 'mail']] },
  { titre: 'Adresse postale (société)', champs: [['adresse', 'Adresse', 'texte']] },
  { titre: 'Notes', champs: [['notes', 'Notes', 'texte']] },
]

function BoutonContact({ type, v }) {
  if (!v) return null
  if (type === 'tel') return <a className="icone-btn petit" href={telHref(v)} aria-label={`Appeler ${v}`} title="Appeler"><Icone nom="telephone" taille={20} /></a>
  if (type === 'mail') return <a className="icone-btn petit" href={gmail(v)} target="_blank" rel="noopener noreferrer" aria-label={`Écrire à ${v}`} title="Écrire (Gmail)"><Icone nom="mail" taille={20} /></a>
  if (type === 'lien') return <a className="icone-btn petit" href={lien(v)} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir l'espace BtoB" title="Ouvrir"><Icone nom="chevron" taille={20} /></a>
  return null
}

// Coordonnées d'une marque pour le magasin choisi. Deux façons de modifier (point C) :
// « Modifier » puis « Enregistrer », ou enregistrement en quittant le champ. Dans les deux cas, seules les valeurs changées sont écrites.
function Coordonnees({ f, magId, modeBouton, onToast, ouvertCommun = false }) {
  const [edition, setEdition] = useState(!modeBouton)
  const [brouillon, setBrouillon] = useState({})
  const [commun, setCommun] = useState(ouvertCommun)
  const tous = [...CHAMPS, ...COMMUNS].flatMap(g => g.champs.map(c => c[0]))
  const actuel = Object.fromEntries(tous.map(k => [k, valeur(f, magId, k)]))
  const v = k => brouillon[k] ?? actuel[k]
  const changer = (k, x) => setBrouillon(b => ({ ...b, [k]: TELS.includes(k) ? fmtTel(x) : x }))

  async function ecrire(cles, brut = brouillon) {
    // Adresses mail enregistrées sans espaces en trop
    const valeurs = Object.fromEntries(Object.entries(brut).map(([k, x]) => [k, MAILS.includes(k) && typeof x === 'string' ? x.trim() : x]))
    const changes = cles.filter(k => valeurs[k] !== undefined && valeurs[k] !== actuel[k])
    if (!changes.length) return 0
    const avant = { coordsMagasin: f.coordsMagasin || null, ...Object.fromEntries(changes.filter(k => !STORE_KEYS.includes(k)).map(k => [k, f[k] ?? null])) }
    const maj = {}
    const parMag = changes.filter(k => STORE_KEYS.includes(k))
    if (parMag.length) { const cm = { ...(f.coordsMagasin || {}) }; cm[magId] = { ...(cm[magId] || {}), ...Object.fromEntries(parMag.map(k => [k, valeurs[k]])) }; maj.coordsMagasin = cm }
    changes.filter(k => !STORE_KEYS.includes(k)).forEach(k => { maj[k] = valeurs[k] })
    await db.fournisseurs.update(f.id, maj)
    onToast?.({ texte: `${f.nom} : ${changes.length} information${changes.length > 1 ? 's' : ''} enregistrée${changes.length > 1 ? 's' : ''}`, annuler: () => db.fournisseurs.update(f.id, avant) })
    return changes.length
  }
  async function enregistrer() { try { await ecrire(Object.keys(brouillon)); setBrouillon({}); setEdition(false) } catch (e) { onToast?.({ texte: 'Enregistrement impossible : ' + (e.message || 'vérifie la connexion.') }) } }
  // En quittant un champ : on lit la valeur du champ lui-même (pas encore forcément dans le brouillon)
  async function quitterChamp(k, x) { try { await ecrire([k], { [k]: TELS.includes(k) ? fmtTel(x) : x }); setBrouillon(b => { const n = { ...b }; delete n[k]; return n }) } catch (e) { onToast?.({ texte: 'Enregistrement impossible : ' + e.message }) } }

  const ligneChamp = ([k, lib, type]) => (
    <div key={k} className="champ-coord">
      <span className="lib">{lib}</span>
      {edition ? (type === 'texte'
        ? <textarea className="champ" rows={2} value={v(k)} onChange={e => changer(k, e.target.value)} onBlur={!modeBouton ? e => quitterChamp(k, e.target.value) : undefined} aria-label={lib} />
        : <input className="champ" value={v(k)} inputMode={type === 'tel' ? 'tel' : type === 'mail' ? 'email' : undefined} onChange={e => changer(k, e.target.value)} onBlur={!modeBouton ? e => quitterChamp(k, e.target.value) : undefined} aria-label={lib} />)
        : <span className={`val${v(k) ? '' : ' manquant'}`}>{v(k) || '—'}</span>}
      <BoutonContact type={type} v={actuel[k]} />
    </div>
  )
  const groupe = g => <div key={g.titre} className="groupe-coord"><span className="etiquette">{g.titre}</span>{g.champs.map(ligneChamp)}</div>
  return (
    <div className="coordonnees">
      {CHAMPS.map(groupe)}
      <button className="lien" onClick={() => setCommun(o => !o)}>{commun ? '▾' : '▸'} Comptabilité · adresse · notes <span className="aide">(communs aux 3 magasins)</span></button>
      {commun && COMMUNS.map(groupe)}
      {modeBouton && <div className="actions-bloc">
        {edition ? <><button className="btn" onClick={() => { setBrouillon({}); setEdition(false) }}>Annuler</button><button className="btn btn-prim" onClick={enregistrer}>Enregistrer</button></>
          : <button className="btn" onClick={() => setEdition(true)}>Modifier</button>}
      </div>}
    </div>
  )
}

function FicheMarque({ f, magId, magNom, groupe, onToast, onFermer }) {
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={f.nom}>
        <div className="feuille-entete"><h2>{f.nom}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <div className="aide" style={{ marginBottom: 6 }}>Commercial, SAV et compte : propres à <b>{magNom}</b>.</div>
          {groupe && <div className="encart neutre" style={{ marginBottom: 10 }}>Réglé avec le groupe « {groupe.nom} » (marque pilote : {groupe.pilote}) — le mode de règlement est celui de la marque pilote.</div>}
          <Coordonnees key={f.id + '-' + magId} f={f} magId={magId} modeBouton onToast={onToast} />   {/* « Modifier » puis « Enregistrer » (décision du 13/10) */}
        </div>
      </div>
    </>
  )
}

// Ajouter une marque : avec le garde-fou du Cahier (point B), ou vérification du nom exact comme aujourd'hui
function NouvelleMarque({ fournisseurs, gardeFou, onCree, onFermer }) {
  const [nom, setNom] = useState('')
  const [erreur, setErreur] = useState('')
  async function ajouterSimple(e) {
    e.preventDefault()
    const n = nom.trim(); if (!n) return
    if (await db.fournisseurs.where('nom').equals(n).first()) return setErreur(`« ${n} » existe déjà`)
    try { const id = await db.fournisseurs.add({ nom: n, modelesBySeason: {} }); onCree(id, n) } catch (err) { setErreur('Création impossible : ' + err.message) }
  }
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille saisie-sav" role="dialog" aria-label="Nouvelle marque">
        <div className="feuille-entete"><h2>Nouvelle marque</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          {gardeFou
            ? <ChoixMarque fournisseurs={fournisseurs} valeurId="" onErreur={setErreur} onChoisir={(id, n) => onCree(id, n)} />
            : <form onSubmit={ajouterSimple} style={{ display: 'flex', gap: 8 }}>
                <input className="champ" autoFocus placeholder="Nom de la marque" value={nom} onChange={e => { setNom(e.target.value); setErreur('') }} />
                <button className="btn btn-prim" type="submit" disabled={!nom.trim()}>Ajouter</button>
              </form>}
          {erreur && <div className="encart err" style={{ marginTop: 12 }}>{erreur}</div>}
        </div>
      </div>
    </>
  )
}

// Marque rattachée à un groupe sans en être la pilote (plus petit n°) : réglée avec le groupe (même règle que le Plan de règlement)
function groupeDe(f, fournisseurs) {
  const gk = ((f.groupe || '').trim()) || f.nom
  const pilote = fournisseurs.filter(x => (((x.groupe || '').trim()) || x.nom) === gk).sort((a, b) => a.id - b.id)[0]
  return pilote && pilote.id !== f.id ? { nom: gk, pilote: pilote.nom } : null
}

export default function Repertoire() {
  const { estDirection } = useCompte()
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const { magasin: magasinCourant } = useMagasin()
  const [magId, setMagId] = useState(() => magasinCourant?.id || (() => { try { const x = localStorage.getItem('repertoire_magasin'); return x ? Number(x) : null } catch { return null } })())
  const [rech, setRech] = useState('')
  const [ficheId, setFicheId] = useState(null)
  const [nouvelle, setNouvelle] = useState(false)
  const [importer, setImporter] = useState(false)
  const [toast, setToast] = useState(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.duree || 5000); return () => clearTimeout(t) }, [toast])
  const choisirMag = id => { try { localStorage.setItem('repertoire_magasin', String(id)) } catch { /* ignore */ } setMagId(id) }
  const mId = useMemo(() => (magId && (magasins || []).some(m => m.id === magId)) ? magId : (magasins || [])[0]?.id ?? null, [magId, magasins])

  const liste = useMemo(() => {
    const tous = fournisseurs || []
    if (!rech) return tous
    const q = rech.toLowerCase()
    return tous.filter(f => [f.nom, f.contactCompta, f.telCompta, f.emailCompta, f.notes, ...STORE_KEYS.map(k => valeur(f, mId, k))].some(x => String(x || '').toLowerCase().includes(q)))
  }, [fournisseurs, rech, mId])

  const contenu = (fournisseurs === undefined || magasins === undefined) ? <LoadingState /> : (() => {
    const magNom = (magasins.find(m => m.id === mId) || {}).nom || ''
    const fiche = ficheId && fournisseurs.find(f => f.id === ficheId)
    return <>
      <div className="chips" style={{ marginBottom: 10 }}>
        {magasins.map(m => <button key={m.id} className="chip" aria-pressed={m.id === mId} onClick={() => choisirMag(m.id)}><Icone nom="magasin" taille={16} />{m.nom}</button>)}
      </div>
      <div className="recherche"><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="Marque, contact, mail, n° client…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
      <div className="sous-info">{magNom} · {liste.length} marque{liste.length > 1 ? 's' : ''} · commercial, SAV et compte propres à ce magasin ; comptabilité, adresse et notes communes</div>
      {!liste.length ? <div className="vide">{fournisseurs.length ? 'Aucune marque ne correspond.' : 'Aucune marque — touche « Nouvelle marque ».'}</div>
        : (   /* liste compacte qui ouvre la fiche (décision du 13/10) */
          <div className="liste" style={{ marginTop: 10 }}>
            {liste.map(f => {
              const contact = valeur(f, mId, 'contact'), tel = valeur(f, mId, 'telephone') || valeur(f, mId, 'telephoneFixe'), mail = valeur(f, mId, 'email')
              return (
                <div key={f.id} className="ligne ligne-entree ligne-marque">
                  <button className="zone-ouvrir" onClick={() => setFicheId(f.id)}>
                    <span className="txt"><span className="t1">{f.nom}</span>
                      <span className="t2">{[contact, valeur(f, mId, 'telephone') && fmtTel(valeur(f, mId, 'telephone'))].filter(Boolean).join(' · ') || 'Commercial non renseigné'}</span>
                      <span className="t2">{mail ? `SAV : ${mail}` : 'Mail SAV non renseigné'}</span></span>
                  </button>
                  <span className="contacts-ligne"><BoutonContact type="tel" v={tel} /><BoutonContact type="mail" v={mail} /></span>
                </div>
              )
            })}
          </div>
        )}
      <div style={{ textAlign: 'center', marginTop: 24 }} className="seulement-petit"><button className="btn btn-ghost" onClick={() => setImporter(true)}>Importer des contacts (CSV)</button></div>
      <div style={{ height: 72 }} className="seulement-petit" aria-hidden="true" />
      <button className="btn btn-prim action-flottante" onClick={() => setNouvelle(true)}><Icone nom="ajout" taille={20} />Marque</button>
      {fiche && <FicheMarque f={fiche} magId={mId} magNom={magNom} groupe={estDirection ? groupeDe(fiche, fournisseurs) : null} onToast={setToast} onFermer={() => setFicheId(null)} />}
      {nouvelle && <NouvelleMarque fournisseurs={fournisseurs} gardeFou onFermer={() => setNouvelle(false)}
        onCree={(id, nom) => { setNouvelle(false); setToast({ texte: `Marque « ${nom} »` }); setFicheId(id) }} />}
      {importer && <RepertoireImportModal onClose={() => setImporter(false)} onDone={() => setImporter(false)} />}
    </>
  })()

  return (
    <PageShell title="Répertoire fournisseurs" withSeason={false}
      rightExtra={<>
        <button className="btn btn-ghost seulement-grand" onClick={() => setImporter(true)}>Importer CSV</button>
        <button className="btn btn-prim seulement-grand" onClick={() => setNouvelle(true)}><Icone nom="ajout" taille={20} />Nouvelle marque</button>
      </>}>
      {contenu}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}

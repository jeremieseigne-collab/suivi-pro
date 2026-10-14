import { useState, useEffect, useMemo } from 'react'
import { db } from '../db'
import Icone from '../components/ui/Icone'
import { fmtEur } from '../components/shared'
import { lireFichierPolaris, forme, suivieParCommandes, libelleSaison } from './csvPolaris'
import { correspondances, commandesDeMarque, importerCommande, reimporterCommande, messageErreur } from './donnees'

const aujourdhuiIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// Lignes envoyées à la base : les 20 colonnes + magasin et rang dans le fichier
const pourLaBase = l => ({
  magasin_id: l.magasin_id, ordre: l.ordre, collection: l.collection, magasin_fichier: l.magasin_fichier, marque: l.marque, gencode: l.gencode,
  code_modele: l.code_modele, libelle: l.libelle, couleur: l.couleur, taille: l.taille, rayon: l.rayon, famille: l.famille, sous_famille: l.sous_famille,
  prix_achat: l.prix_achat, pvc: l.pvc, chaussant: l.chaussant, hauteur_talon: l.hauteur_talon, matiere: l.matiere,
  semelle_exterieure: l.semelle_exterieure, fermeture: l.fermeture, saison_polaris: l.saison_polaris, qte_commandee: l.qte_commandee,
})
const pluriel = (n, mot) => `${n.toLocaleString('fr-FR')} ${mot}${n > 1 ? 's' : ''}`

function Feuille({ titre, onFermer, pied, children }) {
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

// Choix du fichier + lecture (commun à l'import et au réimport)
function ChoixFichier({ onLu }) {
  const [lecture, setLecture] = useState(false)
  async function choisir(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setLecture(true)
    try { onLu(f.name, lireFichierPolaris(await f.text(), await correspondances())) }
    catch (err) { onLu(f.name, { erreur: messageErreur(err) }) }
    setLecture(false)
  }
  return (
    <label className="btn" style={{ cursor: 'pointer' }}>
      <Icone nom="ajout" taille={18} />{lecture ? 'Lecture…' : 'Choisir le fichier CSV'}
      <input type="file" accept=".csv,text/csv" onChange={choisir} style={{ display: 'none' }} data-essai="fichier-commande" />
    </label>
  )
}

function ErreurFichier({ r }) {
  return (
    <div className="encart err" style={{ marginTop: 12, flexDirection: 'column', gap: 4 }}>
      <b>Fichier refusé</b><span>{r.erreur}</span>
      {r.details?.map((d, i) => <span key={i} style={{ fontSize: 13 }}>• {d}</span>)}
    </div>
  )
}

function Refusees({ refusees }) {
  if (!refusees?.length) return null
  return (
    <details className="encart att" style={{ marginTop: 12, display: 'block' }}>
      <summary style={{ cursor: 'pointer' }}>{pluriel(refusees.length, 'ligne')} non reprise{refusees.length > 1 ? 's' : ''} (détail)</summary>
      {refusees.slice(0, 40).map(x => <div key={x.ligne} style={{ fontSize: 13 }}>Ligne {x.ligne} : {x.raison}</div>)}
      {refusees.length > 40 && <div style={{ fontSize: 13 }}>… et {refusees.length - 40} autres</div>}
    </details>
  )
}

// Saisie de plusieurs n° de BC (texte libre)
function NumerosBC({ valeurs, onChange }) {
  const [texte, setTexte] = useState('')
  const ajouter = () => { const t = texte.trim(); if (t && !valeurs.includes(t)) onChange([...valeurs, t]); setTexte('') }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="champ" value={texte} placeholder="N° du bon de commande" aria-label="N° de bon de commande"
          onChange={e => setTexte(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); ajouter() } }} />
        <button type="button" className="btn" onClick={ajouter} disabled={!texte.trim()}>Ajouter</button>
      </div>
      {valeurs.length > 0 && (
        <div className="chips" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {valeurs.map(v => <button key={v} type="button" className="chip" aria-pressed="true" onClick={() => onChange(valeurs.filter(x => x !== v))} title="Retirer">{v} <Icone nom="fermer" taille={14} /></button>)}
        </div>
      )}
    </div>
  )
}

// ─── Importer une commande (Direction) ───
export function FenetreImport({ fournisseurs, magasins, onFermer, onImportee, onReimporter }) {
  const [fichier, setFichier] = useState('')
  const [r, setR] = useState(null)
  const [fournisseurId, setFournisseurId] = useState('')
  const [bc, setBc] = useState([])
  const [dateCommande, setDateCommande] = useState(aujourdhuiIso())
  const [livraison, setLivraison] = useState('')
  const [type, setType] = useState('saison')
  const [cmdMarque, setCmdMarque] = useState({ fid: null, liste: [] })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const nomMag = id => magasins.find(m => m.id === Number(id))?.nom || `magasin ${id}`

  function lu(nom, res) {
    setFichier(nom); setR(res); setErreur(''); setBc([])   // nouveau fichier = nouvelle commande : n° de BC à ressaisir
    setType(/r[ée]assort/i.test(nom) ? 'reassort' : 'saison')
    if (res && !res.erreur) {
      const f = fournisseurs.find(x => forme(x.nom) === forme(res.marque))
      setFournisseurId(f ? String(f.id) : '__nouvelle')
    }
  }

  // Commandes déjà enregistrées pour la marque choisie (pour repérer un n° de BC déjà importé)
  const fid = Number(fournisseurId) || null
  useEffect(() => {
    if (!fid) return
    let annule = false
    commandesDeMarque(fid).then(liste => { if (!annule) setCmdMarque({ fid, liste }) }).catch(() => {})
    return () => { annule = true }
  }, [fid])
  // Une commande de cette marque, de cette saison et de ce magasin porte-t-elle déjà l'un de ces n° de BC ? → proposer le réimport
  const existantes = useMemo(() => {
    if (!r || r.erreur || !fid || cmdMarque.fid !== fid || !bc.length) return []
    const mags = Object.keys(r.parMagasin).map(Number)
    return cmdMarque.liste.filter(c => c.season === r.saison && mags.includes(c.magasin_id) && (c.numeros_bc || []).some(n => bc.includes(n)))
  }, [r, fid, cmdMarque, bc])

  const ok = r && !r.erreur
  const suivie = ok && suivieParCommandes(r.saison)
  const bloque = !ok || !suivie || !fournisseurId || r.prixDifferents?.length > 0 || existantes.length > 0 || envoi

  async function importer() {
    setEnvoi(true); setErreur('')
    try {
      let fid = Number(fournisseurId)
      if (fournisseurId === '__nouvelle') fid = await db.fournisseurs.add({ nom: r.marque, modelesBySeason: {} })
      const ids = await importerCommande({
        fournisseur_id: fid, season: r.saison, type, numeros_bc: bc,
        date_commande: dateCommande || null, livraison_prevue: livraison || null, fichier,
      }, r.lignes.map(pourLaBase))
      onImportee(ids, r.saison)
    } catch (e) { setErreur(messageErreur(e)); setEnvoi(false) }
  }

  const totaux = ok ? Object.values(r.parMagasin).reduce((a, m) => ({ paires: a.paires + m.paires, montant: a.montant + m.montant }), { paires: 0, montant: 0 }) : null
  return (
    <Feuille titre="Importer une commande" onFermer={onFermer}
      pied={<><span className="total">{ok && suivie ? <b>{pluriel(totaux.paires, 'paire')} · {fmtEur(totaux.montant)}</b> : ' '}</span>
        <button className="btn btn-prim" disabled={bloque} onClick={importer}>{envoi ? 'Import…' : 'Importer'}</button></>}>
      <p className="aide" style={{ marginTop: 0 }}>Le fichier d’import Polaris, tel quel (20 colonnes). Une commande est créée par magasin du fichier.</p>
      <ChoixFichier onLu={lu} />
      {fichier && <div className="sous-info" style={{ marginTop: 8 }}>{fichier}</div>}
      {r?.erreur && <ErreurFichier r={r} />}
      {ok && !suivie && <div className="encart err" style={{ marginTop: 12 }}>{libelleSaison(r.saison)} (collection {r.collection}) n’est pas suivie par commandes : les commandes fournisseurs commencent avec Été 2027. Les saisons d’avant restent dans Achats et le Cahier, comme aujourd’hui.</div>}
      {ok && suivie && (
        <>
          <div className="carte" style={{ marginTop: 12 }}>
            <div className="t1" style={{ fontWeight: 600 }}>{r.marque} · {libelleSaison(r.saison)} <span className="aide">(collection {r.collection})</span></div>
            {Object.entries(r.parMagasin).map(([mid, m]) => (
              <div key={mid} className="aide" style={{ marginTop: 4 }}>{nomMag(mid)} : {pluriel(m.articles, 'article')}, {pluriel(m.paires, 'paire')}, {fmtEur(m.montant)}</div>
            ))}
            {Object.keys(r.parMagasin).length > 1 && <div className="aide" style={{ marginTop: 4 }}>→ une commande par magasin, avec les mêmes n° de BC.</div>}
            {r.doublons?.length > 0 && !r.prixDifferents?.length && <div className="aide" style={{ marginTop: 4 }}>{pluriel(r.doublons.length, 'article')} présent{r.doublons.length > 1 ? 's' : ''} deux fois (deux BC) : quantités additionnées.</div>}
          </div>
          {r.prixDifferents?.length > 0 && <div className="encart err" style={{ marginTop: 12 }}>Même article avec deux prix différents : {r.prixDifferents.slice(0, 5).join(', ')}{r.prixDifferents.length > 5 ? '…' : ''}. Corrige le fichier.</div>}
          <Refusees refusees={r.refusees} />

          <label className="etiquette" style={{ marginTop: 16 }}>Marque dans Suivi Pro
            <select className="champ" value={fournisseurId} onChange={e => setFournisseurId(e.target.value)}>
              <option value="">— Choisir —</option>
              {!fournisseurs.some(x => forme(x.nom) === forme(r.marque)) && <option value="__nouvelle">Créer la marque « {r.marque} »</option>}
              {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select></label>
          <span className="etiquette" style={{ marginTop: 14 }}>N° de bon de commande <span className="aide">(un ou plusieurs ; conseillé pour retrouver la commande)</span></span>
          <NumerosBC valeurs={bc} onChange={setBc} />
          {existantes.length > 0 && (
            <div className="encart att" style={{ marginTop: 10, flexDirection: 'column', gap: 6 }}>
              <span>Une commande {libelleSaison(r.saison)} de cette marque porte déjà ce n° ({existantes.map(c => nomMag(c.magasin_id)).join(', ')}). Pour la mettre à jour, réimporte-la.</span>
              {existantes.map(c => <button key={c.id} className="btn" onClick={() => onReimporter(c)}>Réimporter la commande de {nomMag(c.magasin_id)}</button>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <label className="etiquette" style={{ flex: '1 1 160px' }}>Date de commande<input type="date" className="champ" value={dateCommande} onChange={e => setDateCommande(e.target.value)} /></label>
            <label className="etiquette" style={{ flex: '1 1 160px' }}>Livraison prévue<input type="date" className="champ" value={livraison} onChange={e => setLivraison(e.target.value)} /></label>
          </div>
          <span className="etiquette" style={{ marginTop: 14 }}>Type</span>
          <div className="segment" role="group" aria-label="Type de commande">
            <button aria-pressed={type === 'saison'} onClick={() => setType('saison')}>Commande de saison</button>
            <button aria-pressed={type === 'reassort'} onClick={() => setType('reassort')}>Réassort</button>
          </div>
        </>
      )}
      {erreur && <div className="encart err" style={{ marginTop: 12 }}>{erreur}</div>}
    </Feuille>
  )
}

// Récapitulatif d'un réimport (renvoyé par la base, en aperçu ou après validation)
function Recap({ rc }) {
  const bloc = (titre, liste, rendu) => liste?.length > 0 && (
    <div style={{ marginTop: 12 }}>
      <span className="etiquette">{titre} · {liste.length}</span>
      <div className="carte" style={{ padding: '8px 12px' }}>
        {liste.slice(0, 30).map((x, i) => <div key={i} style={{ fontSize: 14, padding: '3px 0' }}>{rendu(x)}</div>)}
        {liste.length > 30 && <div className="aide">… et {liste.length - 30} autres</div>}
      </div>
    </div>
  )
  const rien = !['ajouts', 'quantites', 'prix', 'retraits', 'sous_le_recu'].some(k => rc[k]?.length)
  return (
    <>
      {rien && <div className="encart neutre" style={{ marginTop: 12 }}>Aucun changement : le fichier correspond déjà à la commande.</div>}
      {bloc('Articles ajoutés', rc.ajouts, x => <>{x.article} : {x.qte} · {fmtEur(x.prix)}</>)}
      {bloc('Quantités modifiées', rc.quantites, x => <>{x.article} : {x.avant} → <b>{x.apres}</b>{x.raison ? <span className="aide"> ({x.raison})</span> : null}</>)}
      {bloc('Prix modifiés (pour les réceptions suivantes)', rc.prix, x => <>{x.article} : {fmtEur(x.avant)} → <b>{fmtEur(x.apres)}</b></>)}
      {bloc('Articles retirés (jamais reçus)', rc.retraits, x => <>{x.article} : {x.qte}</>)}
      {bloc('Demandé sous le déjà reçu : gardé au reçu', rc.sous_le_recu, x => <>{x.article} : fichier {x.fichier}, déjà reçu {x.recu}</>)}
    </>
  )
}

// ─── Réimporter une commande (Direction) : aperçu des changements, puis validation ───
export function FenetreReimport({ commande, marque, magasinNom, onFermer, onFait }) {
  const [fichier, setFichier] = useState('')
  const [r, setR] = useState(null)
  const [lignes, setLignes] = useState([])
  const [apercu, setApercu] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  async function lu(nom, res) {
    setFichier(nom); setR(res); setApercu(null); setErreur('')
    if (!res || res.erreur) return
    if (res.saison !== commande.season) { setErreur(`Ce fichier est de la collection ${res.collection} (${libelleSaison(res.saison)}) ; la commande est en ${libelleSaison(commande.season)}.`); return }
    if (forme(res.marque) !== forme(marque)) { setErreur(`Ce fichier est de la marque « ${res.marque} » ; la commande est de « ${marque} ».`); return }
    const lg = res.lignes.filter(l => l.magasin_id === commande.magasin_id)
    if (!lg.length) { setErreur(`Le fichier ne contient aucune ligne pour ${magasinNom}.`); return }
    setLignes(lg)
    setEnvoi(true)
    try { setApercu(await reimporterCommande(commande.id, lg.map(pourLaBase), true)) } catch (e) { setErreur(messageErreur(e)) }
    setEnvoi(false)
  }
  async function valider() {
    setEnvoi(true); setErreur('')
    try { await reimporterCommande(commande.id, lignes.map(pourLaBase), false, { fichier }); onFait() }
    catch (e) { setErreur(messageErreur(e)); setEnvoi(false) }
  }
  const autres = r && !r.erreur ? r.lignes.length - lignes.length : 0
  return (
    <Feuille titre={`Réimporter · ${marque} · ${magasinNom}`} onFermer={onFermer}
      pied={<><span className="total"> </span><button className="btn btn-prim" disabled={!apercu || envoi} onClick={valider}>{envoi && apercu ? 'Réimport…' : 'Valider le réimport'}</button></>}>
      <p className="aide" style={{ marginTop: 0 }}>Les quantités déjà reçues ne bougent jamais ; un nouveau prix s’applique aux réceptions suivantes. Rien n’est changé avant « Valider ».</p>
      <ChoixFichier onLu={lu} />
      {fichier && <div className="sous-info" style={{ marginTop: 8 }}>{fichier}{autres > 0 ? ` · ${pluriel(autres, 'ligne')} d’un autre magasin ignorée${autres > 1 ? 's' : ''}` : ''}</div>}
      {r?.erreur && <ErreurFichier r={r} />}
      {r && !r.erreur && <Refusees refusees={r.refusees} />}
      {envoi && !apercu && <div className="aide" style={{ marginTop: 12 }}>Comparaison avec la commande…</div>}
      {apercu && <Recap rc={apercu} />}
      {erreur && <div className="encart err" style={{ marginTop: 12 }}>{erreur}</div>}
    </Feuille>
  )
}

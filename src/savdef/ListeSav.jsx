import { useState, useEffect, useMemo } from 'react'
import { db } from '../db'
import { getSociete } from '../data/societes'
import { fmtTel } from '../components/shared'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { buildSavRetourMailUrl } from '../sav/mail'
import { libelleType, avecMarque, fmtDate, marquerMailSav, terminerForme, cloturerSav, DEF_TERMINES } from './regles'

const DUREE = 48 * 3600

// Minuteur de la mise à la forme (48 h). À 48 h, la paire reste sur la machine jusqu'à « Terminer » ou « Clôturer ».
function Minuteur({ enCoursAt }) {
  const calc = () => Math.floor((Date.now() - new Date(enCoursAt).getTime()) / 1000)
  const [s, setS] = useState(calc)
  useEffect(() => { const t = setInterval(() => setS(calc()), 30000); return () => clearInterval(t) })
  if (s >= DUREE) return <div className="minuteur ok"><b><Icone nom="check" taille={16} /> Prête à récupérer</b><span>48 h écoulées · encore sur la machine</span></div>
  const pc = Math.min(s / DUREE * 100, 100), niveau = pc >= 90 ? 'err' : pc >= 60 ? 'att' : ''
  return (
    <div className={`minuteur ${niveau}`}>
      <b><Icone nom="horloge" taille={16} /> {Math.floor(s / 3600)} h {String(Math.floor((s % 3600) / 60)).padStart(2, '0')}</b>
      <div className="barre"><i style={{ width: pc + '%' }} /></div>
      <span>{Math.round(pc)} % des 48 h</span>
    </div>
  )
}

const horodatage = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${p(d.getHours())}h${p(d.getMinutes())}` }

// Journal du dossier : la ligne du bas ajoute une note horodatée avec Entrée ou le bouton « Ajouter »
// (quitter le champ n'ajoute rien : le texte reste dans le champ). Toucher une ligne la modifie (la vider la supprime).
// Lecture seule sur un dossier clôturé.
function Journal({ row }) {
  const champ = row.type === 'forme' ? 'note' : 'probleme'
  const texte = row[champ] || ''
  const lignes = texte ? texte.split('\n') : []
  const clos = row.statut === 'Clôturé'
  const [edit, setEdit] = useState(null), [brouillonLigne, setBrouillonLigne] = useState(''), [nouveau, setNouveau] = useState('')
  const ecrire = v => db.sav.update(row.id, { [champ]: v }).catch(() => {})
  async function ajouter() { const t = nouveau.trim(); if (!t) return; setNouveau(''); await ecrire(texte ? `${texte}\n${horodatage()} - ${t}` : `${horodatage()} - ${t}`) }
  async function garder(i) { const t = brouillonLigne.trim(), n = [...lignes]; if (t) n[i] = t; else n.splice(i, 1); setEdit(null); await ecrire(n.join('\n')) }
  if (clos) return <div className="journal">{lignes.length ? lignes.map((l, i) => <div key={i} className="journal-ligne">{l}</div>) : <div className="journal-ligne vide-j">Aucune note</div>}</div>
  return (
    <div className="journal">
      {lignes.map((l, i) => edit === i
        ? <input key={i} className="journal-saisie" autoFocus value={brouillonLigne} onChange={e => setBrouillonLigne(e.target.value)} onBlur={() => garder(i)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); garder(i) } else if (e.key === 'Escape') setEdit(null) }} aria-label="Modifier la note" />
        : <button key={i} className="journal-ligne" onClick={() => { setEdit(i); setBrouillonLigne(l) }} title="Toucher pour modifier cette ligne">{l}</button>)}
      <div className="journal-ajout">
        <input className="journal-saisie nouvelle" value={nouveau} onChange={e => setNouveau(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ajouter() } else if (e.key === 'Escape') setNouveau('') }} placeholder="Ajouter une note…" aria-label="Ajouter une note" />
        {nouveau.trim() && <button className="btn btn-prim petit" onMouseDown={e => e.preventDefault()} onClick={ajouter}>Ajouter</button>}
      </div>
    </div>
  )
}

function CarteDossier({ row, onMail, onModifier, onSupprimer, onCloturer, onTerminer }) {
  const clos = row.statut === 'Clôturé', forme = row.type === 'forme'
  const surMachine = forme && !!row.enCoursAt && !clos
  const termine = forme && !row.enCoursAt && row.statut === 'Terminé'
  const attente = forme && !row.enCoursAt && (row.statut || '') === '' && !clos
  const article = forme ? [row.marque, row.modele, row.pointure] : [row.marqueNom, row.modele, row.pointure]
  return (
    <article className={`carte dossier${clos ? ' clos' : ''}`}>
      <div className="dossier-haut">
        <span className="dossier-etiquettes">
        <span className="type-dossier">{libelleType(row.type)}</span>
        {row.type === 'reparation' && row.facturation && <span className="type-dossier">{row.facturation === 'offert' ? 'Offerte' : row.prixReparation ? Number(row.prixReparation).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : 'Payante'}</span>}
        {!forme && row.statut && <span className={`statut-dossier${clos ? ' ok' : ''}`}>{row.statut}</span>}
        </span>
        <span className="dossier-icones">
        {avecMarque(row.type) && <button className="icone-btn petit" onClick={() => onMail(row)} aria-label="Envoyer le mail à la marque" title="Envoyer le mail à la marque"><Icone nom="mail" taille={20} /></button>}
        <button className="icone-btn petit" onClick={() => onModifier(row)} aria-label="Modifier" title="Modifier"><Icone nom="crayon" taille={20} /></button>
        <button className="icone-btn petit" onClick={() => onSupprimer(row)} aria-label="Supprimer" title="Supprimer"><Icone nom="corbeille" taille={20} /></button>
        </span>
      </div>
      <div className="dossier-corps">
        <div className="dossier-infos">
          <div className="t1">{row.clientNom || '—'}{row.clientTel && <span className="tel"> {fmtTel(row.clientTel)}</span>}</div>
          <div className="dossier-article">{article.filter(Boolean).join(' · ') || '—'}</div>
          <div className="t2">{[row.magasinNom, row.salarie, fmtDate(row.createdAt)].filter(Boolean).join(' · ')}</div>
        </div>
        <Journal row={row} />
      </div>
      {surMachine && <div className="dossier-forme"><Minuteur enCoursAt={row.enCoursAt} /><button className="btn" onClick={() => onTerminer(row)} title="Retire la paire de la machine sans clôturer le dossier"><Icone nom="check" taille={18} />Terminer</button></div>}
      {termine && !clos && <div className="dossier-forme aide">Mise à la forme terminée (paire retirée de la machine)</div>}
      {attente && <div className="dossier-forme aide att">En attente — machine occupée</div>}
      {!clos && <div className="dossier-bas"><button className="btn btn-cloturer" onClick={() => onCloturer(row)}><Icone nom="check" taille={18} />Clôturer le dossier</button></div>}
    </article>
  )
}

// Onglet SAV : recherche, filtre par type, cartes des dossiers du magasin
export default function ListeSav({ rows, magasinNom, onModifier, onToast }) {
  const [type, setType] = useState('')
  const [rech, setRech] = useState('')
  const [aSupprimer, setASupprimer] = useState(null)
  const [aRouvrir, setARouvrir] = useState(null)
  const [cloture, setCloture] = useState(null)        // { row, def } : clôture du SAV quand un défectueux est lié (U5)

  const filtres = useMemo(() => rows.filter(r => {
    if (type && r.type !== type) return false
    if (!rech) return true
    const q = rech.toLowerCase()
    return [r.clientNom, r.clientTel, r.marqueNom, r.marque, r.modele, r.pointure, r.salarie, r.probleme, r.note].map(v => (v || '').toLowerCase()).join(' ').includes(q)
  }), [rows, type, rech])
  const enCours = rows.filter(r => r.statut !== 'Clôturé' && r.statut !== 'Récupéré').length

  async function mail(row) {
    window.open(buildSavRetourMailUrl({ modele: row.modele, pointure: row.pointure, probleme: row.probleme, salarie: row.salarie, societe: getSociete(row.magasinNom), email: row.fournisseurEmail, numeroClient: row.fournisseurNumeroClient }), '_blank')
    try { await marquerMailSav(row) } catch { /* ignore */ }
  }
  async function cloturer(row, aussiDef) {
    setCloture(null)
    try {
      await cloturerSav(row)
      if (aussiDef) await db.defectueux.update(aussiDef.id, { statut: 'Clôturé' })
      onToast({ texte: aussiDef ? 'Dossier SAV et défectueux clôturés' : 'Dossier clôturé',
        annuler: row.type === 'forme' ? undefined : async () => { await db.sav.update(row.id, { statut: row.statut || '' }); if (aussiDef) await db.defectueux.update(aussiDef.id, { statut: aussiDef.statut }) } })
    } catch (e) { onToast({ texte: 'Clôture impossible : ' + (e.message || 'vérifie la connexion.') }) }
  }
  // Règle (13/10) : on ne propose de clôturer aussi le défectueux que s'il est déjà « Avoir reçu » (aucun effet sur le Plan de règlement).
  // S'il est encore « À traiter » ou « Mail envoyé », on rappelle seulement de changer son état : aucun avoir n'apparaît sans choix volontaire.
  async function demanderCloture(row) {
    if (avecMarque(row.type) && row.defectueuxId) {
      const def = await db.defectueux.get(row.defectueuxId).catch(() => null)
      if (def && !DEF_TERMINES.includes(def.statut)) { setCloture({ row, def }); return }
    }
    cloturer(row, null)
  }
  async function terminer(row) { try { await terminerForme(row); onToast({ texte: 'Paire retirée de la machine' }) } catch (e) { onToast({ texte: 'Impossible : ' + e.message }) } }
  async function supprimer() {
    const row = aSupprimer; setASupprimer(null)
    try { await db.sav.delete(row.id); onToast({ texte: 'Dossier supprimé' }) } catch (e) { onToast({ texte: 'Suppression impossible : ' + e.message }) }
  }

  return (
    <div>
      <div className="recherche"><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="Client, marque, modèle, salarié…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
      <div className="chips" style={{ marginTop: 10 }}>
        {[['', 'Tous'], ['retour', 'Retours'], ['forme', 'Forme'], ['reparation', 'Réparation']].map(([v, l]) => <button key={v} className="chip" aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>)}
      </div>
      <div className="sous-info">{magasinNom} · {rows.length} dossier{rows.length > 1 ? 's' : ''} · {enCours} en cours · {rows.filter(r => r.type === 'retour').length} retour{rows.filter(r => r.type === 'retour').length > 1 ? 's' : ''}</div>
      {!filtres.length ? <div className="vide">{rows.length ? 'Aucun dossier ne correspond.' : 'Aucun dossier SAV — touche « Nouveau dossier ».'}</div> : (
        <div className="dossiers">
          {filtres.map(r => <CarteDossier key={r.id} row={r} onMail={mail} onModifier={x => x.statut === 'Clôturé' ? setARouvrir(x) : onModifier(x)} onSupprimer={setASupprimer} onCloturer={demanderCloture} onTerminer={terminer} />)}
        </div>
      )}
      {cloture && (cloture.def.statut === 'Avoir reçu' ? (
        <Confirmation titre="Clôturer le dossier SAV" confirmer="Clôturer les deux" annuler="Annuler"
          texte={`Le défectueux lié (${cloture.row.marqueNom || 'marque'} · ${cloture.row.modele || 'modèle'}) est « Avoir reçu ». Le clôturer aussi ?`}
          secondaire={{ texte: 'Seulement le SAV', onClick: () => cloturer(cloture.row, null) }}
          onAnnuler={() => setCloture(null)} onConfirmer={() => cloturer(cloture.row, cloture.def)} />
      ) : (
        <Confirmation titre="Clôturer le dossier SAV" confirmer="Clôturer le SAV" annuler="Annuler"
          texte={`Le défectueux est encore « ${cloture.def.statut} » : pense à le passer à Avoir reçu ou Refusé.`}
          onAnnuler={() => setCloture(null)} onConfirmer={() => cloturer(cloture.row, null)} />
      ))}
      {aRouvrir && <Confirmation titre="Modifier un dossier clôturé ?" texte="Ce dossier est clôturé. Tu veux vraiment le modifier ?" confirmer="Modifier" onAnnuler={() => setARouvrir(null)} onConfirmer={() => { const r = aRouvrir; setARouvrir(null); onModifier(r) }} />}
      {aSupprimer && (
        <Confirmation danger titre="Supprimer ce dossier ?" confirmer="Supprimer" onAnnuler={() => setASupprimer(null)} onConfirmer={supprimer}
          texte={`${libelleType(aSupprimer.type)} · ${aSupprimer.clientNom || 'client'}. Cette suppression est définitive.${avecMarque(aSupprimer.type) ? ' Le défectueux et l\'entrée « Retour » liés restent (à supprimer à part si besoin).' : ''}`} />
      )}
    </div>
  )
}

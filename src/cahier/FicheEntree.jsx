import { useState } from 'react'
import { db } from '../db'
import { SIZE_TYPES } from '../data/sizes'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Numero, Statut } from './Reperes'
import { STATUTS, fmtEur, pluriel, libelleJour } from './commun'

// Fiche d'une entrée (fenêtre au centre sur ordinateur, plein écran sur téléphone) :
// statut en un toucher, pointures, pointage (Direction), modifier, supprimer.
export default function FicheEntree({ entree: e, estDirection, pointe, onPointer, onModifier, onFermer, onToast }) {
  const [erreur, setErreur] = useState('')
  const [confirmSuppr, setConfirmSuppr] = useState(false)
  const grille = SIZE_TYPES[e.typeKey]?.sizes || []
  const tailles = Object.entries(e.sizes || {}).filter(([, q]) => Number(q))
  tailles.sort(([a], [b]) => (grille.indexOf(a) + 1 || 999) - (grille.indexOf(b) + 1 || 999))

  async function changerStatut(s) {
    if (s === (e.statut || '')) return
    const avant = e.statut || ''
    try {
      await db.entrees.update(e.id, { statut: s })
      onToast({ texte: `Statut : ${s ? s.replace('Imp. Etiquettes', 'Imp. étiquettes') : 'Aucun'}`, annuler: () => db.entrees.update(e.id, { statut: avant }) })
    } catch (err) { setErreur('Changement impossible : ' + (err.message || err)) }
  }
  async function supprimer() {
    setConfirmSuppr(false)
    try { await db.entrees.delete(e.id); onToast({ texte: 'Entrée supprimée' }); onFermer() }
    catch (err) { setErreur('Suppression impossible : ' + (err.message || err)); setConfirmSuppr(false) }
  }

  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={`Entrée ${e.marque}`}>
        <div className="feuille-entete"><h2>{e.marque}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <div style={{ fontWeight: 600, fontSize: 16 }}>{e.modele || 'Sans modèle'}<Numero n={e.numero} /></div>
          <div className="resume-saisie" style={{ marginTop: 6 }}>
            <span>{libelleJour(e.date)} <b>{e.date}</b></span>
            <span><b>{pluriel(e.total || 0, 'paire')}</b></span>
            <span><b>{e.pht ? fmtEur(e.pht) : 'prix non renseigné'}</b></span>
          </div>
          <div className="resume-saisie" style={{ marginTop: 0 }}>
            <span>Catégorie <b>{e.categorie || '—'}</b></span>
            <span>Magasin <b>{e.magasin}</b></span>
            {estDirection && pointe && <span><b style={{ color: 'var(--ok)' }}>Pointée</b></span>}
          </div>

          <span className="etiquette" style={{ marginTop: 16 }}>Statut</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {STATUTS.map(s => <button key={s || 'aucun'} className="chip" aria-pressed={(e.statut || '') === s} onClick={() => changerStatut(s)}>{s ? <Statut s={s} /> : 'Aucun'}</button>)}
          </div>

          <span className="etiquette" style={{ marginTop: 16 }}>Pointures ({SIZE_TYPES[e.typeKey]?.label || e.typeKey || '—'})</span>
          {tailles.length ? (
            <div className="pointures">
              {tailles.map(([t, q]) => <div key={t} className={`pt plein${q < 0 || e.statut === 'Retour' ? ' retour' : ''}`} style={{ minHeight: 52, cursor: 'default' }}>{t}<span className="qte">{q}</span></div>)}
            </div>
          ) : <div className="vide" style={{ padding: 12 }}>Aucune pointure détaillée.</div>}

          {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {estDirection && <button className="btn" onClick={() => onPointer(!pointe)}><Icone nom="check" taille={18} />{pointe ? 'Dépointer' : 'Pointer'}</button>}
            <button className="btn" onClick={onModifier}>Modifier</button>
            <button className="btn btn-danger" onClick={() => setConfirmSuppr(true)}>Supprimer</button>
          </div>
        </div>
      </div>
      {confirmSuppr && (
        <Confirmation danger titre="Supprimer cette entrée ?"
          texte={`${e.marque} · ${e.modele || 'sans modèle'} · ${pluriel(e.total || 0, 'paire')} du ${e.date}. Cette suppression est définitive.`}
          confirmer="Supprimer" onAnnuler={() => setConfirmSuppr(false)} onConfirmer={supprimer} />
      )}
    </>
  )
}

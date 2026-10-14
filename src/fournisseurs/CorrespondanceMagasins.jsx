import { useState } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { correspondances, ajouterCorrespondance, modifierCorrespondance, supprimerCorrespondance, messageErreur } from './donnees'

// Réglages → Magasins : correspondance entre la colonne « Magasin » des fichiers de commande (Polaris) et les magasins
// de Suivi Pro (plan C, décision 3). Comparaison sans majuscules, accents, espaces ni tirets. Modifiable par la Direction.
export default function CorrespondanceMagasins({ magasins }) {
  const liste = useLiveQuery(() => correspondances(), [])
  const [valeur, setValeur] = useState('')
  const [magasinId, setMagasinId] = useState('')
  const [erreur, setErreur] = useState('')
  const essai = async f => { setErreur(''); try { await f() } catch (e) { setErreur(/duplicate|unique/i.test(e.message) ? 'Cette valeur a déjà une correspondance.' : messageErreur(e)) } }

  return (
    <div className="store-card" style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 6, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Fichiers de commande : correspondance des magasins</h3>
      <p className="aide" style={{ marginTop: 0, marginBottom: 12 }}>Valeur de la colonne « Magasin » des fichiers d’import Polaris → magasin de Suivi Pro (majuscules, accents, espaces et tirets ignorés).</p>
      {liste === undefined ? <div className="aide">Chargement…</div> : (
        <div className="liste">
          {liste.map(c => (
            <div key={c.id} className="ligne" style={{ minHeight: 52, cursor: 'default', gap: 10 }}>
              <span className="txt"><span className="t1">{c.valeur}</span></span>
              <select className="champ" style={{ width: 'auto', minWidth: 180 }} value={c.magasin_id} aria-label={`Magasin pour ${c.valeur}`}
                onChange={e => essai(() => modifierCorrespondance(c.id, Number(e.target.value)))}>
                {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <button className="btn btn-danger" onClick={() => essai(() => supprimerCorrespondance(c.id))}>Retirer</button>
            </div>
          ))}
          {!liste.length && <div className="aide" style={{ padding: 12 }}>Aucune correspondance.</div>}
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); if (valeur.trim() && magasinId) essai(async () => { await ajouterCorrespondance(valeur, Number(magasinId)); setValeur(''); setMagasinId('') }) }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <input className="champ" style={{ flex: '1 1 200px' }} value={valeur} onChange={e => setValeur(e.target.value)} placeholder="Valeur du fichier (ex. 4 Nouveau magasin)" aria-label="Valeur du fichier" />
        <select className="champ" style={{ flex: '0 1 220px' }} value={magasinId} onChange={e => setMagasinId(e.target.value)} aria-label="Magasin de Suivi Pro">
          <option value="">— Magasin —</option>{magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <button type="submit" className="btn btn-prim" disabled={!valeur.trim() || !magasinId}>Ajouter</button>
      </form>
      {erreur && <div className="encart err" style={{ marginTop: 10 }}>{erreur}</div>}
    </div>
  )
}

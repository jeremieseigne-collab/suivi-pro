import { useState } from 'react'
import Icone from '../components/ui/Icone'

// Plan chèque personnalisé d'un fournisseur × magasin × saison (dates + montants) : remplace le calcul automatique
// dans le Plan de règlement. Déplacé tel quel depuis Réglages → Modes de règlement (plan C, étape 2 bis).
export default function ChequePlanModal({ fournisseur, magasin, seasonLabel, initial, onSave, onClose }) {
  const [rows, setRows] = useState(initial.length ? initial.map(c => ({ date: c.date || '', montant: c.montant ?? '' })) : [{ date: '', montant: '' }])
  const set = (i, field, val) => { setAlerte(null); setRows(rs => rs.map((r, j) => j === i ? { ...r, [field]: val } : r)) }
  const add = () => setRows(rs => [...rs, { date: '', montant: '' }])
  const del = i => setRows(rs => rs.filter((_, j) => j !== i))
  const total = rows.reduce((s, r) => s + (Number(r.montant) || 0), 0)

  const [alerte, setAlerte] = useState(null)   // lignes incomplètes signalées avant l'enregistrement
  function save(forcer = false) {
    // Une ligne sans date (ou sans montant) n'est pas enregistrée et n'apparaît pas dans le Plan de règlement (inchangé) : on prévient d'abord
    const incompletes = rows.map((r, i) => ({ ...r, n: i + 1 })).filter(r => (r.date || r.montant !== '') && !(r.date && Number(r.montant)))
    if (incompletes.length && !forcer) { setAlerte(incompletes); return }
    const clean = rows.filter(r => r.date && Number(r.montant)).map(r => ({ date: r.date, montant: Number(r.montant) }))
    onSave(clean)
  }

  const inp = { padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', background: 'var(--surface)', color: 'var(--text)' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0, 0, 0, .32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 24, width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Plan chèque</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-3)' }}>
          {fournisseur} × {magasin} — <strong>{seasonLabel}</strong><br />
          Saisis chaque chèque (date d'encaissement + montant). Remplace le calcul automatique.
        </p>

        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-4)', width: 18 }}>{i + 1}</span>
            <input type="date" value={r.date} onChange={e => set(i, 'date', e.target.value)} style={{ ...inp, flex: 1 }} />
            <input type="number" min="0" step="0.01" placeholder="montant" value={r.montant} onChange={e => set(i, 'montant', e.target.value)} style={{ ...inp, width: 110 }} />
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>€</span>
            <button onClick={() => del(i)} title="Supprimer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 15 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'} aria-label="Supprimer ce chèque"><Icone nom="corbeille" taille={18} /></button>
          </div>
        ))}

        <button onClick={add} style={{ marginTop: 2, padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--surface)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ＋ Ajouter un chèque
        </button>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-2)' }}>
          Total : <strong>{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</strong>
        </div>

        {alerte && (
          <div className="encart att" style={{ display: 'block', marginTop: 14 }}>
            {alerte.map(r => <div key={r.n}>Chèque n° {r.n} : {r.date ? 'pas de montant' : 'pas de date'} — ce chèque n'apparaîtra pas dans le Plan de règlement.</div>)}
            <div style={{ marginTop: 8 }}>Complète {alerte.length > 1 ? 'ces lignes' : 'cette ligne'}, ou enregistre sans {alerte.length > 1 ? 'elles' : 'elle'}.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => setAlerte(null)}>Corriger</button>
              <button className="btn" onClick={() => save(true)}>Enregistrer sans {alerte.length > 1 ? 'ces chèques' : 'ce chèque'}</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
          <button onClick={() => save()} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { SalarieInput } from '../defectueux/DefectueuxModal'
import { ETAPES_ACTIVES, ETAPE_ICONS, CELL, etatPointure } from './constants'

// Création / modification d'un réassort pour un top modèle
export default function ReassortModal({ top, reassort, proposition = {}, enCommande = {}, salaries = [], onClose }) {
  const editing = !!reassort?.id
  const { season } = useSeason()
  const init = editing ? reassort.sizes : proposition
  const [qtes,   setQtes]   = useState(() => Object.fromEntries((top.pointures || []).map(s => [s, init?.[s] ? String(init[s]) : ''])))
  const [statut, setStatut] = useState(reassort?.statut ?? 'À réassortir')
  const [par,    setPar]    = useState(reassort?.par ?? '')
  const [note,   setNote]   = useState(reassort?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const total = Object.values(qtes).reduce((s, v) => s + (parseInt(v) || 0), 0)

  async function handleSave() {
    if (!total) { setError('Saisis au moins une quantité'); return }
    setSaving(true); setError('')
    try {
      const sizes = {}
      Object.entries(qtes).forEach(([s, v]) => { const q = parseInt(v) || 0; if (q > 0) sizes[s] = q })
      const now = new Date().toISOString()
      if (editing) {
        const etapes = { ...(reassort.etapes || {}) }
        if (!etapes[statut]) etapes[statut] = now
        await db.reassorts.update(reassort.id, { sizes, statut, par, note, etapes })
      } else {
        await db.reassorts.add({
          topId: top.id, magasinId: top.magasinId, fournisseurId: top.fournisseurId, modele: top.modele,
          season: top.season || season, statut, sizes, recu: {}, receptions: [], par, note,
          etapes: { [statut]: now },
        })
      }
      onClose?.()
    } catch (e) {
      setError('Erreur : ' + (e.message || e)); setSaving(false)
    }
  }

  async function handleDelete() {
    try { await db.reassorts.delete(reassort.id); onClose?.() } catch (e) { setError('Erreur : ' + (e.message || e)) }
  }

  // Les quantités déjà en commande ne comptent pas ce réassort-ci (en édition)
  const autres = { ...enCommande }
  if (editing) Object.entries(reassort.sizes || {}).forEach(([s, q]) => { autres[s] = Math.max(0, (autres[s] || 0) - (q - (reassort.recu?.[s] || 0))) })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>🔄 {editing ? 'Modifier le réassort' : 'Nouveau réassort'} — {top.modele}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!editing && Object.keys(proposition).length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', background: 'var(--accent-bg)', padding: '8px 12px', borderRadius: 8 }}>
              💡 Quantités proposées d'après le stock saisi (stock mini {top.cible || 1} par pointure). Ajuste si besoin.
            </div>
          )}

          <div className="form-field">
            <label>Quantités à réassortir</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(top.pointures || []).map(s => {
                const c = CELL[etatPointure(top, s, autres)]
                const st = top.stock?.[s]
                return (
                  <div key={s} style={{ width: 64, borderRadius: 8, overflow: 'hidden', textAlign: 'center', border: `1px solid ${c.border}` }}>
                    <div style={{ padding: '3px 0', fontSize: 12, fontWeight: 700, background: c.bg, color: c.text }}>{s}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)', padding: '2px 0' }}>
                      stock {st ?? '?'}{autres[s] ? ` · +${autres[s]}` : ''}
                    </div>
                    <input type="number" min="0" inputMode="numeric" value={qtes[s] ?? ''} placeholder="0"
                      onChange={e => setQtes(q => ({ ...q, [s]: e.target.value }))}
                      style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 15, fontWeight: 700, padding: '5px 0', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>Total : <strong style={{ color: 'var(--text)' }}>{total}</strong> paire{total > 1 ? 's' : ''}</div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Étape</label>
              <select value={statut} onChange={e => setStatut(e.target.value)}>
                {ETAPES_ACTIVES.map(s => <option key={s} value={s}>{ETAPE_ICONS[s]} {s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Demandé par</label>
              <SalarieInput value={par} onChange={setPar} salaries={salaries} />
            </div>
          </div>

          <div className="form-field">
            <label>Note</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex. urgent, client en attente sur le 39…" />
          </div>

          {error && <div className="form-error">⚠️ {error}</div>}

          <div className="modal-actions">
            {editing && (confirmDel ? (
              <button className="btn-secondary" style={{ marginRight: 'auto', color: '#dc2626', borderColor: '#fca5a5' }} onClick={handleDelete}>Confirmer la suppression</button>
            ) : (
              <button className="btn-secondary" style={{ marginRight: 'auto' }} onClick={() => setConfirmDel(true)}>🗑 Annuler ce réassort</button>
            ))}
            <button className="btn-secondary" onClick={onClose}>Fermer</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

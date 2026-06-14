import { useState } from 'react'
import { db } from '../db'
import { SOCIETES, HOUR_SECTIONS, RANGE_SECTIONS } from './constants'

const inputStyle = {
  padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text)',
}

function SectionCard({ icon, title, children }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{icon} {title}</div>
      {children}
    </div>
  )
}

function AddBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ marginTop: 4, padding: '6px 12px', borderRadius: 8, border: '1px dashed var(--border)',
        background: 'var(--surface)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
      ＋ Ajouter
    </button>
  )
}

function DelBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} title="Supprimer cette ligne"
      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#cbd5e1', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
      onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>🗑</button>
  )
}

export default function PaieForm({ salarie, periode, existing, onSaved, onCancel }) {
  const init = existing?.data || {}
  const [societe, setSociete] = useState(existing?.societe || '')
  const [data, setData] = useState({
    heuresSupp: init.heuresSupp || [],
    dimanche:   init.dimanche   || [],
    feries:     init.feries     || [],
    conges:     init.conges     || [],
    maladie:    init.maladie    || [],
    commentaire: init.commentaire || '',
  })
  const [saving, setSaving] = useState(false)

  const addRow = (key, blank) => setData(d => ({ ...d, [key]: [...d[key], blank] }))
  const setRow = (key, i, field, val) => setData(d => ({ ...d, [key]: d[key].map((r, j) => j === i ? { ...r, [field]: val } : r) }))
  const delRow = (key, i) => setData(d => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))

  async function save() {
    if (!societe) { alert('Merci de choisir ta société.'); return }
    setSaving(true)
    try {
      const clean = {
        heuresSupp: data.heuresSupp.filter(r => r.date || r.heures),
        dimanche:   data.dimanche.filter(r => r.date || r.heures),
        feries:     data.feries.filter(r => r.date || r.heures),
        conges:     data.conges.filter(r => r.du || r.au),
        maladie:    data.maladie.filter(r => r.du || r.au),
        commentaire: (data.commentaire || '').trim(),
      }
      if (existing?.id) await db.paieVariables.update(existing.id, { societe, data: clean })
      else              await db.paieVariables.add({ periode, salarie, societe, data: clean })
      onSaved()
    } catch (e) {
      alert('Erreur lors de l’enregistrement : ' + (e.message || e))
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <button onClick={onCancel}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16, color: 'var(--text-2)' }}>←</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{salarie}</h2>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-3)' }}>
        Document confidentiel — il disparaît de l’écran dès que tu valides.
      </p>

      {/* Société */}
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Société *</label>
        <select value={societe} onChange={e => setSociete(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
          <option value="">— Choisir —</option>
          {SOCIETES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Sections heures (date + heures) */}
      {HOUR_SECTIONS.map(s => (
        <SectionCard key={s.key} icon={s.icon} title={s.label}>
          {data[s.key].length === 0 && <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-4)' }}>Aucune ligne.</p>}
          {data[s.key].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="date" value={row.date || ''} onChange={e => setRow(s.key, i, 'date', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input type="number" min="0" step="0.5" placeholder="heures" value={row.heures || ''} onChange={e => setRow(s.key, i, 'heures', e.target.value)} style={{ ...inputStyle, width: 100 }} />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>h</span>
              <DelBtn onClick={() => delRow(s.key, i)} />
            </div>
          ))}
          <AddBtn onClick={() => addRow(s.key, { date: '', heures: '' })} />
        </SectionCard>
      ))}

      {/* Sections période (du / au) */}
      {RANGE_SECTIONS.map(s => (
        <SectionCard key={s.key} icon={s.icon} title={s.label}>
          {data[s.key].length === 0 && <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-4)' }}>Aucune ligne.</p>}
          {data[s.key].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>du</span>
              <input type="date" value={row.du || ''} onChange={e => setRow(s.key, i, 'du', e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>au</span>
              <input type="date" value={row.au || ''} onChange={e => setRow(s.key, i, 'au', e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
              <DelBtn onClick={() => delRow(s.key, i)} />
            </div>
          ))}
          <AddBtn onClick={() => addRow(s.key, { du: '', au: '' })} />
        </SectionCard>
      ))}

      {/* Commentaire */}
      <SectionCard icon="📝" title="Commentaire libre">
        <textarea value={data.commentaire} onChange={e => setData(d => ({ ...d, commentaire: e.target.value }))}
          rows={3} placeholder="Toute information utile pour la paie…"
          style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
      </SectionCard>

      {/* Enregistrer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <button onClick={onCancel} disabled={saving}
          style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 15 }}>
          Annuler
        </button>
        <button onClick={save} disabled={saving}
          style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
          {saving ? 'Enregistrement…' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  )
}

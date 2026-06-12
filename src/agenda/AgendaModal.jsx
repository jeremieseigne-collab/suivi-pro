import { useState } from 'react'
import { db } from '../db'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function AgendaModal({ event, defaultDate, onClose, onSaved }) {
  const editing = !!event?.id
  const [form, setForm] = useState({
    titre: event?.titre || '',
    date:  event?.date  || defaultDate || todayStr(),
    heure: event?.heure || '',
    note:  event?.note  || '',
  })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleDelete() {
    setSaving(true)
    try { await db.evenements.delete(event.id); onSaved() }
    catch (e) { setError(e.message || 'Erreur à la suppression.'); setSaving(false) }
  }

  async function handleSave() {
    if (!form.titre.trim()) { setError('Donne un titre à l’événement.'); return }
    if (!form.date)         { setError('Choisis une date.'); return }
    setSaving(true); setError('')
    try {
      if (editing) await db.evenements.update(event.id, form)
      else         await db.evenements.add(form)
      onSaved()
    } catch (e) {
      setError(e.message || "Erreur à l'enregistrement.")
      setSaving(false)
    }
  }

  const textareaStyle = {
    padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', width: '100%',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? "Modifier l'événement" : 'Nouvel événement'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label>Titre *</label>
            <input value={form.titre} onChange={e => set('titre', e.target.value)} autoFocus placeholder="ex: RDV client Dupont" />
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Heure</label>
              <input type="time" value={form.heure} onChange={e => set('heure', e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3} style={textareaStyle} />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions" style={{ justifyContent: editing ? 'space-between' : 'flex-end' }}>
            {editing && (
              confirmDel ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#dc2626' }}>Supprimer ?</span>
                  <button onClick={handleDelete} disabled={saving}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Oui</button>
                  <button onClick={() => setConfirmDel(false)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Non</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>🗑 Supprimer</button>
              )
            )}
            <span style={{ display: 'inline-flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳…' : (editing ? 'Enregistrer' : "Créer l'événement")}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

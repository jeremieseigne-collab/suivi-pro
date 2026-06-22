import { useState } from 'react'
import { db } from '../db'
import { PROVENANCES, STATUTS } from './constants'
import { fmtTel } from '../components/shared'

const todayStr = () => new Date().toISOString().slice(0, 10)

function SalarieInput({ value, onChange, salaries }) {
  const [manual, setManual] = useState(false)
  const btnStyle = { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text-3)', fontSize: 14, fontFamily: 'inherit' }
  if (manual) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Nom et prenom" autoFocus
        style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--surface)', color: 'var(--text)' }} />
      <button type="button" onClick={() => { onChange(''); setManual(false) }} style={btnStyle}>x</button>
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">Choisir</option>
        {salaries.map(s => <option key={s}>{s}</option>)}
      </select>
      <button type="button" onClick={() => setManual(true)} title="Saisir manuellement"
        style={{ ...btnStyle, fontWeight: 700, fontSize: 18, lineHeight: 1, padding: '4px 11px' }}>+</button>
    </div>
  )
}

export default function CommandeModal({ commande, defaultMagasin, salaries = [], onClose, onSaved }) {
  const editing = !!commande?.id
  const [form, setForm] = useState({
    magasin:      commande?.magasin      || defaultMagasin || '',
    date:         commande?.date         || todayStr(),
    salarie:      commande?.salarie      || '',
    provenance:   commande?.provenance   || '',
    marque:       commande?.marque       || '',
    modele:       commande?.modele       || '',
    reference:    commande?.reference    || '',
    pointure:     commande?.pointure     || '',
    clientNom:    commande?.clientNom    || '',
    clientPrenom: commande?.clientPrenom || '',
    telephone:    fmtTel(commande?.telephone || ''),
    note:         commande?.note         || '',
    statut:       commande?.statut       || 'À commander',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.salarie) { setError('Indique qui passe la commande.'); return }
    setSaving(true); setError('')
    try {
      if (editing) await db.commandes.update(commande.id, form)
      else         await db.commandes.add(form)
      onSaved()
    } catch (e) {
      setError(e.message || "Erreur à l'enregistrement.")
      setSaving(false)
    }
  }

  const textareaStyle = {
    padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', width: '100%',
    background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editing ? 'Modifier la commande' : 'Nouvelle commande'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Salari&eacute; *</label>
              <SalarieInput value={form.salarie} onChange={v => set('salarie', v)} salaries={salaries} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Provenance</label>
              <select value={form.provenance} onChange={e => set('provenance', e.target.value)}>
                <option value="">— Choisir —</option>
                {PROVENANCES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>État</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Marque</label>
              <input value={form.marque} onChange={e => set('marque', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Modèle</label>
              <input value={form.modele} onChange={e => set('modele', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Référence N°</label>
              <input value={form.reference} onChange={e => set('reference', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Pointure</label>
              <input value={form.pointure} onChange={e => set('pointure', e.target.value)} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Nom client</label>
              <input value={form.clientNom} onChange={e => set('clientNom', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Prénom client</label>
              <input value={form.clientPrenom} onChange={e => set('clientPrenom', e.target.value)} />
            </div>
            <div className="form-field">
              <label>Téléphone portable</label>
              <input value={form.telephone} onChange={e => set('telephone', fmtTel(e.target.value))} inputMode="tel" />
            </div>
          </div>

          <div className="form-field">
            <label>Note</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3} style={textareaStyle} />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : (editing ? 'Enregistrer' : 'Créer la commande')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

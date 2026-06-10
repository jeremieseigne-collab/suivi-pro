import { useState, useEffect } from 'react'
import { useParams } from '../hooks/useParams'
import { db } from '../db'

const STRATEGIES      = ['🚀 BOOSTER', '🛡️ MAINTENIR', '📉 RÉDUIRE', '🛑 ARRÊTER']
const STATUTS         = ['', '✅', '⏳', '❌']
const MODES_REGLEMENT = ['', 'PRELEVEMENT', 'CHEQUE', 'GARANT', 'VIREMENT', 'GMS', 'LCR']

const STRAT_COLORS = {
  '🚀 BOOSTER':   '#dbeafe',
  '🛡️ MAINTENIR': '#d1fae5',
  '📉 RÉDUIRE':   '#fef3c7',
  '🛑 ARRÊTER':   '#fee2e2',
}

export default function AchatEditModal({ row, onClose, onSaved }) {
  const { params } = useParams()

  const [form, setForm] = useState({
    statut:      row.statut      || '',
    magasin:     row.magasin     || '',
    fournisseur: row.fournisseur || '',
    recuN1:      row.recuN1      || '',
    objectifN:   row.objectifN   || '',
    reel:        row.reelN       || '',
    quantite:    row.quantite    || '',
    strategie:   row.strategie   || '',
    moderegl:    row.modeReglement || '',
  })
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  // Auto-remplir le mode quand fournisseur+magasin change
  useEffect(() => {
    if (!params?.modeByKey || !form.fournisseur || !form.magasin) return
    const found = params.modeByKey[form.fournisseur + form.magasin]
    if (found?.mode) setForm(f => ({ ...f, moderegl: found.mode }))
  }, [form.fournisseur, form.magasin, params])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  const pm = form.reel && form.quantite && Number(form.quantite) > 0
    ? Math.round((Number(form.reel) / Number(form.quantite)) * 100) / 100
    : null

  async function handleDelete() {
    setSaving(true)
    try {
      await db.parametres.delete(row.id)
      onSaved?.()
      onClose?.()
    } catch (err) {
      setError('Erreur suppression : ' + err.message)
      setConfirmDelete(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.magasin)     { setError('Magasin obligatoire');     return }
    if (!form.fournisseur) { setError('Fournisseur obligatoire'); return }

    setSaving(true)
    setError('')
    try {
      const magasinRow     = await db.magasins.where('nom').equals(form.magasin).first()
      const fournisseurRow = await db.fournisseurs.where('nom').equals(form.fournisseur).first()
      if (!magasinRow)     { setError('Magasin introuvable');     return }
      if (!fournisseurRow) { setError('Fournisseur introuvable'); return }

      await db.parametres.update(row.id, {
        statut:        form.statut,
        magasinId:     magasinRow.id,
        fournisseurId: fournisseurRow.id,
        recuN1:        Number(form.recuN1)    || 0,
        objectifN:     Number(form.objectifN) || 0,
        reelN:         Number(form.reel)      || 0,
        quantite:      Number(form.quantite)  || 0,
        pm:            pm ?? 0,
        strategie:     form.strategie,
      })

      // Mode de règlement = global (sans season)
      const existingMode = await db.modesReglement
        .filter(m => m.fournisseurId === fournisseurRow.id && m.magasinId === magasinRow.id)
        .first()
      if (existingMode) {
        await db.modesReglement.update(existingMode.id, { modeReglement: form.moderegl })
      } else if (form.moderegl) {
        await db.modesReglement.add({ fournisseurId: fournisseurRow.id, magasinId: magasinRow.id, modeReglement: form.moderegl })
      }

      setSaved(true)
      setTimeout(() => { onSaved?.(); onClose?.() }, 1500)
    } catch (err) {
      setError('Erreur : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>🛒 Modifier achat</h2>
          <button type="button" onClick={() => setConfirmDelete(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, marginLeft: 'auto', marginRight: 8, color: '#ef4444' }}>
            🗑️
          </button>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {confirmDelete && (
          <div style={{ margin: '0 24px 16px', padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10 }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#dc2626' }}>
              ⚠️ Supprimer <em>"{row.fournisseur}"</em> de vos achats ?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={handleDelete} disabled={saving}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? '⏳…' : '🗑️ Oui, supprimer'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {saved ? (
          <div className="modal-success">
            <div style={{ fontSize: 40 }}>✅</div>
            <p>Modifications enregistrées !</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body">
            <div className="form-grid">
              <div className="form-field">
                <label>Statut</label>
                <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                  {STATUTS.map(s => <option key={s} value={s}>{s || '— Choisir —'}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Magasin *</label>
                <select value={form.magasin} onChange={e => set('magasin', e.target.value)} required>
                  <option value="">— Choisir —</option>
                  {(params?.magasins ?? []).map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Fournisseur *</label>
              <input list="edit-fournisseurs-list" value={form.fournisseur}
                onChange={e => set('fournisseur', e.target.value)}
                placeholder="Fournisseur…" required />
              <datalist id="edit-fournisseurs-list">
                {(params?.fournisseurs ?? []).map(f => <option key={f} value={f} />)}
              </datalist>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Reçu N-1 (€)</label>
                <input type="number" step="0.01" min="0" value={form.recuN1}
                  onChange={e => set('recuN1', e.target.value)} placeholder="0" />
              </div>
              <div className="form-field">
                <label>Objectif N (€)</label>
                <input type="number" step="0.01" min="0" value={form.objectifN}
                  onChange={e => set('objectifN', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Réel achat N (€)</label>
                <input type="number" step="0.01" min="0" value={form.reel}
                  onChange={e => set('reel', e.target.value)} placeholder="0" />
              </div>
              <div className="form-field">
                <label>Quantité</label>
                <input type="number" min="0" value={form.quantite}
                  onChange={e => set('quantite', e.target.value)} placeholder="0" />
              </div>
              <div className="form-field">
                <label>PM calculé</label>
                <div className="form-total" style={{ fontSize: 14 }}>
                  {pm != null
                    ? pm.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
                    : '—'}
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Mode de règlement</label>
                <select value={form.moderegl} onChange={e => set('moderegl', e.target.value)}>
                  {MODES_REGLEMENT.map(m => <option key={m} value={m}>{m || '— Choisir —'}</option>)}
                </select>
              </div>
              <div className="form-field" style={{ flex: 2 }}>
                <label>Stratégie</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {STRATEGIES.map(s => (
                    <button type="button" key={s}
                      onClick={() => set('strategie', form.strategie === s ? '' : s)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '2px solid', borderColor: form.strategie === s ? '#334155' : 'transparent', background: STRAT_COLORS[s] || '#f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="form-error">⚠️ {error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

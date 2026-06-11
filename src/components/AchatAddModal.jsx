import { useState, useEffect } from 'react'
import { useParams } from '../hooks/useParams'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'

const STRATEGIES      = ['🚀 BOOSTER', '🛡️ MAINTENIR', '📉 RÉDUIRE', '🛑 ARRÊTER']
const STATUTS         = ['', '✅', '⏳', '❌']
const MODES_REGLEMENT = ['', 'PRELEVEMENT', 'CHEQUE', 'GARANT', 'VIREMENT', 'GMS', 'LCR']

const STRAT_COLORS = {
  '🚀 BOOSTER':   '#dbeafe',
  '🛡️ MAINTENIR': '#d1fae5',
  '📉 RÉDUIRE':   '#fef3c7',
  '🛑 ARRÊTER':   '#fee2e2',
}

const INITIAL = {
  statut: '', magasin: '', fournisseur: '',
  recuN1: '', objectifN: '', reel: '', quantite: '',
  strategie: '', moderegl: '',
}

export default function AchatAddModal({ onClose, onSaved }) {
  const { season } = useSeason()
  const { params } = useParams()
  const [form,   setForm]   = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  // Auto-remplir le mode de règlement quand fournisseur+magasin change
  useEffect(() => {
    if (!params?.modeByKey || !form.fournisseur || !form.magasin) return
    const found = params.modeByKey[form.fournisseur + form.magasin]
    if (found?.mode) setForm(f => ({ ...f, moderegl: found.mode }))
  }, [form.fournisseur, form.magasin, params])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  function navAchat(e) {
    const idx = parseInt(e.currentTarget.dataset.achatIndex)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      document.querySelector(`[data-achat-index="${idx + 1}"]`)?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      document.querySelector(`[data-achat-index="${idx - 1}"]`)?.focus()
    }
  }

  const isNewFournisseur = form.fournisseur && !(params?.fournisseurs ?? []).includes(form.fournisseur)

  const pm = form.reel && form.quantite && Number(form.quantite) > 0
    ? Math.round((Number(form.reel) / Number(form.quantite)) * 100) / 100
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.magasin)     { setError('Magasin obligatoire');     return }
    if (!form.fournisseur) { setError('Fournisseur obligatoire'); return }

    setSaving(true)
    setError('')
    try {
      // Résoudre les IDs
      let magasinRow = await db.magasins.where('nom').equals(form.magasin).first()
      if (!magasinRow) { setError('Magasin introuvable'); return }

      let fournisseurRow = await db.fournisseurs.where('nom').equals(form.fournisseur).first()
      // Créer le fournisseur si nouveau
      if (!fournisseurRow && isNewFournisseur) {
        const id = await db.fournisseurs.add({ nom: form.fournisseur, modelesBySeason: {} })
        fournisseurRow = { id, nom: form.fournisseur }
      }
      if (!fournisseurRow) { setError('Fournisseur introuvable'); return }

      // Vérifier doublon fournisseur × magasin pour cette saison
      const existing = await db.parametres
        .where({ fournisseurId: fournisseurRow.id, magasinId: magasinRow.id })
        .filter(p => p.season === season)
        .first()

      if (existing) {
        setError(`${form.fournisseur} × ${form.magasin} existe déjà. Utilisez le bouton ✏️ pour le modifier.`)
        return
      }

      await db.parametres.add({
        statut:        form.statut,
        fournisseurId: fournisseurRow.id,
        magasinId:     magasinRow.id,
        recuN1:        Number(form.recuN1)    || 0,
        objectifN:     Number(form.objectifN) || 0,
        reelN:         Number(form.reel)      || 0,
        quantite:      Number(form.quantite)  || 0,
        pm:            pm ?? 0,
        strategie:     form.strategie,
        season,
      })

      // Mode de règlement = global (sans season)
      if (form.moderegl) {
        const existingMode = await db.modesReglement
          .filter(m => m.fournisseurId === fournisseurRow.id && m.magasinId === magasinRow.id)
          .first()
        if (existingMode) {
          await db.modesReglement.update(existingMode.id, { modeReglement: form.moderegl })
        } else {
          await db.modesReglement.add({ fournisseurId: fournisseurRow.id, magasinId: magasinRow.id, modeReglement: form.moderegl })
        }
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
          <h2>🛒 Nouveau fournisseur</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {saved ? (
          <div className="modal-success">
            <div style={{ fontSize: 40 }}>✅</div>
            <p>Ligne ajoutée{isNewFournisseur ? ' et fournisseur créé' : ''} !</p>
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
              <input list="fournisseurs-list" value={form.fournisseur}
                onChange={e => set('fournisseur', e.target.value)}
                placeholder="Choisir ou saisir un nouveau…" required />
              <datalist id="fournisseurs-list">
                {(params?.fournisseurs ?? []).map(f => <option key={f} value={f} />)}
              </datalist>
              {isNewFournisseur && (
                <div style={{ marginTop: 5, fontSize: 12, color: '#059669', fontWeight: 500 }}>
                  ✅ Nouveau fournisseur — sera créé automatiquement
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Reçu N-1 (€)</label>
                <input type="number" step="0.01" min="0" value={form.recuN1}
                  onChange={e => set('recuN1', e.target.value)} placeholder="0"
                  data-achat-index="0" onKeyDown={navAchat} />
              </div>
              <div className="form-field">
                <label>Objectif N (€)</label>
                <input type="number" step="0.01" min="0" value={form.objectifN}
                  onChange={e => set('objectifN', e.target.value)} placeholder="0"
                  data-achat-index="1" onKeyDown={navAchat} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Réel achat N (€)</label>
                <input type="number" step="0.01" min="0" value={form.reel}
                  onChange={e => set('reel', e.target.value)} placeholder="0"
                  data-achat-index="2" onKeyDown={navAchat} />
              </div>
              <div className="form-field">
                <label>Quantité</label>
                <input type="number" min="0" value={form.quantite}
                  onChange={e => set('quantite', e.target.value)} placeholder="0"
                  data-achat-index="3" onKeyDown={navAchat} />
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

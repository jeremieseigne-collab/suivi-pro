import { useState, useEffect, useMemo } from 'react'
import { useParams } from '../hooks/useParams'
import { SIZE_TYPES, DEFAULT_GRID_BY_MARQUE } from '../data/sizes'
import { db } from '../db'
import { getClipboard, setClipboard } from '../data/clipboard'
import ComboBox from './ComboBox'
import { useSeason } from '../context/SeasonContext'

const STATUTS    = ['', 'Imp. Etiquettes', 'Enregistré', 'Retour']
const CATEGORIES = ['', 'Acc', 'Femme', 'Homme', 'Enfant', 'Bébé']
const CAT_TO_KEY = { 'Femme': 'F', 'Homme': 'H', 'Enfant': 'E', 'Bébé': 'B', 'Acc': 'ACC' }

function toFrDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function toIsoDate(fr) {
  if (!fr) return ''
  const [d, m, y] = fr.split('/')
  if (!y || y.length < 4) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}
function numeroColor(n) {
  const num = parseInt(n)
  if (!num) return {}
  const mod = ((num - 1) % 3)
  if (mod === 0) return { background: '#fee2e2', color: '#dc2626' }
  if (mod === 1) return { background: '#dbeafe', color: '#2563eb' }
  return { background: '#d1fae5', color: '#059669' }
}

// Extrait un tableau de quantités depuis l'objet sizes stocké en DB
function extractQuantities(sizes, typeKey) {
  const type = SIZE_TYPES[typeKey] ?? {}
  return (type.sizes ?? []).map(s => String(sizes?.[s] || ''))
}

export default function EntreeEditModal({ entry, onClose, onSaved }) {
  const { season } = useSeason()
  const { params } = useParams()

  const [form, setForm] = useState({
    statut:    entry.statut    || '',
    magasin:   entry.magasin   || '',
    date:      entry.date      || '',
    dateIso:   toIsoDate(entry.date || ''),
    marque:    entry.marque    || '',
    modele:    entry.modele    || '',
    numero:    entry.numero    || '',
    categorie: entry.categorie || '',
    typeKey:   entry.typeKey   || 'F',
    pht:       entry.pht       || '',
  })
  const [quantities, setQuantities] = useState(() => extractQuantities(entry.sizes, entry.typeKey || 'F'))
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [paramRow, setParamRow] = useState(null)

  const type  = SIZE_TYPES[form.typeKey]
  const total = quantities.reduce((s, v) => s + (parseInt(v) || 0), 0)
  const modelesSuggestions = params?.modelesByMarque?.[form.marque] ?? []

  // Quand on change de type de grille, recharger depuis entry.sizes
  useEffect(() => {
    setQuantities(extractQuantities(entry.sizes, form.typeKey))
  }, [form.typeKey, entry.sizes])

  // Ligne Achats (paramètres) pour magasin × marque × saison : quantités/prix par modèle (+ PM de secours)
  useEffect(() => {
    if (!form.magasin || !form.marque) { setParamRow(null); return }
    let cancelled = false
    ;(async () => {
      const mag  = await db.magasins.where('nom').equals(form.magasin).first()
      const four = await db.fournisseurs.where('nom').equals(form.marque).first()
      if (!mag || !four || cancelled) return
      const param = await db.parametres.where('fournisseurId').equals(four.id).and(p => p.magasinId === mag.id && p.season === season).first()
      if (!cancelled) setParamRow(param || null)
    })()
    return () => { cancelled = true }
  }, [form.magasin, form.marque, season])

  // Prix unitaire HT = prix HT total du modèle (paramètres) ÷ quantité commandée.
  // Plus de repli sur le prix moyen de la marque : 0 si le modèle n'a pas de prix renseigné.
  const unitPrice = useMemo(() => {
    if (!paramRow) return 0
    const q  = paramRow.modeles?.[form.modele]
    const px = paramRow.prixModeles?.[form.modele]
    if (q > 0 && px > 0) return px / q
    return 0
  }, [paramRow, form.modele])

  // PHT livré = prix unitaire × quantité reçue (toujours auto, non modifiable)
  useEffect(() => {
    setForm(f => ({ ...f, pht: (unitPrice > 0 && total > 0) ? Math.round(unitPrice * total * 100) / 100 : '' }))
  }, [unitPrice, total])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }
  function setQty(i, val)  { setQuantities(q => { const n = [...q]; n[i] = val; return n }) }

  function handleCopy() {
    setClipboard({ typeKey: form.typeKey, quantities: [...quantities] })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePaste() {
    const cb = getClipboard()
    if (!cb) return
    if (cb.typeKey !== form.typeKey) {
      set('typeKey', cb.typeKey)
      setTimeout(() => setQuantities([...cb.quantities]), 50)
    } else {
      setQuantities([...cb.quantities])
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await db.entrees.delete(entry.id)
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
    if (!form.magasin) { setError('Magasin obligatoire'); return }
    if (!form.marque)  { setError('Marque obligatoire');  return }
    if (total === 0)   { setError('Aucune quantité saisie'); return }

    setSaving(true)
    setError('')
    try {
      const magasinRow     = await db.magasins.where('nom').equals(form.magasin).first()
      const fournisseurRow = await db.fournisseurs.where('nom').equals(form.marque).first()
      if (!magasinRow)     { setError('Magasin introuvable');  return }
      if (!fournisseurRow) { setError('Marque introuvable');   return }

      const sizes = {}
      ;(type?.sizes ?? []).forEach((size, i) => {
        const v = parseInt(quantities[i]) || 0
        if (v > 0) sizes[size] = v
      })

      await db.entrees.update(entry.id, {
        statut:        form.statut,
        magasinId:     magasinRow.id,
        fournisseurId: fournisseurRow.id,
        date:          form.date,
        modele:        form.modele,
        numero:        form.numero,
        categorie:     form.categorie,
        typeKey:       form.typeKey,
        total,
        pht:           Number(form.pht) || 0,
        sizes,
      })

      setSaved(true)
      setTimeout(() => { onSaved?.(); onClose?.() }, 1500)
    } catch (err) {
      setError('Erreur : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const cb = getClipboard()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Modifier l'entrée</h2>
          <button type="button" onClick={() => setConfirmDelete(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, marginLeft: 'auto', marginRight: 8, color: '#ef4444' }}>
            🗑️
          </button>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {confirmDelete && (
          <div style={{ margin: '0 24px 16px', padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10 }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#dc2626' }}>⚠️ Supprimer cette entrée ?</p>
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
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={form.dateIso}
                  onChange={e => setForm(f => ({ ...f, dateIso: e.target.value, date: toFrDate(e.target.value) }))} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Marque *</label>
                <select value={form.marque} onChange={e => {
                  const v = e.target.value
                  const grid = DEFAULT_GRID_BY_MARQUE[v.trim().toLowerCase()]
                  setForm(f => ({ ...f, marque: v, modele: '', ...(grid ? { typeKey: grid } : {}) }))
                }} required>
                  <option value="">— Choisir —</option>
                  {(params?.fournisseurs ?? []).map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-field" style={{ flex: 2 }}>
                <label>Modèle et critères</label>
                <ComboBox
                  value={form.modele}
                  onChange={v => set('modele', v)}
                  options={modelesSuggestions}
                  placeholder="ex: FIJI, Mushroom"
                />
              </div>
              <div className="form-field">
                <label>N°</label>
                <input value={form.numero} onChange={e => set('numero', e.target.value)}
                  placeholder="Référence" style={{ fontWeight: 700, ...numeroColor(form.numero) }} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>Catégorie</label>
                <select value={form.categorie} onChange={e => {
                  const cat = e.target.value
                  setForm(f => ({ ...f, categorie: cat, typeKey: CAT_TO_KEY[cat] ?? f.typeKey }))
                }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c || '— Choisir —'}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>
                  PHT livré (€)
                  <span style={{ fontWeight: 400, color: '#059669', fontSize: 11, marginLeft: 6 }}>● calculé auto</span>
                </label>
                <div style={{
                  padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8,
                  background: 'var(--surface-2)', fontSize: 14, fontWeight: 700, color: 'var(--text)',
                }}>
                  {form.pht
                    ? Number(form.pht).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
                    : '—'}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
                  {unitPrice > 0
                    ? `prix unitaire ${unitPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })} × ${total} u.`
                    : 'Renseigne le prix HT du modèle dans Paramètres → Marques'}
                </span>
              </div>
            </div>

            {/* Grille tailles */}
            <div className="size-section">
              <div className="size-header">
                <h3>Quantités par taille</h3>
                <span style={{ fontWeight: 700, fontSize: 18, color: total > 0 ? '#2563eb' : '#94a3b8', marginLeft: 'auto', marginRight: 12 }}>
                  {total} u.
                </span>
                <button type="button" onClick={handleCopy}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: copied ? '#d1fae5' : '#f8fafc', cursor: 'pointer', fontSize: 12, marginRight: 4, color: copied ? '#059669' : '#475569', fontWeight: 600 }}>
                  {copied ? '✅ Copié' : '📋 Copier'}
                </button>
                <button type="button" onClick={handlePaste} disabled={!cb}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: cb ? 'pointer' : 'not-allowed', fontSize: 12, marginRight: 8, color: '#475569', fontWeight: 600, opacity: cb ? 1 : 0.4 }}>
                  📥 Coller
                </button>
                <div className="size-type-tabs">
                  {Object.entries(SIZE_TYPES).map(([key, def]) => (
                    <button type="button" key={key}
                      className={`size-type-btn${form.typeKey === key ? ' active' : ''}`}
                      onClick={() => set('typeKey', key)}>
                      {def.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="size-grid">
                {(type?.sizes ?? []).map((size, i) => (
                  <div key={size} className="size-input-group">
                    <label>{size}</label>
                    <input
                      type="number" min="0"
                      value={quantities[i] ?? ''}
                      onChange={e => setQty(i, e.target.value)}
                      placeholder="0"
                      data-size-index={i}
                      onKeyDown={e => {
                        if (e.key === 'ArrowRight') {
                          e.preventDefault()
                          const next = document.querySelector(`[data-size-index="${i + 1}"]`)
                          next?.focus(); next?.select()
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault()
                          const prev = document.querySelector(`[data-size-index="${i - 1}"]`)
                          prev?.focus(); prev?.select()
                        }
                      }}
                    />
                  </div>
                ))}
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

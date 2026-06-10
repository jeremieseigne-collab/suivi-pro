import { useState, useEffect } from 'react'
import { useParams } from '../hooks/useParams'
import { SIZE_TYPES } from '../data/sizes'
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

function numeroColor(n) {
  const num = parseInt(n)
  if (!num) return {}
  const mod = ((num - 1) % 3)
  if (mod === 0) return { background: '#fee2e2', color: '#dc2626' }
  if (mod === 1) return { background: '#dbeafe', color: '#2563eb' }
  return { background: '#d1fae5', color: '#059669' }
}

const todayIso = new Date().toISOString().slice(0, 10)
const todayFr  = toFrDate(todayIso)

const INITIAL = {
  statut: '', magasin: '', date: todayFr, dateIso: todayIso,
  marque: '', modele: '', numero: '', categorie: '', typeKey: 'F',
}

export default function EntreeForm({ onClose, onSaved }) {
  const { season } = useSeason()
  const { params, loading: paramsLoading } = useParams()
  const [form,       setForm]       = useState(INITIAL)
  const [quantities, setQuantities] = useState([])
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState(false)
  const [clipData,   setClipData]   = useState(() => getClipboard())
  const [pmBase,     setPmBase]     = useState(0)
  const [phtAuto,    setPhtAuto]    = useState(true)

  const type = SIZE_TYPES[form.typeKey]

  useEffect(() => {
    setQuantities(Array(type?.sizes?.length ?? 0).fill(''))
  }, [form.typeKey])

  // Récupère le PM depuis Achats quand magasin+marque sont sélectionnés
  useEffect(() => {
    setPhtAuto(true)
    if (!form.magasin || !form.marque) { setPmBase(0); return }
    let cancelled = false
    ;(async () => {
      const mag  = await db.magasins.where('nom').equals(form.magasin).first()
      const four = await db.fournisseurs.where('nom').equals(form.marque).first()
      if (!mag || !four || cancelled) return
      const param = await db.parametres.where('fournisseurId').equals(four.id).and(p => p.magasinId === mag.id && p.season === season).first()
      if (!cancelled) setPmBase(param?.pm || 0)
    })()
    return () => { cancelled = true }
  }, [form.magasin, form.marque])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }
  function setQty(i, val)  { setQuantities(q => { const n = [...q]; n[i] = val; return n }) }

  const total = quantities.reduce((s, v) => s + (parseInt(v) || 0), 0)

  // Recalcule le PHT automatiquement quand le total ou le PM changent
  useEffect(() => {
    if (!phtAuto || pmBase <= 0) return
    setForm(f => ({ ...f, pht: total > 0 ? Math.round(pmBase * total * 100) / 100 : '' }))
  }, [total, pmBase, phtAuto])

  const modelesSuggestions = params?.modelesByMarque?.[form.marque] ?? []

  function handleCopy() {
    const data = { typeKey: form.typeKey, quantities: [...quantities] }
    setClipboard(data)
    setClipData(data)
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

      if (!magasinRow)     { setError('Magasin introuvable dans la base'); return }
      if (!fournisseurRow) { setError('Marque introuvable dans la base');  return }

      // Construire l'objet tailles { '36': 2, '37': 3, … }
      const sizes = {}
      ;(type?.sizes ?? []).forEach((size, i) => {
        const v = parseInt(quantities[i]) || 0
        if (v > 0) sizes[size] = v
      })

      await db.entrees.add({
        statut:       form.statut,
        magasinId:    magasinRow.id,
        fournisseurId: fournisseurRow.id,
        date:         form.date,
        modele:       form.modele,
        numero:       form.numero,
        categorie:    form.categorie,
        typeKey:      form.typeKey,
        total,
        pht:          Number(form.pht) || 0,
        sizes,
        season,
      })

      const clipboardData = { typeKey: form.typeKey, quantities: [...quantities] }
      setClipboard(clipboardData)
      setClipData(clipboardData)
      setSaved(true)
      setTimeout(() => { onSaved?.(); onClose?.() }, 1500)
    } catch (err) {
      setError('Erreur : ' + (err.message || 'Réessayez.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Nouvelle entrée</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {saved ? (
          <div className="modal-success">
            <div style={{ fontSize: 40 }}>✅</div>
            <p>Entrée enregistrée !</p>
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
                <select value={form.marque} onChange={e => { set('marque', e.target.value); set('modele', '') }} required>
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
                  {pmBase > 0 && (
                    <span style={{ fontWeight: 400, color: phtAuto ? '#059669' : '#f59e0b', fontSize: 11, marginLeft: 6 }}>
                      {phtAuto ? `● auto (PM: ${pmBase.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })})` : '● manuel'}
                    </span>
                  )}
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.pht || ''}
                  onChange={e => { setPhtAuto(false); set('pht', e.target.value) }}
                  onFocus={() => { if (phtAuto && pmBase > 0) setPhtAuto(false) }}
                  placeholder={pmBase > 0 ? `auto (PM × qtés)` : '0.00'}
                  style={{ borderColor: phtAuto && pmBase > 0 ? '#86efac' : undefined }}
                />
                {!phtAuto && pmBase > 0 && (
                  <button type="button" onClick={() => setPhtAuto(true)}
                    style={{ marginTop: 4, fontSize: 11, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    ↩ Recalculer automatiquement
                  </button>
                )}
              </div>
            </div>

            {/* Grille tailles */}
            <div className="size-section">
              <div className="size-header">
                <h3>Quantités par taille</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <span style={{ fontWeight: 700, fontSize: 18, color: total > 0 ? '#2563eb' : '#94a3b8', minWidth: 60, textAlign: 'right' }}>
                    {total} u.
                  </span>
                  <button type="button" onClick={handleCopy}
                    style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: copied ? '#d1fae5' : '#f8fafc', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {copied ? '✅ Copié' : '📋 Copier'}
                  </button>
                  <button type="button" onClick={handlePaste} disabled={!clipData}
                    title={clipData ? `Coller grille ${SIZE_TYPES[clipData.typeKey]?.label}` : 'Rien à coller'}
                    style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', background: clipData ? '#eff6ff' : '#f1f5f9', color: clipData ? '#2563eb' : '#94a3b8', cursor: clipData ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                    📌 Coller{clipData ? ` (${SIZE_TYPES[clipData.typeKey]?.label})` : ''}
                  </button>
                </div>
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
                    <input type="number" min="0" value={quantities[i] ?? ''} onChange={e => setQty(i, e.target.value)} placeholder="0" />
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="form-error">⚠️ {error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving || paramsLoading}>
                {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

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
  const [paramRow,   setParamRow]   = useState(null)
  const [toast,      setToast]      = useState(false)

  const type = SIZE_TYPES[form.typeKey]

  useEffect(() => {
    setQuantities(Array(type?.sizes?.length ?? 0).fill(''))
  }, [form.typeKey])

  // Récupère la ligne Achats (paramètres) pour magasin × marque × saison :
  // elle porte les quantités/prix par modèle (et le PM de secours).
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

  // Secours : si le modèle est déjà choisi et que la grille est vide quand la ligne Achats arrive, pré-remplir
  useEffect(() => {
    if (form.modele && quantities.length && quantities.every(q => !q)) prefillExpected(form.modele)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramRow])

  // Prix unitaire HT = prix HT total du modèle ÷ quantité commandée (sinon PM de secours)
  const unitPrice = useMemo(() => {
    if (!paramRow) return 0
    const q  = paramRow.modeles?.[form.modele]
    const px = paramRow.prixModeles?.[form.modele]
    if (q > 0 && px > 0) return px / q
    return paramRow.pm || 0
  }, [paramRow, form.modele])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }
  function setQty(i, val)  { setQuantities(q => { const n = [...q]; n[i] = val; return n }) }

  // À la sélection d'un modèle : pré-remplit la grille avec le RESTE à recevoir
  // = quantités attendues (import) − déjà reçu pour ce modèle (magasin × marque × saison)
  async function prefillExpected(modele) {
    const expected = paramRow?.modelesSizes?.[modele]
    if (!expected || !Object.keys(expected).length) return
    const gridKey = paramRow?.modelesTypes?.[modele] || form.typeKey
    const sizes   = SIZE_TYPES[gridKey]?.sizes ?? []
    // déjà reçu (hors retours) + N° / catégorie déjà saisis pour ce modèle
    const recu = {}
    let lastNumero = '', lastCat = ''
    try {
      const mag  = await db.magasins.where('nom').equals(form.magasin).first()
      const four = await db.fournisseurs.where('nom').equals(form.marque).first()
      if (mag && four) {
        const rows = await db.entrees.where('fournisseurId').equals(four.id)
          .and(e => e.magasinId === mag.id && e.season === season && e.modele === modele && e.statut !== 'Retour').toArray()
        rows.sort((a, b) => (a.id || 0) - (b.id || 0)) // chronologique → on garde le dernier N°/catégorie
        rows.forEach(e => {
          for (const [s, q] of Object.entries(e.sizes || {})) recu[s] = (recu[s] || 0) + (Number(q) || 0)
          if (e.numero)    lastNumero = e.numero
          if (e.categorie) lastCat    = e.categorie
        })
      }
    } catch { /* on garde l'attendu brut si la lecture échoue */ }
    const qty = sizes.map(s => {
      const rem = (Number(expected[s]) || 0) - (recu[s] || 0)
      return rem > 0 ? String(rem) : ''
    })
    const changeGrid = gridKey !== form.typeKey
    setForm(f => ({
      ...f,
      numero:    lastNumero || f.numero,
      categorie: lastCat    || f.categorie,
      ...(changeGrid ? { typeKey: gridKey } : {}),
    }))
    if (changeGrid) setTimeout(() => setQuantities(qty), 50) // après l'effet qui réinitialise la grille
    else            setQuantities(qty)
  }

  const total = quantities.reduce((s, v) => s + (parseInt(v) || 0), 0)

  // PHT livré = prix unitaire × quantité reçue (toujours auto, non modifiable)
  useEffect(() => {
    setForm(f => ({ ...f, pht: (unitPrice > 0 && total > 0) ? Math.round(unitPrice * total * 100) / 100 : '' }))
  }, [unitPrice, total])

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

  async function doSave(continueAfter) {
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

      if (continueAfter) {
        // Reste sur le formulaire : on garde magasin / date / marque, on vide le reste.
        // La liste sous la fenêtre se rafraîchit toute seule (temps réel) — surtout NE PAS
        // appeler onSaved() ici car le parent l'utilise pour fermer la fenêtre.
        setForm(f => ({ ...INITIAL, magasin: f.magasin, marque: f.marque, date: f.date, dateIso: f.dateIso }))
        setQuantities(Array(SIZE_TYPES.F.sizes.length).fill(''))
        setToast(true)
        setTimeout(() => setToast(false), 2000)
      } else {
        setSaved(true)
        setTimeout(() => { onSaved?.(); onClose?.() }, 1500)
      }
    } catch (err) {
      setError('Erreur : ' + (err.message || 'Réessayez.'))
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e) { e.preventDefault(); doSave(false) }

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
            {toast && (
              <div style={{ padding: '8px 12px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#059669', fontWeight: 600 }}>
                ✅ Entrée enregistrée — prête pour la suivante (magasin, date et marque conservés)
              </div>
            )}
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
                  onChange={v => { set('modele', v); prefillExpected(v) }}
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
              <button type="button" className="btn-secondary" onClick={() => doSave(true)} disabled={saving || paramsLoading}
                title="Enregistre et reste sur le formulaire (garde magasin, date et marque)">
                {saving ? '⏳…' : '➕ Enregistrer et continuer'}
              </button>
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

import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { SIZE_TYPES, DEFAULT_GRID_BY_MARQUE } from '../data/sizes'
import { FournisseurInput, ModeleInput } from '../defectueux/DefectueuxModal'
import { CATEGORIES, CAT_TO_KEY, ETAPE_COLORS, ETAPE_ICONS, CELL, fmtDate, sortSizes, cleanStock, supprimerTop } from './constants'

const KEY_TO_CAT = Object.fromEntries(Object.entries(CAT_TO_KEY).map(([c, k]) => [k, c]))

// Grille des pointures : clic = suivre / ne plus suivre ; case suivie = saisie du stock
export function StockGrid({ sizes, pointures, stock, cible = 1, onToggle, onStock }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {sizes.map(s => {
        const suivie = pointures.includes(s)
        const v = stock[s]
        const etat = !suivie ? null : (Number(v) || 0) < cible ? 'rupture' : 'ok'
        const c = etat ? CELL[etat] : null
        return (
          <div key={s} style={{
            width: 58, borderRadius: 8, overflow: 'hidden', textAlign: 'center',
            border: `1px solid ${c ? c.border : 'var(--border)'}`, opacity: suivie ? 1 : 0.45,
          }}>
            <button type="button" onClick={() => onToggle?.(s)} disabled={!onToggle}
              title={onToggle ? (suivie ? 'Ne plus suivre cette pointure' : 'Suivre cette pointure') : ''}
              style={{
                width: '100%', padding: '3px 0', border: 'none', fontSize: 12, fontWeight: 700,
                cursor: onToggle ? 'pointer' : 'default',
                background: c ? c.bg : 'var(--surface-2)', color: c ? c.text : 'var(--text-3)',
              }}>{s}</button>
            {suivie && (
              <input type="number" min="0" inputMode="numeric" value={v === undefined || v === '' ? '0' : v}
                onFocus={e => e.target.select()}
                onChange={e => onStock(s, e.target.value)}
                style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14, padding: '4px 0', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TopModal({ top, magasinId, historique = [], onClose }) {
  const editing = !!top?.id
  const { season } = useSeason()
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])

  const [form, setForm] = useState({
    fournisseurId: top?.fournisseurId ? String(top.fournisseurId) : '',
    modele:    top?.modele    ?? '',
    numero:    top?.numero    ?? '',
    categorie: top?.categorie ?? '',
    typeKey:   top?.typeKey   ?? 'F',
    cible:     top?.cible     ?? 1,
    note:      top?.note      ?? '',
  })
  const [pointures, setPointures] = useState(top?.pointures ?? [])
  const [stock,     setStock]     = useState(() => Object.fromEntries(Object.entries(top?.stock || {}).map(([k, v]) => [k, String(v)])))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const fournisseur = useMemo(() => (fournisseurs || []).find(f => f.id === Number(form.fournisseurId)), [fournisseurs, form.fournisseurId])
  const models = useMemo(() => {
    if (!fournisseur) return []
    const s = new Set()
    Object.values(fournisseur.modelesBySeason || {}).forEach(arr => (arr || []).forEach(m => s.add(m)))
    return [...s].sort()
  }, [fournisseur])

  // Pré-remplissage à la sélection d'un modèle (création) : grille, pointures, N°, catégorie
  useEffect(() => {
    if (editing) return
    const fId = Number(form.fournisseurId)
    if (!fId || !form.modele) return
    let cancelled = false
    ;(async () => {
      const [param, rows] = await Promise.all([
        db.parametres.where({ fournisseurId: fId, magasinId }).filter(p => p.season === season).first(),
        db.entrees.where('fournisseurId').equals(fId).and(e => e.modele === form.modele && e.statut !== 'Retour').toArray(),
      ])
      if (cancelled) return
      const mine = rows.filter(e => e.magasinId === magasinId)
      const src  = mine.length ? mine : rows
      const last = src[src.length - 1]
      const tk = param?.modelesTypes?.[form.modele] || last?.typeKey
        || DEFAULT_GRID_BY_MARQUE[(fournisseur?.nom || '').toLowerCase()] || form.typeKey
      let ps = Object.keys(param?.modelesSizes?.[form.modele] || {})
      if (!ps.length) { const s = new Set(); src.forEach(e => Object.entries(e.sizes || {}).forEach(([k, v]) => { if (v > 0) s.add(k) })); ps = [...s] }
      const grid = SIZE_TYPES[tk]?.sizes || []
      setPointures(sortSizes(ps.filter(p => grid.includes(p))))
      setForm(f => ({
        ...f, typeKey: tk,
        numero:    last?.numero    || f.numero,
        categorie: last?.categorie || f.categorie || KEY_TO_CAT[tk] || '',
      }))
    })()
    return () => { cancelled = true }
  }, [form.fournisseurId, form.modele])

  const grid = SIZE_TYPES[form.typeKey]?.sizes || []

  function toggle(s) {
    setPointures(p => p.includes(s) ? p.filter(x => x !== s) : sortSizes([...p, s]))
  }

  async function handleSave() {
    if (!form.fournisseurId) { setError('Marque obligatoire'); return }
    if (!form.modele)        { setError('Modèle obligatoire'); return }
    if (!pointures.length)   { setError('Choisis au moins une pointure à suivre'); return }
    setSaving(true); setError('')
    try {
      const cleaned = cleanStock(stock, pointures)
      const stockChanged = JSON.stringify(cleaned) !== JSON.stringify(top?.stock || {})
      const payload = {
        fournisseurId: Number(form.fournisseurId), modele: form.modele, numero: form.numero,
        categorie: form.categorie, typeKey: form.typeKey, cible: Math.max(1, parseInt(form.cible) || 1),
        note: form.note, pointures, stock: cleaned,
        ...(stockChanged ? { stockAt: new Date().toISOString() } : {}),
      }
      if (editing) await db.topModeles.update(top.id, payload)
      else await db.topModeles.add({ ...payload, magasinId, season })
      onClose?.()
    } catch (e) {
      setError('Erreur : ' + (e.message || e)); setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await supprimerTop(top.id)
      onClose?.()
    } catch (e) { setError('Erreur : ' + (e.message || e)) }
  }

  // Pointures les plus réassorties (historique)
  const topPointures = useMemo(() => {
    const cnt = {}
    historique.forEach(r => Object.entries(r.sizes || {}).forEach(([s, q]) => { cnt[s] = (cnt[s] || 0) + (Number(q) || 0) }))
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [historique])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>{editing ? `⭐ ${top.modele}` : '⭐ Nouveau top modèle'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-field">
              <label>Marque *</label>
              <FournisseurInput
                value={form.fournisseurId}
                onChange={v => setForm(f => ({ ...f, fournisseurId: v, modele: '' }))}
                fournisseurs={fournisseurs || []}
                onAdd={async nom => {
                  const id = await db.fournisseurs.add({ nom, modelesBySeason: {} })
                  setForm(f => ({ ...f, fournisseurId: String(id), modele: '' }))
                }}
              />
            </div>
            <div className="form-field">
              <label>Modèle *</label>
              <ModeleInput
                key={form.fournisseurId}
                value={form.modele}
                onChange={v => set('modele', v)}
                models={models}
                disabled={!form.fournisseurId}
                canAdd={!!form.fournisseurId}
                onAdd={async nom => {
                  const existing = fournisseur?.modelesBySeason || {}
                  const arr = existing[season] || []
                  if (!arr.includes(nom)) {
                    await db.fournisseurs.update(Number(form.fournisseurId), { modelesBySeason: { ...existing, [season]: [...arr, nom] } })
                  }
                  set('modele', nom)
                }}
              />
            </div>
            <div className="form-field">
              <label>N°</label>
              <input value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="Référence" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Catégorie</label>
              <select value={form.categorie} onChange={e => {
                const cat = e.target.value
                setForm(f => ({ ...f, categorie: cat, typeKey: CAT_TO_KEY[cat] ?? f.typeKey }))
              }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c || '—'}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Grille de pointures</label>
              <select value={form.typeKey} onChange={e => { set('typeKey', e.target.value); setPointures([]) }}>
                {Object.entries(SIZE_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label title="En dessous de ce stock, la pointure est considérée en rupture">Stock mini par pointure</label>
              <input type="number" min="1" value={form.cible} onChange={e => set('cible', e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Pointures suivies & stock actuel</label>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 6 }}>
              Clique sur une pointure pour la suivre (ou non), puis saisis le stock en magasin.
            </div>
            <StockGrid sizes={grid} pointures={pointures} stock={stock} cible={Math.max(1, parseInt(form.cible) || 1)}
              onToggle={toggle} onStock={(s, v) => setStock(st => ({ ...st, [s]: v }))} />
          </div>

          <div className="form-field">
            <label>Note</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ex. coloris phare, vitrine…" />
          </div>

          {editing && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🕘 Historique des réassorts</div>
              {historique.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-4)' }}>Aucun réassort pour l'instant.</div>
              ) : (
                <>
                  {topPointures.length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
                      Pointures les plus réassorties :{' '}
                      {topPointures.map(([s, q]) => <strong key={s} style={{ marginRight: 8 }}>{s} <span style={{ fontWeight: 400, color: 'var(--text-4)' }}>({q})</span></strong>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {historique.map(r => (
                      <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-3)', minWidth: 64 }}>{fmtDate(r.createdAt)}</span>
                        <span style={{ fontWeight: 700, color: ETAPE_COLORS[r.statut] }}>{ETAPE_ICONS[r.statut]} {r.statut}</span>
                        <span style={{ color: 'var(--text-2)' }}>
                          {sortSizes(Object.keys(r.sizes || {})).map(s => `${s}×${r.sizes[s]}`).join('  ')}
                        </span>
                        {r.statut === 'Reçu' && r.etapes?.['Reçu'] && (
                          <span style={{ marginLeft: 'auto', color: 'var(--text-4)' }}>reçu le {fmtDate(r.etapes['Reçu'])}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {error && <div className="form-error">⚠️ {error}</div>}

          <div className="modal-actions">
            {editing && (confirmDel ? (
              <button className="btn-secondary" style={{ marginRight: 'auto', color: '#dc2626', borderColor: '#fca5a5' }} onClick={handleDelete}>Supprimer définitivement ?</button>
            ) : (
              <button className="btn-secondary" style={{ marginRight: 'auto' }} onClick={() => setConfirmDel(true)}>🗑 Supprimer ce top</button>
            ))}
            <button className="btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

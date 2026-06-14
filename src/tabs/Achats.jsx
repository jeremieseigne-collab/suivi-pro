import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import AchatEditModal from '../components/AchatEditModal'
import AchatAddModal  from '../components/AchatAddModal'
import { useSeason } from '../context/SeasonContext'
import { SOCIETES, getSociete } from '../data/societes'

const STRAT_COLORS = {
  '🚀 BOOSTER':   '#dbeafe',
  '🛡️ MAINTENIR': '#d1fae5',
  '📉 RÉDUIRE':   '#fef3c7',
  '🛑 ARRÊTER':   '#fee2e2',
}

function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort() }

// "ETE_2026" → { type:'ETE', year:2026 } ; "HIVER_2027" → { type:'HIVER', year:2027 }
function parseSeasonId(id) {
  const m = /^(.+)_(\d{4})$/.exec(id || '')
  return m ? { type: m[1], year: parseInt(m[2]) } : null
}

export default function Achats() {
  const { season, seasons } = useSeason()
  const [search,    setSearch]    = useState('')
  const [societe,   setSociete]   = useState('')
  const [magasin,   setMagasin]   = useState('')
  const [strategie, setStrategie] = useState('')
  const [editRow,   setEditRow]   = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)
  const [ghost,     setGhost]     = useState(false)
  const [selected,  setSelected]  = useState('') // fournisseur sélectionné (mode fantôme ciblé)
  const [importing, setImporting] = useState(false)

  // Saison précédente de MÊME type (Été→Été N-1, Hiver→Hiver N-1)
  const prevSeason = useMemo(() => {
    const cur = parseSeasonId(season)
    if (!cur) return null
    let best = null
    for (const s of (seasons || [])) {
      const p = parseSeasonId(s.id)
      if (p && p.type === cur.type && p.year < cur.year && (!best || p.year > parseSeasonId(best.id).year)) best = s
    }
    return best
  }, [season, seasons])

  // Marques (fournisseur × magasin) présentes dans la saison précédente
  const prevCombos = useLiveQuery(async () => {
    if (!prevSeason) return []
    const params = await db.parametres.where('season').equals(prevSeason.id).toArray()
    const seen = new Set(), combos = []
    for (const p of params) {
      if (!p.fournisseurId || !p.magasinId) continue
      const k = p.fournisseurId + '_' + p.magasinId
      if (!seen.has(k)) { seen.add(k); combos.push({ fournisseurId: p.fournisseurId, magasinId: p.magasinId }) }
    }
    return combos
  }, [prevSeason?.id])

  async function importBrands() {
    if (!prevSeason || !(prevCombos?.length)) return
    setImporting(true)
    try {
      for (const c of prevCombos) {
        await db.parametres.add({ fournisseurId: c.fournisseurId, magasinId: c.magasinId, season })
      }
    } finally { setImporting(false) }
  }

  const data = useLiveQuery(async () => {
    const [params, magasins, fournisseurs] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])
    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))

    return params
      .filter(p => p.fournisseurId && p.magasinId)
      .map(p => ({
        ...p,
        magasin:     magasinMap[p.magasinId]          || '',
        fournisseur: fournisseurMap[p.fournisseurId]   || '',
        societe:     getSociete(magasinMap[p.magasinId] || ''),
      }))
  }, [season])

  const rows = data ?? []

  const filtered = useMemo(() => rows.filter(r => {
    if (societe   && r.societe   !== societe)    return false
    if (magasin   && r.magasin   !== magasin)    return false
    if (strategie && r.strategie !== strategie)  return false
    if (search && !r.fournisseur.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => a.fournisseur.localeCompare(b.fournisseur, 'fr')), [rows, search, societe, magasin, strategie])

  const magasinList  = useMemo(() => uniq(rows.map(r => r.magasin)),   [rows])
  const strategies   = useMemo(() => uniq(rows.map(r => r.strategie)), [rows])
  const totalRecuN1  = filtered.reduce((s, r) => s + (r.recuN1  || 0), 0)
  const totalObjectif = filtered.reduce((s, r) => s + (r.objectifN || 0), 0)
  const totalReel    = filtered.reduce((s, r) => s + (r.reelN   || 0), 0)
  const totalQte     = filtered.reduce((s, r) => s + (r.quantite || 0), 0)

  if (data === undefined) return <LoadingState />

  return (
    <div>
      {editRow  && <AchatEditModal row={editRow}  onClose={() => setEditRow(null)} onSaved={() => setEditRow(null)} />}
      {showAdd  && <AchatAddModal  onClose={() => setShowAdd(false)} onSaved={() => setShowAdd(false)} />}

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div className="tab-stats" style={{ flex: 1 }}>
          {[
            { value: totalRecuN1.toLocaleString('fr-FR',   { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), label: `Total Reçu N-1${magasin ? ` · ${magasin}` : ''}` },
            { value: totalObjectif.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), label: `Total Objectif N${magasin ? ` · ${magasin}` : ''}` },
            { value: totalReel.toLocaleString('fr-FR',     { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }), label: `Total Réel N${magasin ? ` · ${magasin}` : ''}` },
            { value: filtered.length, label: 'Fournisseurs' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-value" style={{
                fontSize: 16,
                filter: ghost ? 'blur(8px)' : 'none',
                userSelect: ghost ? 'none' : 'auto',
                transition: 'filter .2s',
              }}>{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setGhost(g => !g)}
          title={ghost ? 'Afficher les données' : 'Mode discret'}
          style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: ghost ? 1 : 0.25, transition: 'opacity .2s', padding: '4px 6px', borderRadius: 6 }}
        >👻</button>
      </div>

      {/* Report des marques depuis la saison précédente (même type) */}
      {rows.length === 0 && prevSeason && (prevCombos?.length > 0) && (
        <div className="store-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
          <span style={{ fontSize: 22 }}>📋</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>Reporter les marques de {prevSeason.label} ?</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {prevCombos.length} ligne{prevCombos.length > 1 ? 's' : ''} (fournisseur × magasin) — créées <strong>vides</strong>, à compléter (objectif, réel, quantité…).
            </div>
          </div>
          <button className="btn-primary" onClick={importBrands} disabled={importing}>
            {importing ? '⏳ Import…' : `Importer ${prevCombos.length} ligne${prevCombos.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Stratégie pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {strategies.map(s => (
          <button key={s} onClick={() => setStrategie(strategie === s ? '' : s)} style={{
            padding: '6px 14px', borderRadius: 20, border: '2px solid',
            borderColor: strategie === s ? '#334155' : 'transparent',
            background: STRAT_COLORS[s] || '#f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}>
            {s} <strong>({rows.filter(r => r.strategie === s).length})</strong>
          </button>
        ))}
      </div>

      <div className="controls" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input type="text" placeholder="🔍 Fournisseur…" value={search}
          onChange={e => setSearch(e.target.value)} className="search-input" />
        <select value={societe} onChange={e => { setSociete(e.target.value); setMagasin('') }} className="sel">
          <option value="">Toutes les sociétés</option>
          {SOCIETES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={magasin} onChange={e => setMagasin(e.target.value)} className="sel">
          <option value="">Tous les magasins</option>
          {magasinList.map(m => <option key={m}>{m}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Nouveau fournisseur</button>
      </div>

      <div className="store-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Statut</th><th>Magasin</th><th>Fournisseur</th>
                <th style={{ textAlign: 'right' }}>Reçu N-1</th>
                <th style={{ textAlign: 'right' }}>Objectif N</th>
                <th style={{ textAlign: 'right' }}>Réel achat N</th>
                <th style={{ textAlign: 'right' }}>Quantité</th>
                <th style={{ textAlign: 'right' }}>PM</th>
                <th>Stratégie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  {rows.length === 0 ? 'Aucun fournisseur — cliquez sur "+ Nouveau fournisseur".' : 'Aucun résultat.'}
                </td></tr>
              )}
              {filtered.map(r => {
                const isSel  = r.fournisseur === selected
                const masked = ghost && !isSel
                const blur   = masked ? { filter: 'blur(6px)', userSelect: 'none' } : null
                return (
                <tr key={r.id} onClick={() => setSelected(isSel ? '' : r.fournisseur)}
                  style={{ cursor: 'pointer', background: isSel ? 'var(--accent-bg)' : undefined }}
                  title={ghost ? (isSel ? 'Fournisseur affiché' : 'Cliquer pour afficher ce fournisseur') : 'Cliquer pour sélectionner'}>
                  <td style={{ textAlign: 'center' }}>{r.statut}</td>
                  <td style={{ fontSize: 13 }}>{r.magasin}</td>
                  <td><strong>{r.fournisseur}</strong></td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontSize: 13, ...blur }}>
                    {r.recuN1 ? r.recuN1.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontSize: 13, ...blur }}>
                    {r.objectifN ? r.objectifN.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, ...blur }}>
                    {r.reelN ? r.reelN.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', ...blur }}>{r.quantite || '—'}</td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontSize: 13, ...blur }}>
                    {r.pm ? r.pm.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={blur || undefined}>
                    <span style={{ background: STRAT_COLORS[r.strategie] || '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.strategie || '—'}
                    </span>
                  </td>
                  <td>
                    <button className="edit-btn" onClick={e => { e.stopPropagation(); setEditRow(r) }} title="Modifier">✏️</button>
                  </td>
                </tr>
              )})}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '10px 12px' }}>Total ({filtered.length})</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', ...(ghost ? { filter: 'blur(6px)', userSelect: 'none' } : null) }}>
                    {totalRecuN1.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', ...(ghost ? { filter: 'blur(6px)', userSelect: 'none' } : null) }}>
                    {totalObjectif.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', ...(ghost ? { filter: 'blur(6px)', userSelect: 'none' } : null) }}>
                    {totalReel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', ...(ghost ? { filter: 'blur(6px)', userSelect: 'none' } : null) }}>{totalQte.toLocaleString('fr-FR')}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

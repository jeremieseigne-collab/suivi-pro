import { useState, useMemo, Fragment } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { GaugeBar } from '../components/shared'
import { useSeason } from '../context/SeasonContext'
import { SIZE_TYPES } from '../data/sizes'

function Badge({ color, children }) {
  const map = {
    green:  ['#d1fae5', '#059669'],
    blue:   ['#dbeafe', '#2563eb'],
    yellow: ['#fef3c7', '#d97706'],
    gray:   ['#f1f5f9', '#94a3b8'],
  }
  const [bg, fg] = map[color] || map.gray
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, background: bg, color: fg, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function statusBadge(p) {
  if (p === 0)   return <Badge color="gray">{Math.round(p)}%</Badge>
  if (p >= 100)  return <Badge color="green">{Math.round(p)}%</Badge>
  if (p >= 50)   return <Badge color="blue">{Math.round(p)}%</Badge>
  return <Badge color="yellow">{Math.round(p)}%</Badge>
}

// Détail des quantités par pointure (attendu vs reçu) pour un modèle
function SizeBreakdown({ m }) {
  const grid = SIZE_TYPES[m.typeKey]?.sizes || []
  const all = new Set([...Object.keys(m.sizesAttendu || {}), ...Object.keys(m.sizesRecu || {})])
  const ordered = [...grid.filter(s => all.has(s)), ...[...all].filter(s => !grid.includes(s)).sort()]
  if (!ordered.length) return <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-4)' }}>Aucun détail de pointure (à importer via le CSV).</div>
  return (
    <div style={{ padding: '6px 12px 10px' }}>
      {m.typeKey && <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 4 }}>Grille : {SIZE_TYPES[m.typeKey]?.label || m.typeKey}</div>}
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'var(--text-4)' }}>
            <th style={{ textAlign: 'left', padding: '2px 6px' }}>Pointure</th>
            <th style={{ textAlign: 'right', padding: '2px 6px' }}>Reçu</th>
            <th style={{ textAlign: 'right', padding: '2px 6px' }}>Attendu</th>
            <th style={{ width: 24 }}></th>
          </tr>
        </thead>
        <tbody>
          {ordered.map(s => {
            const a = Number(m.sizesAttendu?.[s]) || 0
            const r = Number(m.sizesRecu?.[s]) || 0
            const icon = a > 0 ? (r >= a ? '✅' : (r > 0 ? '🔵' : '⬜')) : ''
            return (
              <tr key={s} style={{ borderTop: '1px solid var(--surface-3)' }}>
                <td style={{ padding: '2px 6px', fontWeight: 600 }}>{s}</td>
                <td style={{ padding: '2px 6px', textAlign: 'right', color: r ? 'var(--text)' : 'var(--text-4)' }}>{r}</td>
                <td style={{ padding: '2px 6px', textAlign: 'right', color: 'var(--text-3)' }}>{a || '—'}</td>
                <td style={{ textAlign: 'center' }}>{icon}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Popup : détail par modèle (reçu/attendu, barre, %) + détail par pointure (dépliable)
function DetailModal({ row, onClose }) {
  const modeles = row.modeles || []
  const globalPct = row.attendu > 0 ? Math.round(row.recu / row.attendu * 100) : 0
  const [open, setOpen] = useState(null) // nom du modèle déplié
  const hasSizes = m => Object.keys(m.sizesAttendu || {}).length > 0 || Object.keys(m.sizesRecu || {}).length > 0
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{row.marque} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {row.magasin}</span></h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{row.recu} / {row.attendu} unités</span>
            {statusBadge(globalPct)}
          </div>
          {modeles.length === 0 ? (
            <p style={{ color: 'var(--text-4)', fontSize: 14 }}>Aucun modèle renseigné pour cette marque.</p>
          ) : (
            <table className="brand-table">
              <tbody>
                {modeles.map(m => {
                  const p = m.attendu > 0 ? (m.recu / m.attendu) * 100 : 0
                  const can = hasSizes(m)
                  const isOpen = open === m.nom
                  return (
                    <Fragment key={m.nom}>
                      <tr className={m.recu === 0 ? 'row-zero' : ''}
                        onClick={can ? () => setOpen(isOpen ? null : m.nom) : undefined}
                        style={{ cursor: can ? 'pointer' : 'default' }}
                        title={can ? 'Voir le détail par pointure' : undefined}>
                        <td className="brand-name">
                          {can && <span style={{ color: 'var(--text-4)', fontSize: 10, marginRight: 5 }}>{isOpen ? '▾' : '▸'}</span>}
                          {m.nom}
                          {m.numero && <span style={{ color: 'var(--text-4)', fontSize: 11, marginLeft: 6, fontWeight: 400 }}>N° {m.numero}</span>}
                        </td>
                        <td className="brand-count">{m.recu} / {m.attendu}</td>
                        <td className="brand-bar"><GaugeBar percent={p} /></td>
                        <td>{statusBadge(p)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={4} style={{ background: 'var(--surface-2)', padding: 0 }}>
                            <SizeBreakdown m={m} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function StoreCard({ store, rows, onOpen }) {
  const [open, setOpen] = useState(false)
  const totals = rows.reduce((s, r) => ({ recu: s.recu + r.recu, attendu: s.attendu + r.attendu }), { recu: 0, attendu: 0 })
  const globalPct = totals.attendu > 0 ? (totals.recu / totals.attendu) * 100 : 0

  return (
    <div className="store-card">
      <div className="store-header" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }} title="Afficher / masquer les marques">
        <div>
          <h2 className="store-name">
            <span style={{ color: 'var(--text-4)', fontSize: 14, marginRight: 7 }}>{open ? '▾' : '▸'}</span>
            {store}
          </h2>
          <p className="store-sub">{rows.length} marque{rows.length > 1 ? 's' : ''} · {totals.recu}/{totals.attendu} unités</p>
        </div>
        {statusBadge(globalPct)}
      </div>
      <GaugeBar percent={globalPct} />
      {open && (
      <table className="brand-table">
        <thead style={{ display: 'none' }}></thead>
        <tbody>
          {rows.map(row => {
            const p = row.attendu > 0 ? (row.recu / row.attendu) * 100 : 0
            return (
              <tr key={row.suiviId} className={p === 0 ? 'row-zero' : ''} onClick={() => onOpen(row)} style={{ cursor: 'pointer' }} title="Voir le détail par modèle">
                <td className="brand-name">{row.marque} <span style={{ color: 'var(--text-4)', fontSize: 11 }}>›</span></td>
                <td className="brand-count">{row.recu} / {row.attendu}</td>
                <td className="brand-bar"><GaugeBar percent={p} /></td>
                <td>{statusBadge(p)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      )}
    </div>
  )
}

export default function SuiviLivraisons() {
  const { season } = useSeason()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [magFilter, setMagFilter] = useState('')   // '' = tous les magasins
  const [detail, setDetail] = useState(null)

  const rows = useLiveQuery(async () => {
    const [params, entrees, magasins, fournisseurs] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.entrees.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])

    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))

    // Quantités reçues par fournisseur × magasin (total + détail par modèle + N° + par pointure)
    const recuByKey        = {}
    const recuModelByKey   = {}
    const numeroModelByKey = {}
    const recuSizesByKey   = {}
    entrees.forEach(e => {
      if (e.statut === 'Retour') return // les retours ne sont pas comptabilisés dans le reçu
      const k = e.fournisseurId + '_' + e.magasinId
      recuByKey[k] = (recuByKey[k] || 0) + (e.total || 0)
      const mod = (e.modele || '').trim() || '(sans modèle)'
      if (!recuModelByKey[k]) recuModelByKey[k] = {}
      recuModelByKey[k][mod] = (recuModelByKey[k][mod] || 0) + (e.total || 0)
      if (!numeroModelByKey[k]) numeroModelByKey[k] = {}
      if (!numeroModelByKey[k][mod]) numeroModelByKey[k][mod] = new Set()
      if (e.numero) numeroModelByKey[k][mod].add(e.numero)
      // détail par pointure (reçu)
      if (!recuSizesByKey[k]) recuSizesByKey[k] = {}
      if (!recuSizesByKey[k][mod]) recuSizesByKey[k][mod] = {}
      for (const [t, q] of Object.entries(e.sizes || {})) {
        const n = Number(q) || 0
        if (n) recuSizesByKey[k][mod][t] = (recuSizesByKey[k][mod][t] || 0) + n
      }
    })

    return params
      .filter(p => p.fournisseurId && p.magasinId)
      .map(p => {
        const key = p.fournisseurId + '_' + p.magasinId
        const recuModels    = recuModelByKey[key] || {}
        const attenduModels = p.modeles || {}
        const numeroModels  = numeroModelByKey[key] || {}
        const names = [...new Set([...Object.keys(attenduModels), ...Object.keys(recuModels)])]
        const attenduSizesAll = p.modelesSizes || {}
        const typesAll        = p.modelesTypes || {}
        const recuSizesAll    = recuSizesByKey[key] || {}
        const modeles = names
          .map(nom => ({
            nom,
            recu:    recuModels[nom] || 0,
            attendu: attenduModels[nom] || 0,
            numero:  [...(numeroModels[nom] || [])].sort((a, b) => a - b).join(', '),
            sizesAttendu: attenduSizesAll[nom] || {},
            sizesRecu:    recuSizesAll[nom] || {},
            typeKey:      typesAll[nom] || null,
          }))
          .sort((a, b) => (b.attendu - a.attendu) || (b.recu - a.recu) || a.nom.localeCompare(b.nom))
        return {
          suiviId:   p.id,
          magasin:   magasinMap[p.magasinId]      || '?',
          marque:    fournisseurMap[p.fournisseurId] || '?',
          recu:      recuByKey[key] || 0,
          attendu:   p.quantite || 0,
          modeles,
        }
      })
  }, [season])

  const allRows = rows ?? []

  const totalRecu    = allRows.reduce((s, r) => s + r.recu, 0)
  const totalAttendu = allRows.reduce((s, r) => s + r.attendu, 0)
  const globalPct    = totalAttendu > 0 ? Math.round(totalRecu / totalAttendu * 100) : 0

  const magasinsList = useMemo(() => [...new Set(allRows.map(r => r.magasin))].sort(), [allRows])

  const filtered = useMemo(() => allRows.filter(r => {
    const p = r.attendu > 0 ? (r.recu / r.attendu) * 100 : 0
    if (magFilter && r.magasin !== magFilter)        return false
    if (search && !r.marque.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'done'    && p < 100)             return false
    if (filter === 'zero'    && p !== 0)             return false
    if (filter === 'pending' && (p === 0 || p >= 100)) return false
    return true
  }), [allRows, search, filter, magFilter])

  const grouped = {}
  filtered.forEach(row => {
    if (!grouped[row.magasin]) grouped[row.magasin] = []
    grouped[row.magasin].push(row)
  })
  const stores = Object.keys(grouped).sort()

  return (
    <div>
      {detail && <DetailModal row={detail} onClose={() => setDetail(null)} />}

      <div className="tab-stats">
        {[
          { value: `${globalPct}%`,                         label: 'Taux global' },
          { value: totalRecu.toLocaleString('fr-FR'),        label: 'Unités reçues' },
          { value: totalAttendu.toLocaleString('fr-FR'),     label: 'Unités attendues' },
          { value: stores.length,                            label: 'Magasins' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="controls" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input
          type="text" placeholder="🔍 Rechercher une marque…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={magFilter} onChange={e => setMagFilter(e.target.value)} className="sel" title="Filtrer par magasin">
          <option value="">🏪 Tous les magasins</option>
          {magasinsList.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="filter-tabs">
          {[['all','Tout'],['done','✅ Complet'],['pending','🔵 En cours'],['zero','⚠️ Non reçu']].map(([k, l]) => (
            <button key={k} className={`filter-tab${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
        {allRows.length === 0 && (
          <div className="empty">
            <p>Aucune donnée — renseignez la <strong>quantité commandée</strong> dans l'onglet <strong>Achats</strong> pour chaque fournisseur.</p>
          </div>
        )}
        {allRows.length > 0 && stores.length === 0 && (
          <div className="empty"><p>Aucun résultat pour ce filtre.</p></div>
        )}
        {stores.map(store => <StoreCard key={store} store={store} rows={grouped[store]} onOpen={setDetail} />)}
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { GaugeBar } from '../components/shared'
import { useSeason } from '../context/SeasonContext'

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

function StoreCard({ store, rows }) {
  const totals = rows.reduce((s, r) => ({ recu: s.recu + r.recu, attendu: s.attendu + r.attendu }), { recu: 0, attendu: 0 })
  const globalPct = totals.attendu > 0 ? (totals.recu / totals.attendu) * 100 : 0

  return (
    <div className="store-card">
      <div className="store-header">
        <div>
          <h2 className="store-name">{store}</h2>
          <p className="store-sub">{rows.length} marque{rows.length > 1 ? 's' : ''} · {totals.recu}/{totals.attendu} unités</p>
        </div>
        {statusBadge(globalPct)}
      </div>
      <GaugeBar percent={globalPct} />
      <table className="brand-table">
        <thead>
          <tr><th>Marque</th><th>Reçu / Attendu</th><th>Progression</th><th>%</th></tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const p = row.attendu > 0 ? (row.recu / row.attendu) * 100 : 0
            return (
              <tr key={row.suiviId} className={p === 0 ? 'row-zero' : ''}>
                <td className="brand-name">{row.marque}</td>
                <td className="brand-count">{row.recu} / {row.attendu}</td>
                <td className="brand-bar"><GaugeBar percent={p} /></td>
                <td>{statusBadge(p)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function SuiviLivraisons() {
  const { season } = useSeason()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const rows = useLiveQuery(async () => {
    const [params, entrees, magasins, fournisseurs] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.entrees.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])

    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))

    // Somme des quantités reçues par fournisseur × magasin
    const recuByKey = {}
    entrees.forEach(e => {
      const k = e.fournisseurId + '_' + e.magasinId
      recuByKey[k] = (recuByKey[k] || 0) + (e.total || 0)
    })

    // "attendu" = quantite commandée dans les Achats
    return params
      .filter(p => p.fournisseurId && p.magasinId)
      .map(p => ({
        suiviId:       p.id,
        magasin:       magasinMap[p.magasinId]      || '?',
        marque:        fournisseurMap[p.fournisseurId] || '?',
        recu:          recuByKey[p.fournisseurId + '_' + p.magasinId] || 0,
        attendu:       p.quantite || 0,
        fournisseurId: p.fournisseurId,
        magasinId:     p.magasinId,
      }))
  }, [season])

  const allRows = rows ?? []

  const totalRecu    = allRows.reduce((s, r) => s + r.recu, 0)
  const totalAttendu = allRows.reduce((s, r) => s + r.attendu, 0)
  const globalPct    = totalAttendu > 0 ? Math.round(totalRecu / totalAttendu * 100) : 0

  const filtered = useMemo(() => allRows.filter(r => {
    const p = r.attendu > 0 ? (r.recu / r.attendu) * 100 : 0
    if (search && !r.marque.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'done'    && p < 100)             return false
    if (filter === 'zero'    && p !== 0)             return false
    if (filter === 'pending' && (p === 0 || p >= 100)) return false
    return true
  }), [allRows, search, filter])

  const grouped = {}
  filtered.forEach(row => {
    if (!grouped[row.magasin]) grouped[row.magasin] = []
    grouped[row.magasin].push(row)
  })
  const stores = Object.keys(grouped).sort()

  return (
    <div>
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

      <div className="controls">
        <input
          type="text" placeholder="🔍 Rechercher une marque…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
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
        {stores.map(store => <StoreCard key={store} store={store} rows={grouped[store]} />)}
      </div>
    </div>
  )
}

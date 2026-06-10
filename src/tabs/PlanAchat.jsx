import { useState, useMemo } from 'react'
import { useSheetData } from '../hooks/useSheetData'
import { LoadingState, ErrorState } from '../components/shared'

// Row 3 (_rowIndex=3) holds month headers
// Row 5+ are data rows: col_0=magasin (if not blank, else inherited), col_1=marque, col_2..col_16=month values, col_19=Total
function parseData(rows) {
  // Extract month labels from row 3
  const headerRow = rows.find(r => r._rowIndex === 3)
  if (!headerRow) return { months: [], entries: [] }

  const monthCols = ['col_2','col_3','col_4','col_5','col_6','col_7','col_8','col_9','col_10','col_11','col_12','col_13','col_14','col_15','col_16']
  const months = monthCols.map(c => headerRow[c]).filter(Boolean)

  const dataRows = rows.filter(r => r._rowIndex >= 5)
  let currentMagasin = ''
  const entries = []

  dataRows.forEach(row => {
    if (!row['col_1']) return // skip rows without marque
    if (row['col_0']) currentMagasin = row['col_0']
    const marque = row['col_1']
    const total = Number(row['col_19']) || 0
    const values = monthCols.map(c => Number(row[c]) || 0)
    if (total > 0 || values.some(v => v > 0)) {
      entries.push({ magasin: currentMagasin, marque, values, total })
    }
  })

  return { months, entries }
}

function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort() }

export default function PlanAchat() {
  const { data, loading, error, refresh } = useSheetData("Plan d'achat")
  const [magasin, setMagasin] = useState('')
  const [search, setSearch] = useState('')

  const { months, entries } = useMemo(() => {
    if (!data?.rows) return { months: [], entries: [] }
    return parseData(data.rows)
  }, [data])

  const magasins = useMemo(() => uniq(entries.map(e => e.magasin)), [entries])

  const filtered = useMemo(() => entries.filter(e => {
    if (magasin && e.magasin !== magasin) return false
    if (search && !e.marque.toLowerCase().includes(search.toLowerCase()) && !e.magasin.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [entries, magasin, search])

  const grandTotal = filtered.reduce((s, e) => s + e.total, 0)
  const monthTotals = months.map((_, mi) => filtered.reduce((s, e) => s + e.values[mi], 0))

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div>
      <div className="tab-stats">
        {[
          { value: filtered.length, label: 'Lignes' },
          { value: grandTotal.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }), label: 'Total général' },
          { value: months.length, label: 'Mois' },
          { value: uniq(filtered.map(e => e.magasin)).length, label: 'Magasins' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-value" style={{ fontSize: typeof s.value === 'string' && s.value.length > 8 ? 14 : undefined }}>{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="controls" style={{ gap:8, marginBottom:16 }}>
        <input
          type="text" placeholder="🔍 Magasin, marque…" value={search}
          onChange={e => setSearch(e.target.value)} className="search-input"
        />
        <select value={magasin} onChange={e => setMagasin(e.target.value)} className="sel">
          <option value="">Tous les magasins</option>
          {magasins.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      <div className="store-card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table plan-table">
            <thead>
              <tr>
                <th style={{ minWidth:120 }}>Magasin</th>
                <th style={{ minWidth:120 }}>Marque</th>
                {months.map((m, i) => <th key={i} style={{ textAlign:'right', minWidth:90, fontSize:11 }}>{m}</th>)}
                <th style={{ textAlign:'right', minWidth:100 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={months.length + 3} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Aucun résultat</td></tr>
              )}
              {filtered.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontSize:12, color:'#64748b' }}>{e.magasin}</td>
                  <td><strong>{e.marque}</strong></td>
                  {e.values.map((v, mi) => (
                    <td key={mi} style={{ textAlign:'right', fontSize:13, color: v > 0 ? '#0f172a' : '#cbd5e1' }}>
                      {v > 0 ? v.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }) : '—'}
                    </td>
                  ))}
                  <td style={{ textAlign:'right', fontWeight:700 }}>
                    {e.total.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 })}
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background:'#f8fafc', fontWeight:700 }}>
                  <td colSpan={2} style={{ padding:'10px 12px' }}>Total ({filtered.length} lignes)</td>
                  {monthTotals.map((t, i) => (
                    <td key={i} style={{ textAlign:'right', padding:'10px 6px', fontSize:12 }}>
                      {t > 0 ? t.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }) : '—'}
                    </td>
                  ))}
                  <td style={{ textAlign:'right', padding:'10px 12px' }}>
                    {grandTotal.toLocaleString('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

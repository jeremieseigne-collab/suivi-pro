import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import EntreeForm from '../components/EntreeForm'
import EntreeEditModal from '../components/EntreeEditModal'

import { useSeason } from '../context/SeasonContext'
import { SOCIETES, getSociete } from '../data/societes'

function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort() }

function numeroColor(n) {
  const num = parseInt(n)
  if (!num) return {}
  const mod = ((num - 1) % 3)
  if (mod === 0) return { background: '#fee2e2', color: '#dc2626', fontWeight: 700, borderRadius: 4, padding: '2px 6px' }
  if (mod === 1) return { background: '#dbeafe', color: '#2563eb', fontWeight: 700, borderRadius: 4, padding: '2px 6px' }
  return { background: '#d1fae5', color: '#059669', fontWeight: 700, borderRadius: 4, padding: '2px 6px' }
}

export default function Entrees({ defaultMagasin = '' }) {
  const { season } = useSeason()
  const [search,    setSearch]    = useState('')
  const [societe,   setSociete]   = useState('')
  const [magasin,   setMagasin]   = useState(defaultMagasin)
  const [marque,    setMarque]    = useState('')
  const [categorie, setCategorie] = useState('')
  const [statut,    setStatut]    = useState('')
  const [page,      setPage]      = useState(1)
  const [showForm,   setShowForm]   = useState(false)

  const [editEntry,  setEditEntry]  = useState(null)
  const PAGE = 50

  const data = useLiveQuery(async () => {
    const [entries, magasins, fournisseurs] = await Promise.all([
      db.entrees.where('season').equals(season).reverse().sortBy('id'),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])
    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))

    return entries.map(e => ({
      ...e,
      magasin: magasinMap[e.magasinId]          || '',
      marque:  fournisseurMap[e.fournisseurId]   || '',
      societe: getSociete(magasinMap[e.magasinId] || ''),
    }))
  }, [season])

  const rows = data ?? []

  const filtered = useMemo(() => rows.filter(r => {
    if (societe   && r.societe   !== societe)    return false
    if (magasin   && r.magasin   !== magasin)    return false
    if (marque    && r.marque    !== marque)      return false
    if (categorie && r.categorie !== categorie)  return false
    if (statut    && r.statut    !== statut)      return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.marque.toLowerCase().includes(q) && !(r.modele || '').toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, societe, magasin, marque, categorie, statut])

  // Les retours restent affichés mais ne comptent pas dans les unités / la valeur estimée
  const totalUnites = filtered.reduce((s, r) => s + (r.statut === 'Retour' ? 0 : (r.total || 0)), 0)
  const totalPHT    = filtered.reduce((s, r) => s + (r.statut === 'Retour' ? 0 : (r.pht   || 0)), 0)

  const paginated = filtered.slice((page - 1) * PAGE, page * PAGE)
  const pages     = Math.ceil(filtered.length / PAGE)

  const magasinList  = useMemo(() => uniq(rows.map(r => r.magasin)),   [rows])
  const marqueList   = useMemo(() => uniq(rows.map(r => r.marque)),    [rows])
  const categList    = useMemo(() => uniq(rows.map(r => r.categorie)), [rows])
  const statutList   = useMemo(() => uniq(rows.map(r => r.statut)),    [rows])

  function resetPage() { setPage(1) }

  if (data === undefined) return <LoadingState />

  return (
    <div>
      {showForm   && <EntreeForm onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} defaultMagasin={defaultMagasin} />}

      {editEntry  && <EntreeEditModal entry={editEntry} onClose={() => setEditEntry(null)} onSaved={() => setEditEntry(null)} />}

      <div className="tab-stats">
        {[
          { value: rows.length.toLocaleString('fr-FR'),     label: 'Lignes totales' },
          { value: filtered.length.toLocaleString('fr-FR'), label: 'Lignes filtrées' },
          { value: totalUnites.toLocaleString('fr-FR'),     label: 'Unités' },
          { value: totalPHT > 0
              ? totalPHT.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
              : '—',
            label: 'Valeur estimée' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="controls" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input
          type="text" placeholder="🔍 Marque, modèle…" value={search}
          onChange={e => { setSearch(e.target.value); resetPage() }}
          className="search-input"
        />
        <select value={societe} onChange={e => { setSociete(e.target.value); setMagasin(''); resetPage() }} className="sel">
          <option value="">Toutes les sociétés</option>
          {SOCIETES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={magasin} onChange={e => { setMagasin(e.target.value); resetPage() }} className="sel">
          <option value="">Tous les magasins</option>
          {magasinList.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={marque} onChange={e => { setMarque(e.target.value); resetPage() }} className="sel">
          <option value="">Toutes les marques</option>
          {marqueList.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={categorie} onChange={e => { setCategorie(e.target.value); resetPage() }} className="sel">
          <option value="">Toutes catégories</option>
          {categList.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statut} onChange={e => { setStatut(e.target.value); resetPage() }} className="sel">
          <option value="">Tous les statuts</option>
          {statutList.map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nouvelle entrée</button>
      </div>

      <div className="store-card" style={{ marginTop: 0, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Statut</th><th>Magasin</th><th>Date</th><th>Marque</th>
                <th>Modèle</th><th>N°</th><th>Catégorie</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>PHT livré</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  {rows.length === 0 ? 'Aucune entrée — cliquez sur "+ Nouvelle entrée".' : 'Aucun résultat.'}
                </td></tr>
              )}
              {paginated.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: 13, color: '#64748b' }}>{r.statut}</td>
                  <td>{r.magasin}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{r.date}</td>
                  <td><strong>{r.marque}</strong></td>
                  <td style={{ fontSize: 13 }}>{r.modele}</td>
                  <td style={{ fontSize: 12 }}>
                    {r.numero ? <span style={numeroColor(r.numero)}>{r.numero}</span> : '—'}
                  </td>
                  <td>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: 4, fontSize: 12 }}>
                      {r.categorie || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.total || '—'}</td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontSize: 13 }}>
                    {r.pht
                      ? r.pht.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td>
                    <button className="edit-btn" onClick={() => setEditEntry(r)} title="Modifier">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>

            {(() => {
              const btns = []
              for (let i = 1; i <= pages; i++) {
                if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
                  btns.push(i)
                } else if (btns[btns.length - 1] !== '…') {
                  btns.push('…')
                }
              }
              return btns.map((b, idx) =>
                b === '…'
                  ? <span key={`e${idx}`} style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>
                  : <button key={b} onClick={() => setPage(b)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid',
                      borderColor: b === page ? '#3b82f6' : '#e2e8f0',
                      background: b === page ? '#3b82f6' : '#fff',
                      color: b === page ? '#fff' : '#374151',
                      fontWeight: b === page ? 700 : 400,
                      cursor: 'pointer', fontSize: 13,
                    }}>{b}</button>
              )
            })()}

            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>→</button>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>({filtered.length} lignes)</span>
          </div>
        )}
      </div>
    </div>
  )
}

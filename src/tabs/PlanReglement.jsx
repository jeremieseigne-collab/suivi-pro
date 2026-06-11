import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import { useSeason } from '../context/SeasonContext'
import { SOCIETE_MAP, SOCIETES, getSociete } from '../data/societes'

// ─── Utilitaires dates ───────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null
  const parts = String(str).split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return isNaN(date.getTime()) ? null : date
}
function endOfMonth(date, monthsAhead = 0) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + monthsAhead + 1, 0)
  return d
}
function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
function fmtDate(date) { return date ? date.toLocaleDateString('fr-FR') : '' }
function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(key) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

// ─── Règles de paiement ──────────────────────────────────────────────────────
function echeancesCheque(fournisseur, magasin, reelTotal, firstDate) {
  if (!firstDate || !reelTotal) return []
  return [0, 1, 2, 3].map(i => ({
    date:        endOfMonth(firstDate, i),
    montant:     reelTotal / 4,
    info:        `Échéance ${i + 1}/4`,
    fournisseur, magasin, mode: 'CHEQUE',
    societe:     getSociete(magasin),
    source: `Commande totale (${reelTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})`,
  }))
}

function echeancesLivraison(fournisseur, magasin, montant, livraisonDate, mode) {
  if (!livraisonDate || !montant || montant <= 0) return []
  const e = (date, m, info) => ({ date, montant: m, info, fournisseur, magasin, mode, societe: getSociete(magasin), source: `Livraison du ${fmtDate(livraisonDate)}` })
  switch (mode) {
    case 'VIREMENT':    return [e(addDays(livraisonDate, 90), montant, '90 jours')]
    case 'LCR':         return [e(addDays(livraisonDate, 60), montant / 2, '60 jours (1/2)'), e(addDays(livraisonDate, 90), montant / 2, '90 jours (2/2)')]
    case 'GARANT':
    case 'GMS':         return [e(addDays(livraisonDate, 120), montant, '120 jours')]
    case 'PRELEVEMENT': return [e(addDays(livraisonDate, 30), montant, '30 jours')]
    default:            return []
  }
}

const MODE_COLORS = {
  CHEQUE:      { bg: '#dbeafe', color: '#1d4ed8' },
  VIREMENT:    { bg: '#d1fae5', color: '#065f46' },
  LCR:         { bg: '#fef3c7', color: '#92400e' },
  GARANT:      { bg: '#ede9fe', color: '#5b21b6' },
  PRELEVEMENT: { bg: '#fee2e2', color: '#991b1b' },
  GMS:         { bg: '#fce7f3', color: '#9d174d' },
}


export default function PlanReglement() {
  const { season } = useSeason()
  const [magasinFilter,  setMagasinFilter]  = useState('')
  const [modeFilter,     setModeFilter]     = useState('')
  const [societeFilter,  setSocieteFilter]  = useState('')
  const [marqueFilter,   setMarqueFilter]   = useState('')

  const data = useLiveQuery(async () => {
    const [params, entrees, magasins, fournisseurs, modesReglement] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.entrees.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
      db.modesReglement.toArray(),
    ])
    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    const modeByIdKey    = Object.fromEntries(modesReglement.map(m => [`${m.fournisseurId}_${m.magasinId}`, m.modeReglement || '']))

    const result = []

    // ── 1. CHEQUE : reelN ÷ 4, déclenché à la 1ère réception ──
    const firstReception = {}
    entrees.forEach(e => {
      const fNom = fournisseurMap[e.fournisseurId]
      const mNom = magasinMap[e.magasinId]
      if (!fNom || !mNom) return
      const date = parseDate(e.date)
      if (!date) return
      const key = fNom + mNom
      if (!firstReception[key] || date < firstReception[key]) firstReception[key] = date
    })

    params.forEach(p => {
      const mode = modeByIdKey[`${p.fournisseurId}_${p.magasinId}`]
      if (mode !== 'CHEQUE') return
      const fNom = fournisseurMap[p.fournisseurId]
      const mNom = magasinMap[p.magasinId]
      if (!fNom || !mNom || !p.reelN) return
      const firstDate = firstReception[fNom + mNom]
      result.push(...echeancesCheque(fNom, mNom, p.reelN, firstDate))
    })

    // ── 2. Autres modes : par livraison individuelle (pht + date) ──
    entrees.forEach(e => {
      const fNom = fournisseurMap[e.fournisseurId]
      const mNom = magasinMap[e.magasinId]
      if (!fNom || !mNom || !e.pht || !e.date) return
      const date = parseDate(e.date)
      if (!date) return

      const mode = modeByIdKey[`${e.fournisseurId}_${e.magasinId}`]
      if (!mode || mode === 'CHEQUE') return

      result.push(...echeancesLivraison(fNom, mNom, e.pht, date, mode))
    })

    return {
      echeances: result.sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date - b.date
      }),
      magasins: magasins.map(m => m.nom).sort(),
    }
  }, [season])

  const allEcheances = data?.echeances ?? []
  const magasins     = data?.magasins  ?? []

  const modes   = useMemo(() => [...new Set(allEcheances.map(e => e.mode).filter(Boolean))].sort(), [allEcheances])
  const marques = useMemo(() => [...new Set(allEcheances.map(e => e.fournisseur).filter(Boolean))].sort(), [allEcheances])

  const filtered = useMemo(() => allEcheances.filter(e => {
    if (societeFilter && e.societe    !== societeFilter) return false
    if (magasinFilter && e.magasin    !== magasinFilter) return false
    if (marqueFilter  && e.fournisseur !== marqueFilter) return false
    if (modeFilter    && e.mode        !== modeFilter)   return false
    return true
  }), [allEcheances, magasinFilter, modeFilter, societeFilter, marqueFilter])

  const withDate    = filtered.filter(e => e.date)
  const withoutDate = filtered.filter(e => !e.date)

  const byMonth = useMemo(() => {
    const groups = {}
    withDate.forEach(e => {
      const key = monthKey(e.date)
      if (!groups[key]) groups[key] = { total: 0, items: [] }
      groups[key].total += e.montant
      groups[key].items.push(e)
    })
    return groups
  }, [withDate])

  const totalGeneral = filtered.reduce((s, e) => s + e.montant, 0)
  const monthKeys    = Object.keys(byMonth).sort()
  const curKey       = monthKey(new Date())

  if (data === undefined) return <LoadingState />

  return (
    <div>
      {/* Stats */}
      <div className="tab-stats">
        <div className="stat-card">
          <span className="stat-value" style={{ fontSize: 16 }}>
            {totalGeneral.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </span>
          <span className="stat-label">Total à régler{magasinFilter ? ` · ${magasinFilter}` : ''}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{monthKeys.length}</span>
          <span className="stat-label">Mois d'échéances</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{withDate.length}</span>
          <span className="stat-label">Échéances planifiées</span>
        </div>
        {withoutDate.length > 0 && (
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#f59e0b' }}>{withoutDate.length}</span>
            <span className="stat-label">En attente 1ère réception</span>
          </div>
        )}
      </div>

      {/* Filtres + légende */}
      <div className="controls" style={{ marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <select value={societeFilter} onChange={e => { setSocieteFilter(e.target.value); setMagasinFilter('') }} className="sel">
          <option value="">Toutes les sociétés</option>
          {SOCIETES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={magasinFilter} onChange={e => setMagasinFilter(e.target.value)} className="sel">
          <option value="">Tous les magasins</option>
          {magasins.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={marqueFilter} onChange={e => setMarqueFilter(e.target.value)} className="sel">
          <option value="">Toutes les marques</option>
          {marques.map(m => <option key={m}>{m}</option>)}
        </select>
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="sel">
          <option value="">Tous les modes</option>
          {modes.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(MODE_COLORS).map(([mode, { bg, color }]) => (
          <span key={mode} style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {mode}
          </span>
        ))}
      </div>

      {monthKeys.length === 0 && withoutDate.length === 0 && (
        <div className="store-card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          Aucune échéance — configurez les modes de règlement dans <strong>Paramètres → Modes</strong> et saisissez des entrées.
        </div>
      )}

      {/* Mois par mois */}
      {monthKeys.map(key => {
        const { total, items } = byMonth[key]
        const [y, m]    = key.split('-')
        const today     = new Date()
        const monthDate = new Date(Number(y), Number(m) - 1, 1)
        const isPast    = monthDate < new Date(today.getFullYear(), today.getMonth(), 1)
        const isCurrent = key === curKey

        return (
          <div key={key} className="store-card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              background: isCurrent ? '#eff6ff' : isPast ? '#fef2f2' : '#f0fdf4',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: 18 }}>{isCurrent ? '📅' : isPast ? '⚠️' : '🗓'}</span>
              <span style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                {monthLabel(key)}
              </span>
              {isPast    && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>PASSÉ</span>}
              {isCurrent && <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, background: '#dbeafe', padding: '2px 6px', borderRadius: 4 }}>EN COURS</span>}
              <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 17 }}>
                {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Échéance</th><th>Magasin</th><th>Fournisseur</th>
                  <th>Mode</th><th>Détail</th><th>Source</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const bySociete = {}
                  items.forEach(e => {
                    const s = e.societe || e.magasin
                    if (!bySociete[s]) bySociete[s] = { total: 0, items: [] }
                    bySociete[s].total += e.montant
                    bySociete[s].items.push(e)
                  })
                  return Object.entries(bySociete).sort(([a], [b]) => a.localeCompare(b)).flatMap(([soc, grp]) => [
                    <tr key={`h-${soc}`} style={{ background: '#f1f5f9' }}>
                      <td colSpan={6} style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', padding: '7px 14px' }}>
                        🏢 {soc}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#1e3a5f', padding: '7px 14px' }}>
                        {grp.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </td>
                    </tr>,
                    ...grp.items.sort((a, b) => a.date - b.date).map((e, i) => {
                      const mc = MODE_COLORS[e.mode] || { bg: '#f1f5f9', color: '#475569' }
                      return (
                        <tr key={`${soc}-${i}`}>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtDate(e.date)}</td>
                          <td style={{ fontSize: 13 }}>{e.magasin}</td>
                          <td><strong>{e.fournisseur}</strong></td>
                          <td>
                            <span style={{ background: mc.bg, color: mc.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                              {e.mode}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, color: '#64748b' }}>{e.info}</td>
                          <td style={{ fontSize: 12, color: '#94a3b8' }}>{e.source}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {e.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      )
                    }),
                  ])
                })()}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* CHEQUE en attente */}
      {withoutDate.length > 0 && (
        <div className="store-card" style={{ padding: 0, overflow: 'hidden', opacity: 0.7 }}>
          <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⏳</span>
            <span style={{ fontWeight: 700 }}>En attente de 1ère réception ({withoutDate.length} échéances CHEQUE)</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Magasin</th><th>Fournisseur</th><th>Mode</th><th>Détail</th>
                <th style={{ textAlign: 'right' }}>Montant estimé</th>
              </tr>
            </thead>
            <tbody>
              {withoutDate.map((e, i) => {
                const mc = MODE_COLORS[e.mode] || { bg: '#f1f5f9', color: '#475569' }
                return (
                  <tr key={i}>
                    <td style={{ fontSize: 13 }}>{e.magasin}</td>
                    <td><strong>{e.fournisseur}</strong></td>
                    <td>
                      <span style={{ background: mc.bg, color: mc.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                        {e.mode}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{e.info}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {e.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

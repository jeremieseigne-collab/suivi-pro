import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import { useSeason } from '../context/SeasonContext'
import { SOCIETES, getSociete } from '../data/societes'
import { DEFAULT_NB_CHEQUE, DEFAULT_DELAIS } from '../data/reglement'

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

// ─── Règles de paiement ───────────────────────────────────────────────────────
// CHEQUE : montant ÷ nb, sur nb fins de mois successives (à partir de la 1ère réception)
function echeancesCheque(fournisseur, magasin, reelTotal, firstDate, nb, keyBase) {
  if (!firstDate || !reelTotal || !nb) return []
  return Array.from({ length: nb }, (_, i) => ({
    date:        endOfMonth(firstDate, i),
    montant:     reelTotal / nb,
    info:        `Échéance ${i + 1}/${nb}`,
    fournisseur, magasin, mode: 'CHEQUE',
    societe:     getSociete(magasin),
    source: `Commande totale (${reelTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})`,
    key: `${keyBase}|${i}`,
  }))
}

// CHEQUE personnalisé : liste de chèques { date, montant } saisie par saison (Paramètres → Modes de règlement)
function echeancesChequeCustom(fournisseur, magasin, cheques, keyBase) {
  return cheques.map((c, i) => {
    const date = parseDate(c.date)
    const montant = Number(c.montant)
    if (!date || !montant) return null
    return {
      date, montant,
      info: `Chèque ${i + 1}/${cheques.length}`,
      fournisseur, magasin, mode: 'CHEQUE',
      societe: getSociete(magasin),
      source: 'Plan chèque personnalisé',
      key: `${keyBase}|${i}`,
    }
  }).filter(Boolean)
}

// Autres modes : montant réparti à parts égales sur la liste de délais (jours après livraison)
function echeancesLivraison(fournisseur, magasin, montant, livraisonDate, mode, delais, keyBase) {
  if (!livraisonDate || !montant || montant <= 0 || !delais || !delais.length) return []
  const n = delais.length
  return delais.map((d, i) => ({
    date:    addDays(livraisonDate, d),
    montant: montant / n,
    info:    d === 0 ? 'Jour de livraison' : (n > 1 ? `${d} jours (${i + 1}/${n})` : `${d} jours`),
    fournisseur, magasin, mode, societe: getSociete(magasin),
    source:  `Livraison du ${fmtDate(livraisonDate)}`,
    key: `${keyBase}|${i}`,
  }))
}

const MODE_COLORS = {
  CHEQUE:      { bg: '#dbeafe', color: '#1d4ed8' },
  VIREMENT:    { bg: '#d1fae5', color: '#065f46' },
  LCR:         { bg: '#fef3c7', color: '#92400e' },
  GARANT:      { bg: '#ede9fe', color: '#5b21b6' },
  PRELEVEMENT: { bg: '#fee2e2', color: '#991b1b' },
  GMS:         { bg: '#fce7f3', color: '#9d174d' },
  AVOIR:       { bg: '#ccfbf1', color: '#0f766e' },
}

function eur(n) { return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) }
function dateKey(d) { return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '' }
function ModeBadge({ mode }) {
  const mc = MODE_COLORS[mode] || { bg: '#f1f5f9', color: '#475569' }
  return <span style={{ background: mc.bg, color: mc.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{mode}</span>
}

function isoStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Date limite d'une saison : Été YYYY → 30/08/YYYY ; Hiver YYYY → dernier jour de février YYYY+1
function seasonDeadline(seasonId) {
  const mt = /^(.+)_(\d{4})$/.exec(seasonId || '')
  if (!mt) return null
  const type = mt[1], year = parseInt(mt[2])
  if (type === 'ETE')   return new Date(year, 7, 30)      // 30 août
  if (type === 'HIVER') return new Date(year + 1, 2, 0)   // dernier jour de février (28/29) de l'année suivante
  return null
}


export default function PlanReglement() {
  const { season, seasons } = useSeason()
  const [magasinFilter,  setMagasinFilter]  = useState('')
  const [modeFilter,     setModeFilter]     = useState('')
  const [societeFilter,  setSocieteFilter]  = useState('')
  const [marqueFilter,   setMarqueFilter]   = useState('')
  const [expanded,       setExpanded]       = useState(() => new Set())
  const [reportDismiss,  setReportDismiss]  = useState(false)

  const data = useLiveQuery(async () => {
    const [params, entrees, magasins, fournisseurs, modesReglement, defectueux, pointages] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.entrees.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
      db.modesReglement.toArray(),
      db.defectueux.toArray(),
      db.reglementPaye.toArray(),
    ])
    const magasinMap      = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurById = Object.fromEntries(fournisseurs.map(f => [f.id, f]))
    const regleByKey      = Object.fromEntries(modesReglement.map(m => [`${m.fournisseurId}_${m.magasinId}`, { mode: m.modeReglement || '', cond: m.condition || {} }]))

    // Regroupement par « vrai fournisseur » : clé = fournisseurs.groupe (si renseigné) sinon nom de la marque.
    // La marque PILOTE (plus petit id du groupe) porte la config de règlement et son plan chèque éventuel.
    const groupKeyOf = fId => { const f = fournisseurById[fId]; return f ? (((f.groupe || '').trim()) || f.nom) : null }
    const canonicalId = {}
    fournisseurs.forEach(f => {
      const k = ((f.groupe || '').trim()) || f.nom
      if (canonicalId[k] == null || f.id < canonicalId[k]) canonicalId[k] = f.id
    })
    const regleForGroup = (gk, magasinId) => regleByKey[`${canonicalId[gk]}_${magasinId}`]

    // statut du défectueux par entrée liée (pour ne compter l'avoir qu'une fois confirmé)
    const defStatutByEntree = {}
    defectueux.forEach(d => { if (d.entreeId) defStatutByEntree[d.entreeId] = d.statut })

    const result = []

    // ── 1. CHEQUE par (fournisseur × magasin) : Σ reelN du groupe ÷ N, 1ère réception la plus ancienne ──
    const firstRecepGM = {}   // `${gk}|${magasinId}` -> Date la plus ancienne
    entrees.forEach(e => {
      if (e.statut === 'Retour') return
      const gk = groupKeyOf(e.fournisseurId)
      if (!gk || !magasinMap[e.magasinId]) return
      const date = parseDate(e.date)
      if (!date) return
      const kk = `${gk}|${e.magasinId}`
      if (!firstRecepGM[kk] || date < firstRecepGM[kk]) firstRecepGM[kk] = date
    })
    const reelByGM = {}        // `${gk}|${magasinId}` -> Σ reelN
    const chequesByGM = {}     // `${gk}|${magasinId}` -> plan chèque perso (de la pilote)
    params.forEach(p => {
      const gk = groupKeyOf(p.fournisseurId)
      if (!gk) return
      const kk = `${gk}|${p.magasinId}`
      if (p.reelN) reelByGM[kk] = (reelByGM[kk] || 0) + p.reelN
      if (Array.isArray(p.cheques) && p.cheques.length && p.fournisseurId === canonicalId[gk]) chequesByGM[kk] = p.cheques
    })
    // Une série de chèques par (groupe × magasin) dont la règle pilote est CHEQUE
    const seenGM = new Set()
    fournisseurs.forEach(f => {
      const gk = ((f.groupe || '').trim()) || f.nom
      magasins.forEach(m => {
        const kk = `${gk}|${m.id}`
        if (seenGM.has(kk)) return
        seenGM.add(kk)
        const regle = regleForGroup(gk, m.id)
        if (!regle || regle.mode !== 'CHEQUE') return
        const keyBase = `cheque|${canonicalId[gk]}|${m.id}|${season}`
        const cheques = chequesByGM[kk]
        if (Array.isArray(cheques) && cheques.length) {
          result.push(...echeancesChequeCustom(gk, m.nom, cheques, keyBase))
        } else if (reelByGM[kk]) {
          const nb = parseInt(regle.cond.nb) || DEFAULT_NB_CHEQUE
          result.push(...echeancesCheque(gk, m.nom, reelByGM[kk], firstRecepGM[kk], nb, keyBase))
        }
      })
    })

    // ── 2. Autres modes : par livraison individuelle (pht + date), règle du fournisseur ──
    entrees.forEach(e => {
      if (e.statut === 'Retour') return // traité séparément comme avoir
      const gk = groupKeyOf(e.fournisseurId)
      const mNom = magasinMap[e.magasinId]
      if (!gk || !mNom || !e.pht || !e.date) return
      const date = parseDate(e.date)
      if (!date) return

      const regle = regleForGroup(gk, e.magasinId)
      const mode = regle?.mode
      if (!mode || mode === 'CHEQUE') return
      const delais = (Array.isArray(regle.cond.delais) && regle.cond.delais.length) ? regle.cond.delais : (DEFAULT_DELAIS[mode] || [])

      result.push(...echeancesLivraison(gk, mNom, e.pht, date, mode, delais, `liv|${e.id}`))
    })

    // ── 3. Avoirs (retours/défectueux) : une échéance unique à la date du retour, sans règle.
    //    Affiché seulement si le défectueux lié est « Avoir reçu » ou « Clôturé ». ──
    entrees.forEach(e => {
      if (e.statut !== 'Retour') return
      if (!['Avoir reçu', 'Clôturé'].includes(defStatutByEntree[e.id])) return
      const gk = groupKeyOf(e.fournisseurId)
      const mNom = magasinMap[e.magasinId]
      if (!gk || !mNom || !e.pht || !e.date) return
      const date = parseDate(e.date)
      if (!date) return
      result.push({
        date, montant: e.pht, info: 'Avoir', mode: 'AVOIR',
        fournisseur: gk, magasin: mNom, societe: getSociete(mNom),
        source: `Retour${e.modele ? ' ' + e.modele : ''}`,
        key: `avoir|${e.id}`,
        entreeId: e.id,
      })
    })

    // Pointage : marque chaque échéance payée ou non (via sa clé stable)
    const paidSet = new Set(pointages.map(p => p.cle))
    result.forEach(e => { e.paye = paidSet.has(e.key) })

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
  const totalPaye    = filtered.filter(e => e.paye).reduce((s, e) => s + e.montant, 0)
  const totalReste   = totalGeneral - totalPaye
  const monthKeys    = Object.keys(byMonth).sort()
  const curKey       = monthKey(new Date())

  async function togglePaye(e) {
    try {
      if (e.paye) await db.reglementPaye.where('cle').equals(e.key).delete()
      else        await db.reglementPaye.add({ cle: e.key })
    } catch (err) { alert('Erreur : ' + (err.message || err)) }
  }

  // Avoirs non pointés d'une saison terminée → proposer de les reporter sur la saison suivante
  const deadline       = seasonDeadline(season)
  const deadlinePassed = deadline ? isoStr(new Date()) > isoStr(deadline) : false
  const unpaidAvoirs   = allEcheances.filter(e => e.mode === 'AVOIR' && !e.paye)
  const curIdx         = seasons.findIndex(s => s.id === season)
  const nextSeason     = (curIdx >= 0 && curIdx < seasons.length - 1) ? seasons[curIdx + 1] : null
  const curSeasonLabel = seasons.find(s => s.id === season)?.label || season
  const showReport     = deadlinePassed && unpaidAvoirs.length > 0 && !reportDismiss

  async function reportAvoirs() {
    if (!nextSeason) return
    try {
      for (const a of unpaidAvoirs) if (a.entreeId) await db.entrees.update(a.entreeId, { season: nextSeason.id })
    } catch (err) { alert('Erreur : ' + (err.message || err)) }
    setReportDismiss(true)
  }

  async function setPaye(items, makePaid) {
    try {
      for (const e of items) {
        if (makePaid && !e.paye)      await db.reglementPaye.add({ cle: e.key })
        else if (!makePaid && e.paye) await db.reglementPaye.where('cle').equals(e.key).delete()
      }
    } catch (err) { alert('Erreur : ' + (err.message || err)) }
  }

  function toggleExpand(k) {
    setExpanded(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  }

  // Ligne d'échéance individuelle (utilisée seule ou en détail d'un groupe)
  function echeanceRow(e, rowKey, detail = false) {
    return (
      <tr key={rowKey} style={{ opacity: e.paye ? 0.5 : 1 }}>
        <td style={{ textAlign: 'center' }}>
          <input type="checkbox" checked={!!e.paye} onChange={() => togglePaye(e)}
            title={e.paye ? 'Payé — décocher' : 'Marquer comme payé'} style={{ width: 16, height: 16, cursor: 'pointer' }} />
        </td>
        <td style={{ whiteSpace: 'nowrap', fontWeight: 600, paddingLeft: detail ? 30 : undefined, color: detail ? 'var(--text-3)' : undefined }}>{fmtDate(e.date)}</td>
        <td style={{ fontSize: 13 }}>{e.magasin}</td>
        <td>{detail ? <span style={{ color: 'var(--text-3)' }}>{e.fournisseur}</span> : <strong>{e.fournisseur}</strong>}</td>
        <td><ModeBadge mode={e.mode} /></td>
        <td style={{ fontSize: 13, color: '#64748b' }}>{e.info}</td>
        <td style={{ fontSize: 12, color: '#94a3b8' }}>{e.source}</td>
        <td style={{ textAlign: 'right', fontWeight: 600, textDecoration: e.paye ? 'line-through' : 'none' }}>{eur(e.montant)}</td>
      </tr>
    )
  }

  if (data === undefined) return <LoadingState />

  return (
    <div>
      {showReport && (
        <div className="modal-overlay" onClick={() => setReportDismiss(true)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⏳ Avoirs à reporter</h2>
              <button className="modal-close" onClick={() => setReportDismiss(true)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                La saison <strong>{curSeasonLabel}</strong> est terminée et {unpaidAvoirs.length} avoir{unpaidAvoirs.length > 1 ? 's' : ''} n'{unpaidAvoirs.length > 1 ? 'ont' : 'a'} pas été pointé{unpaidAvoirs.length > 1 ? 's' : ''}. Les reporter sur la saison suivante ?
              </p>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {unpaidAvoirs.map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 12px', borderBottom: '1px solid var(--surface-3)', fontSize: 13 }}>
                    <span><strong>{a.fournisseur}</strong> · {a.magasin} <span style={{ color: 'var(--text-4)' }}>({fmtDate(a.date)})</span></span>
                    <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{eur(a.montant)}</span>
                  </div>
                ))}
              </div>
              {!nextSeason && <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>⚠️ Aucune saison suivante n'existe — crée-la d'abord (sélecteur de saison).</p>}
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setReportDismiss(true)}>Plus tard</button>
                <button className="btn-primary" disabled={!nextSeason} onClick={reportAvoirs}>
                  {nextSeason ? `Reporter sur ${nextSeason.label}` : 'Aucune saison suivante'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="tab-stats">
        <div className="stat-card">
          <span className="stat-value" style={{ fontSize: 16 }}>
            {totalGeneral.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </span>
          <span className="stat-label">Total à régler{magasinFilter ? ` · ${magasinFilter}` : ''}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ fontSize: 16, color: totalReste > 0.5 ? '#dc2626' : '#059669' }}>
            {totalReste.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </span>
          <span className="stat-label">Reste à payer</span>
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
                  <th style={{ width: 38, textAlign: 'center' }}>Payé</th>
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
                  return Object.entries(bySociete).sort(([a], [b]) => a.localeCompare(b)).flatMap(([soc, grp]) => {
                    const out = [
                      <tr key={`h-${soc}`} style={{ background: '#f1f5f9' }}>
                        <td colSpan={7} style={{ fontWeight: 700, fontSize: 13, color: '#1e3a5f', padding: '7px 14px' }}>🏢 {soc}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#1e3a5f', padding: '7px 14px' }}>{eur(grp.total)}</td>
                      </tr>,
                    ]
                    // Regroupe par fournisseur + même date
                    const groups = {}
                    grp.items.forEach(e => {
                      const gk = `${e.fournisseur}|${dateKey(e.date)}`
                      if (!groups[gk]) groups[gk] = { items: [], total: 0, fournisseur: e.fournisseur, date: e.date }
                      groups[gk].items.push(e); groups[gk].total += e.montant
                    })
                    Object.values(groups)
                      .sort((a, b) => a.date - b.date || a.fournisseur.localeCompare(b.fournisseur))
                      .forEach(g => {
                        if (g.items.length === 1) { out.push(echeanceRow(g.items[0], `${soc}-${g.fournisseur}-${dateKey(g.date)}`)); return }
                        const gkey = `${key}|${soc}|${g.fournisseur}|${dateKey(g.date)}`
                        const allPaid  = g.items.every(x => x.paye)
                        const somePaid = g.items.some(x => x.paye)
                        const isOpen   = expanded.has(gkey)
                        const mags = [...new Set(g.items.map(x => x.magasin))]
                        const mods = [...new Set(g.items.map(x => x.mode))]
                        out.push(
                          <tr key={gkey} style={{ opacity: allPaid ? 0.5 : 1, cursor: 'pointer', background: 'var(--surface-2)' }} onClick={() => toggleExpand(gkey)}>
                            <td style={{ textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                              <input type="checkbox" checked={allPaid} ref={el => { if (el) el.indeterminate = somePaid && !allPaid }}
                                onChange={() => setPaye(g.items, !allPaid)} title="Tout cocher / décocher" style={{ width: 16, height: 16, cursor: 'pointer' }} />
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                              <span style={{ display: 'inline-block', width: 14, color: 'var(--text-4)', fontSize: 11 }}>{isOpen ? '▾' : '▸'}</span>{fmtDate(g.date)}
                            </td>
                            <td style={{ fontSize: 13 }}>{mags.length === 1 ? mags[0] : `${mags.length} magasins`}</td>
                            <td><strong>{g.fournisseur}</strong></td>
                            <td>{mods.length === 1 ? <ModeBadge mode={mods[0]} /> : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>plusieurs</span>}</td>
                            <td style={{ fontSize: 13, color: '#64748b' }}>{g.items.length} échéances</td>
                            <td style={{ fontSize: 12, color: '#94a3b8' }}>{g.items.filter(x => x.paye).length}/{g.items.length} payé</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, textDecoration: allPaid ? 'line-through' : 'none' }}>{eur(g.total)}</td>
                          </tr>
                        )
                        if (isOpen) g.items.slice().sort((a, b) => a.date - b.date).forEach((e, i) => out.push(echeanceRow(e, `${gkey}-d${i}`, true)))
                      })
                    return out
                  })
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

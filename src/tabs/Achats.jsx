import { useState, useMemo, Fragment } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import Icone from '../components/ui/Icone'
import AchatEditModal from '../components/AchatEditModal'
import AchatAddModal  from '../components/AchatAddModal'
import AchatImportModal from '../components/AchatImportModal'
import { useSeason } from '../context/SeasonContext'
import { SOCIETES, getSociete } from '../data/societes'
import { useMediaQuery, PHONE } from '../lib/useMediaQuery'
import { suivieParCommandes } from '../fournisseurs/csvPolaris'
import { commandesDeSaison } from '../fournisseurs/donnees'
import '../achats/achats.css'

const STRAT_COLORS = {
  '🆕 NOUVEAU':   '#ede9fe',
  '🚀 BOOSTER':   '#dbeafe',
  '🛡️ MAINTENIR': '#d1fae5',
  '📉 RÉDUIRE':   '#fef3c7',
  '🛑 ARRÊTER':   '#fee2e2',
}

const UNIVERS = ['Femme', 'Homme', 'Enfant', 'Accessoire']
const UNIV_COLORS = { Femme: '#ec4899', Homme: '#3b82f6', Enfant: '#10b981', Accessoire: '#f59e0b' }
const eur = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const ecartTexte = n => Math.abs(n) < 0.5 ? '0 €' : (n > 0 ? '+' : '−') + eur(Math.abs(n))

// Montants affichés pour une ligne : total marque, ou ceux de l'univers filtré
function rowAmounts(r, univ) {
  if (!univ) return { reel: r.reelN || 0, qte: r.quantite || 0, pm: r.pm || 0 }
  const x = (r.univers && r.univers[univ]) || {}
  const reel = Number(x.prix) || 0, qte = Number(x.qte) || 0
  return { reel, qte, pm: qte > 0 ? reel / qte : 0 }
}
function rowHasUniv(r, univ) { const x = r.univers && r.univers[univ]; return (Number(x?.prix) || 0) > 0 || (Number(x?.qte) || 0) > 0 }

function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort() }

// "ETE_2026" → { type:'ETE', year:2026 } ; "HIVER_2027" → { type:'HIVER', year:2027 }
function parseSeasonId(id) {
  const m = /^(.+)_(\d{4})$/.exec(id || '')
  return m ? { type: m[1], year: parseInt(m[2]) } : null
}

// Saisons suivies par commandes : commandé net (commandé − annulé, au prix d'achat) et reçu des commandes de saison,
// par marque × magasin. Les réassorts restent hors du réel achat (décision 6), donc hors de cette comparaison.
function suiviCommandes(commandes, entrees) {
  const parCle = {}
  const saison = commandes.filter(c => c.type !== 'reassort')
  const ids = new Set(saison.map(c => c.id))
  for (const c of saison) {
    const k = c.fournisseur_id + '_' + c.magasin_id
    const x = parCle[k] ??= { netEur: 0, netQte: 0, recuEur: 0, recuQte: 0, statuts: [], annulee: 0, fournisseurId: c.fournisseur_id, magasinId: c.magasin_id }
    x.netEur += Number(c.montant_net) || 0
    x.netQte += (Number(c.qte_commandee) || 0) - (Number(c.qte_annulee) || 0)
    x.annulee += Number(c.qte_annulee) || 0
    x.statuts.push(c.statut)
  }
  for (const e of entrees) {
    if (!ids.has(e.commandeId)) continue
    const x = parCle[e.fournisseurId + '_' + e.magasinId]
    if (x) { x.recuEur += Number(e.pht) || 0; x.recuQte += Number(e.total) || 0 }
  }
  for (const x of Object.values(parCle)) {
    x.statut = x.statuts.every(s => s === 'Reçue en totalité') ? (x.annulee > 0 ? 'Reçue, reliquat annulé' : 'Reçue en totalité')
      : x.statuts.some(s => s !== 'Commandée') ? 'Partiellement reçue' : 'Commandée'
  }
  return parCle
}
const CLASSE_STATUT = { 'Commandée': '', 'Partiellement reçue': 'info', 'Reçue en totalité': 'ok', 'Reçue, reliquat annulé': 'ok' }

export default function Achats() {
  const { season, seasons } = useSeason()
  const telephone = useMediaQuery(PHONE)
  const suivie = suivieParCommandes(season)
  const statutDeduit = suivie   // saisons suivies par commandes : statut déduit des commandes (accord du 15/10)
  const [search,    setSearch]    = useState('')
  const [societe,   setSociete]   = useState('')
  const [magasin,   setMagasin]   = useState('')
  const [strategie, setStrategie] = useState('')
  const [editRow,   setEditRow]   = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [expanded,   setExpanded]   = useState(() => new Set())
  const [univFilter, setUnivFilter] = useState('')
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
    const [params, magasins, fournisseurs, commandes, entrees] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
      suivieParCommandes(season) ? commandesDeSaison(season) : [],
      suivieParCommandes(season) ? db.entrees.where('season').equals(season).toArray() : [],
    ])
    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    const nommer = p => ({ ...p, magasin: magasinMap[p.magasinId] || '', fournisseur: fournisseurMap[p.fournisseurId] || '', societe: getSociete(magasinMap[p.magasinId] || '') })
    const suivi = suiviCommandes(commandes, entrees)
    const lignes = params.filter(p => p.fournisseurId && p.magasinId).map(p => ({ ...nommer(p), cmd: suivi[p.fournisseurId + '_' + p.magasinId] || null }))
    // Marques commandées sans ligne d'achat dans la saison (réel achat à saisir)
    const vues = new Set(lignes.map(r => r.fournisseurId + '_' + r.magasinId))
    const sansLigne = Object.values(suivi).filter(x => !vues.has(x.fournisseurId + '_' + x.magasinId))
      .map(x => ({ ...nommer({ id: 'c' + x.fournisseurId + '_' + x.magasinId, fournisseurId: x.fournisseurId, magasinId: x.magasinId, season }), cmd: x, sansLigne: true }))
    return { lignes, sansLigne }
  }, [season])

  // Marques commandées sans ligne d'achat affichées avec leur commandé net (accord du 15/10)
  const rows = useMemo(() => !data ? [] : [...data.lignes, ...data.sansLigne], [data])

  // Lignes filtrées par société/magasin/stratégie/recherche (sans le filtre catégorie)
  const baseRows = useMemo(() => rows.filter(r => {
    if (societe   && r.societe   !== societe)    return false
    if (magasin   && r.magasin   !== magasin)    return false
    if (strategie && r.strategie !== strategie)  return false
    if (search && !r.fournisseur.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => a.fournisseur.localeCompare(b.fournisseur, 'fr')), [rows, search, societe, magasin, strategie])

  const filtered = useMemo(() => univFilter ? baseRows.filter(r => rowHasUniv(r, univFilter)) : baseRows, [baseRows, univFilter])

  // Totaux par catégorie (sur les lignes filtrées hors catégorie) — pour les pastilles
  const univTotals = useMemo(() => {
    const t = Object.fromEntries(UNIVERS.map(k => [k, { reel: 0, qte: 0, count: 0 }]))
    baseRows.forEach(r => UNIVERS.forEach(k => { const a = rowAmounts(r, k); if (a.reel || a.qte) { t[k].reel += a.reel; t[k].qte += a.qte; t[k].count++ } }))
    return t
  }, [baseRows])

  const magasinList  = useMemo(() => uniq(rows.map(r => r.magasin)),   [rows])
  const strategies   = useMemo(() => uniq(rows.map(r => r.strategie)), [rows])
  const totalRecuN1  = filtered.reduce((s, r) => s + (r.recuN1  || 0), 0)
  const totalObjectif = filtered.reduce((s, r) => s + (r.objectifN || 0), 0)
  const totalReel    = filtered.reduce((s, r) => s + rowAmounts(r, univFilter).reel, 0)
  const totalQte     = filtered.reduce((s, r) => s + rowAmounts(r, univFilter).qte, 0)
  const totalNet     = filtered.reduce((s, r) => s + (r.cmd?.netEur || 0), 0)
  const totalNetQte  = filtered.reduce((s, r) => s + (r.cmd?.netQte || 0), 0)
  const totalRecu    = filtered.reduce((s, r) => s + (r.cmd?.recuEur || 0), 0)
  const totalRecuQte = filtered.reduce((s, r) => s + (r.cmd?.recuQte || 0), 0)
  const totalEcart   = filtered.reduce((s, r) => s + (r.cmd ? (r.reelN || 0) - r.cmd.netEur : 0), 0)

  if (data === undefined) return <LoadingState />

  const flou = (masque, px = 6) => masque ? { filter: `blur(${px}px)`, userSelect: 'none' } : undefined
  const basculer = r => { setExpanded(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n }); setSelected(r.fournisseur) }
  // Ligne d'une marque commandée sans ligne d'achat : la ligne d'achat est créée vide, puis la fiche s'ouvre
  async function modifier(r) {
    if (!r.sansLigne) return setEditRow(r)
    const id = await db.parametres.add({ fournisseurId: r.fournisseurId, magasinId: r.magasinId, season })
    setEditRow({ ...r, id, sansLigne: false })
  }
  const statutDe = r => statutDeduit
    ? (r.cmd ? <span className={`etat-mot ${CLASSE_STATUT[r.cmd.statut] ?? ''}`}>{r.cmd.statut}</span> : <span className="etat-mot discret">Sans commande</span>)
    : r.statut
  const ecartDe = r => !r.cmd || univFilter ? null : (r.reelN || 0) - r.cmd.netEur

  const detailUnivers = r => {
    const u = r.univers
    const hasU = u && UNIVERS.some(k => (Number(u[k]?.prix) || 0) || (Number(u[k]?.qte) || 0))
    return <>
      {hasU ? (
        <table className="achats-univers">
          <thead><tr><th>Univers</th><th>Prix</th><th>Quantité</th><th>PM</th></tr></thead>
          <tbody>
            {UNIVERS.map(k => {
              const x = u[k] || {}; const p = Number(x.prix) || 0, q = Number(x.qte) || 0
              if (!p && !q) return null
              return <tr key={k}><td>{k}</td><td>{eur(p)}</td><td>{q}</td><td className="doux">{q > 0 ? eur2(p / q) : '—'}</td></tr>
            })}
          </tbody>
        </table>
      ) : <span className="doux">{r.sansLigne ? 'Marque commandée sans ligne d\'achat pour ce magasin : saisis le réel achat avec le crayon.' : 'Aucun détail par univers — saisis-le avec le crayon (Réel achat par univers).'}</span>}
      {r.cmd && <div className="achats-cmd-detail">
        Commandé net <b>{eur(r.cmd.netEur)}</b> · {r.cmd.netQte} paire{r.cmd.netQte > 1 ? 's' : ''} — reçu <b>{eur(r.cmd.recuEur)}</b> · {r.cmd.recuQte} paire{r.cmd.recuQte > 1 ? 's' : ''}
        {r.cmd.netEur > 0 && <> ({Math.round(r.cmd.recuEur / r.cmd.netEur * 100)} %)</>}
      </div>}
    </>
  }

  const chiffres = [
    { value: eur(totalRecuN1), label: `Total Reçu N-1${magasin ? ` · ${magasin}` : ''}` },
    { value: eur(totalObjectif), label: `Total Objectif N${magasin ? ` · ${magasin}` : ''}` },
    { value: eur(totalReel), label: `Total Réel N${univFilter ? ` · ${univFilter}` : ''}${magasin ? ` · ${magasin}` : ''}` },
    { value: filtered.length, label: 'Fournisseurs', clair: true },
    ...(suivie ? [
      { value: eur(totalNet), label: `Commandé net · ${totalNetQte} paires` },
      { value: eur(totalRecu), label: `Reçu sur commandes · ${totalRecuQte} paires` },
      { value: univFilter ? '—' : ecartTexte(totalEcart), label: 'Écart réel − commandé (indicatif)', classe: !univFilter && Math.abs(totalEcart) >= 0.5 ? 'orange' : '' },
    ] : []),
  ]

  return (
    <div className="achats">
      {editRow  && <AchatEditModal row={editRow} sansStatut={statutDeduit} onClose={() => setEditRow(null)} onSaved={() => setEditRow(null)} />}
      {showAdd  && <AchatAddModal sansStatut={statutDeduit} onClose={() => setShowAdd(false)} onSaved={() => setShowAdd(false)} />}
      {showImport && <AchatImportModal season={season} onClose={() => setShowImport(false)} onDone={() => setShowImport(false)} />}

      <div className="achats-haut">
        <div className="achats-chiffres">
          {chiffres.map(s => (
            <div key={s.label} className="carte">
              <b className={s.classe} style={flou(ghost && !s.clair, 8)}>{s.value}</b><span>{s.label}</span>
            </div>
          ))}
        </div>
        <button className="chip" aria-pressed={ghost} onClick={() => setGhost(g => !g)} title={ghost ? 'Afficher les données' : 'Mode discret'}>
          {ghost ? 'Afficher les montants' : 'Masquer les montants'}
        </button>
      </div>
      {suivie && <p className="aide achats-explication">Saison suivie par commandes : <b>commandé net</b> = commandes de saison importées, commandé − annulé, au prix d'achat ; <b>reçu</b> = réceptions rattachées à ces commandes ; l'<b>écart</b> compare le réel achat saisi au commandé net, à titre indicatif (le Plan de règlement reste calculé sur le réel achat). Réassorts non compris.</p>}

      {/* Report des marques depuis la saison précédente (même type) */}
      {data.lignes.length === 0 && prevSeason && (prevCombos?.length > 0) && (
        <div className="carte achats-report">
          <div>
            <div className="t1">Reporter les marques de {prevSeason.label} ?</div>
            <div className="aide">{prevCombos.length} ligne{prevCombos.length > 1 ? 's' : ''} (fournisseur × magasin) — créées <strong>vides</strong>, à compléter (objectif, réel, quantité…).</div>
          </div>
          <button className="btn btn-prim" onClick={importBrands} disabled={importing}>
            {importing ? 'Import…' : `Importer ${prevCombos.length} ligne${prevCombos.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Stratégies */}
      {strategies.length > 0 && <div className="chips achats-strategies">
        {strategies.map(s => (
          <button key={s} className="chip strat" aria-pressed={strategie === s} onClick={() => setStrategie(strategie === s ? '' : s)} style={{ background: STRAT_COLORS[s] || '#f1f5f9' }}>
            {s} <strong>({rows.filter(r => r.strategie === s).length})</strong>
          </button>
        ))}
      </div>}

      {/* Filtre par catégorie (univers) */}
      <div className="chips achats-univ">
        <span className="etiquette">Catégorie</span>
        {UNIVERS.map(u => {
          const on = univFilter === u, tot = univTotals[u]
          return (
            <button key={u} className="chip" aria-pressed={on} onClick={() => setUnivFilter(on ? '' : u)} title={`${tot.count} marque(s)`}>
              {u} <strong style={flou(ghost)}>{eur(tot.reel)}</strong> <span className="doux">· {tot.qte} art.</span>
            </button>
          )
        })}
        {univFilter && <span className="aide">→ Réel / Quantité / PM affichés pour <strong>{univFilter}</strong></span>}
      </div>

      {/* Répartition en % du réel achat par catégorie */}
      {(() => {
        const totReel = UNIVERS.reduce((s, k) => s + univTotals[k].reel, 0)
        const totQte  = UNIVERS.reduce((s, k) => s + univTotals[k].qte, 0)
        if (!totReel && !totQte) return null
        return (
          <div className="achats-repartition">
            <div className="etiquette">Répartition du réel achat</div>
            <div className="barre">
              {UNIVERS.map(k => {
                const pct = totReel ? (univTotals[k].reel / totReel * 100) : 0
                if (pct <= 0) return null
                return <div key={k} title={`${k} : ${eur(univTotals[k].reel)} · ${univTotals[k].qte} art. (${pct.toFixed(1)}%)`} style={{ width: `${pct}%`, background: UNIV_COLORS[k] }}>{pct >= 8 ? `${Math.round(pct)}%` : ''}</div>
              })}
            </div>
            <div className="legende">
              {UNIVERS.map(k => {
                const pctR = totReel ? (univTotals[k].reel / totReel * 100) : 0
                const pctQ = totQte ? (univTotals[k].qte / totQte * 100) : 0
                return <span key={k}><i style={{ background: UNIV_COLORS[k] }} />{k} <strong>{pctR.toFixed(0)}%</strong> <span className="discret">· {pctQ.toFixed(0)}% des qté</span></span>
              })}
            </div>
          </div>
        )
      })()}

      <div className="achats-filtres">
        <input type="search" className="champ" placeholder="Fournisseur…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher un fournisseur" />
        <select className="champ" value={societe} onChange={e => { setSociete(e.target.value); setMagasin('') }} aria-label="Société">
          <option value="">Toutes les sociétés</option>
          {SOCIETES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="champ" value={magasin} onChange={e => setMagasin(e.target.value)} aria-label="Magasin">
          <option value="">Tous les magasins</option>
          {magasinList.map(m => <option key={m}>{m}</option>)}
        </select>
        <div className="achats-boutons">
          <button className="btn btn-prim" onClick={() => setShowAdd(true)}><Icone nom="ajout" taille={18} />Nouveau fournisseur</button>
          <button className="btn" onClick={() => setShowImport(true)} title="Importer les achats depuis un fichier CSV">Importer CSV</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="carte vide">{rows.length === 0 ? 'Aucun fournisseur — touche « Nouveau fournisseur ».' : 'Aucun résultat.'}</div>
      ) : telephone ? (
        <div className="carte achats-lignes">
          {filtered.map(r => {
            const masque = ghost && r.fournisseur !== selected, amt = rowAmounts(r, univFilter), ec = ecartDe(r)
            return (
              <Fragment key={r.id}>
                <div className={`achats-ligne${r.fournisseur === selected ? ' choisie' : ''}`} onClick={() => basculer(r)}>
                  <div className="txt">
                    <div className="t1"><span className="chevron">{expanded.has(r.id) ? '▾' : '▸'}</span><b>{r.fournisseur}</b><span className="montant" style={flou(masque)}>{amt.reel ? eur(amt.reel) : '—'}</span></div>
                    <div className="t2">{r.magasin}{(statutDeduit || r.statut) && <> · {statutDe(r)}</>}{r.strategie && <> · <span className="strat-mot" style={{ background: STRAT_COLORS[r.strategie] || '#f1f5f9', ...flou(masque) }}>{r.strategie}</span></>}</div>
                    <div className="t3" style={flou(masque)}>N-1 {r.recuN1 ? eur(r.recuN1) : '—'} · Objectif {r.objectifN ? eur(r.objectifN) : '—'} · {amt.qte || '—'} art. · PM {amt.pm ? eur2(amt.pm) : '—'}</div>
                    {r.cmd && <div className="t3" style={flou(masque)}>Commandé {eur(r.cmd.netEur)} · reçu {eur(r.cmd.recuEur)}{ec !== null && <> · écart <span className={Math.abs(ec) >= 0.5 ? 'ecart' : ''}>{ecartTexte(ec)}</span></>}</div>}
                  </div>
                  <button className="icone-btn" onClick={e => { e.stopPropagation(); modifier(r) }} aria-label={`Modifier ${r.fournisseur} · ${r.magasin}`}><Icone nom="crayon" taille={18} /></button>
                </div>
                {expanded.has(r.id) && <div className="achats-detail" style={flou(masque)}>{detailUnivers(r)}</div>}
              </Fragment>
            )
          })}
          <div className="achats-ligne total">
            <div className="txt">
              <div className="t1"><b>Total ({filtered.length})</b><span className="montant" style={flou(ghost)}>{eur(totalReel)}</span></div>
              <div className="t3" style={flou(ghost)}>N-1 {eur(totalRecuN1)} · Objectif {eur(totalObjectif)} · {totalQte.toLocaleString('fr-FR')} art.</div>
              {suivie && <div className="t3" style={flou(ghost)}>Commandé {eur(totalNet)} · reçu {eur(totalRecu)}{!univFilter && <> · écart {ecartTexte(totalEcart)}</>}</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="carte achats-tableau">
          <table className="achats-table">
            <thead>
              <tr>
                <th>Statut</th><th>Magasin</th><th>Fournisseur</th>
                <th className="c-montant">Reçu N-1</th>
                <th className="c-montant">Objectif N</th>
                <th className="c-montant">Réel achat N</th>
                {suivie && <><th className="c-montant">Commandé net</th><th className="c-montant">Reçu</th><th className="c-montant" title="Réel achat − commandé net, à titre indicatif">Écart</th></>}
                <th className="c-montant">Quantité</th>
                <th className="c-montant">PM</th>
                <th>Stratégie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isSel = r.fournisseur === selected, masque = ghost && !isSel, amt = rowAmounts(r, univFilter), ec = ecartDe(r)
                return (
                  <Fragment key={r.id}>
                    <tr className={`achats-tr${isSel ? ' choisie' : ''}`} onClick={() => basculer(r)} title="Cliquer pour déplier le détail par univers">
                      <td className="c-statut">{statutDe(r)}</td>
                      <td className="c-mag">{r.magasin}</td>
                      <td><span className="chevron">{expanded.has(r.id) ? '▾' : '▸'}</span><strong>{r.fournisseur}</strong></td>
                      <td className="c-montant doux" style={flou(masque)}>{r.recuN1 ? eur(r.recuN1) : '—'}</td>
                      <td className="c-montant doux" style={flou(masque)}>{r.objectifN ? eur(r.objectifN) : '—'}</td>
                      <td className="c-montant fort" style={flou(masque)}>{amt.reel ? eur(amt.reel) : '—'}</td>
                      {suivie && <>
                        <td className="c-montant" style={flou(masque)}>{r.cmd ? eur(r.cmd.netEur) : '—'}</td>
                        <td className="c-montant" style={flou(masque)}>{r.cmd ? eur(r.cmd.recuEur) : '—'}</td>
                        <td className={`c-montant${ec !== null && Math.abs(ec) >= 0.5 ? ' ecart' : ''}`} style={flou(masque)}>{ec === null ? '—' : ecartTexte(ec)}</td>
                      </>}
                      <td className="c-montant" style={flou(masque)}>{amt.qte || '—'}</td>
                      <td className="c-montant doux" style={flou(masque)}>{amt.pm ? eur2(amt.pm) : '—'}</td>
                      <td style={flou(masque)}><span className="strat-mot" style={{ background: STRAT_COLORS[r.strategie] || '#f1f5f9' }}>{r.strategie || '—'}</span></td>
                      <td><button className="icone-btn" onClick={e => { e.stopPropagation(); modifier(r) }} title="Modifier" aria-label={`Modifier ${r.fournisseur} · ${r.magasin}`}><Icone nom="crayon" taille={18} /></button></td>
                    </tr>
                    {expanded.has(r.id) && <tr className="achats-detail-tr"><td colSpan={suivie ? 13 : 10} style={flou(masque)}>{detailUnivers(r)}</td></tr>}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total ({filtered.length})</td>
                <td className="c-montant" style={flou(ghost)}>{eur(totalRecuN1)}</td>
                <td className="c-montant" style={flou(ghost)}>{eur(totalObjectif)}</td>
                <td className="c-montant" style={flou(ghost)}>{eur(totalReel)}</td>
                {suivie && <>
                  <td className="c-montant" style={flou(ghost)}>{eur(totalNet)}</td>
                  <td className="c-montant" style={flou(ghost)}>{eur(totalRecu)}</td>
                  <td className="c-montant" style={flou(ghost)}>{univFilter ? '—' : ecartTexte(totalEcart)}</td>
                </>}
                <td className="c-montant" style={flou(ghost)}>{totalQte.toLocaleString('fr-FR')}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

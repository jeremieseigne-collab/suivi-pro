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
import { libelleSaison } from '../fournisseurs/csvPolaris'
import { saisonPrecedente, calculerRecuN1, recuN1De, textSansPrix } from '../achats/recuN1'
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
const pctTexte = x => (x > 0.0005 ? '+' : x < -0.0005 ? '−' : '') + Math.abs(Math.round(x * 100)) + ' %'
const resteTexte = n => n < 0 ? '−' + eur(-n) : eur(n)

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

export default function Achats() {
  const { season, seasons } = useSeason()
  const telephone = useMediaQuery(PHONE)
  const saisonN1 = saisonPrecedente(season)   // Reçu N-1 : même saison l'année précédente (Été 2027 → Été 2026)
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
    const [params, magasins, fournisseurs, entreesN1] = await Promise.all([
      db.parametres.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
      saisonPrecedente(season) ? db.entrees.where('season').equals(saisonPrecedente(season)).toArray() : [],
    ])
    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))
    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    const calcul = calculerRecuN1(entreesN1)
    const lignes = params.filter(p => p.fournisseurId && p.magasinId).map(p => ({
      ...p, magasin: magasinMap[p.magasinId] || '', fournisseur: fournisseurMap[p.fournisseurId] || '', societe: getSociete(magasinMap[p.magasinId] || ''),
      n1: recuN1De(p, calcul),
    }))
    return { lignes }
  }, [season])

  const rows = useMemo(() => data ? data.lignes : [], [data])

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
  const totalRecuN1  = filtered.reduce((s, r) => s + r.n1.valeur, 0)
  const totalObjectif = filtered.reduce((s, r) => s + (r.objectifN || 0), 0)
  const totalReel    = filtered.reduce((s, r) => s + rowAmounts(r, univFilter).reel, 0)
  const totalQte     = filtered.reduce((s, r) => s + rowAmounts(r, univFilter).qte, 0)
  // Évolution (Réel N contre Reçu N-1) et reste à engager (Objectif − Réel) : pas calculés avec un filtre catégorie (Reçu N-1 et Objectif ne sont pas par univers)
  const evoTotal   = !univFilter && totalRecuN1 > 0 && totalReel > 0 ? totalReel / totalRecuN1 - 1 : null
  const resteTotal = !univFilter && totalObjectif > 0 ? totalObjectif - totalReel : null
  const nbSansPrix = filtered.reduce((s, r) => s + (r.n1.saisi ? 0 : (r.n1.calc?.sansPrix || 0)), 0)

  if (data === undefined) return <LoadingState />

  const flou = (masque, px = 6) => masque ? { filter: `blur(${px}px)`, userSelect: 'none' } : undefined
  const basculer = r => { setExpanded(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n }); setSelected(r.fournisseur) }
  const modifier = r => setEditRow(r)
  const evoDe   = r => univFilter ? null : (r.n1.valeur > 0 && (r.reelN || 0) > 0 ? (r.reelN || 0) / r.n1.valeur - 1 : null)
  const resteDe = r => univFilter || !(r.objectifN > 0) ? null : r.objectifN - (r.reelN || 0)
  // Reçu N-1 : bascule d'un toucher entre le montant saisi et le calcul (le montant saisi est gardé de côté, rien n'est perdu)
  const basculerN1 = (r, saisi) => db.parametres.update(r.id, { recuN1Saisi: saisi })
  const boutonN1 = r => r.n1.saisi
    ? <button type="button" className="n1-bascule" onClick={e => { e.stopPropagation(); basculerN1(r, false) }}>↺ Utiliser le calcul</button>
    : r.n1.garde > 0
      ? <button type="button" className="n1-bascule" onClick={e => { e.stopPropagation(); basculerN1(r, true) }}>↻ Reprendre mon montant ({eur(r.n1.garde)})</button>
      : <button type="button" className="n1-bascule" onClick={e => { e.stopPropagation(); modifier(r) }}>✎ Saisir</button>
  // Cellule Reçu N-1 : valeur, « saisi » ou « calculé », calcul à côté quand le montant est saisi, entrées sans prix
  const celluleN1 = (r, flouN1) => (
    <div className="n1" style={flouN1}>
      <div className="n1-valeur">{r.n1.valeur || r.n1.saisi ? eur(r.n1.valeur) : '—'}{r.n1.saisi && <>{' '}<span className="mot-n1">saisi</span></>}</div>
      {r.n1.saisi && <div className="n1-sous">calculé : {r.n1.calc ? eur(r.n1.calc.montant) : '—'}{r.n1.calc?.sansPrix > 0 && <span className="n1-alerte"> · {textSansPrix(r.n1.calc.sansPrix)}</span>}</div>}
      {!r.n1.saisi && r.n1.calc?.sansPrix > 0 && <div className="n1-alerte">{textSansPrix(r.n1.calc.sansPrix)} : chiffre sous-estimé</div>}
      {boutonN1(r)}
    </div>
  )

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
      ) : <span className="doux">Aucun détail par univers — saisis-le avec le crayon (Réel achat par univers).</span>}
    </>
  }

  const chiffres = [
    { value: eur(totalRecuN1), label: `Total Reçu N-1${magasin ? ` · ${magasin}` : ''}` },
    { value: eur(totalObjectif), label: `Total Objectif N${magasin ? ` · ${magasin}` : ''}` },
    { value: eur(totalReel), label: `Total Réel N${univFilter ? ` · ${univFilter}` : ''}${magasin ? ` · ${magasin}` : ''}` },
    { value: evoTotal === null ? '—' : pctTexte(evoTotal), label: 'Évolution (Réel N / Reçu N-1)' },
    { value: resteTotal === null ? '—' : resteTexte(resteTotal), label: 'Reste à engager (Objectif − Réel)', classe: resteTotal !== null && resteTotal < 0 ? 'orange' : '' },
    { value: filtered.length, label: 'Fournisseurs', clair: true },
  ]

  return (
    <div className="achats">
      {editRow  && <AchatEditModal row={editRow} recuCalc={editRow.n1?.calc ?? null} saisonN1={saisonN1 ? libelleSaison(saisonN1) : ''} onClose={() => setEditRow(null)} onSaved={() => setEditRow(null)} />}
      {showAdd  && <AchatAddModal onClose={() => setShowAdd(false)} onSaved={() => setShowAdd(false)} />}
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
      {saisonN1 && <p className="aide achats-explication">
        <b>Reçu N-1</b> : calculé d'après les entrées du Cahier de <b>{libelleSaison(saisonN1)}</b> (réceptions et réassorts, retours exclus). « saisi » = montant forcé à la main ; « Utiliser le calcul » le remplace par le calcul (votre montant est gardé de côté).
        {nbSansPrix > 0 && <> <span className="n1-alerte">Attention : {textSansPrix(nbSansPrix)} dans le calcul, il est sous-estimé pour ces lignes.</span></>}
      </p>}

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
            const masque = ghost && r.fournisseur !== selected, amt = rowAmounts(r, univFilter), evo = evoDe(r), reste = resteDe(r)
            return (
              <Fragment key={r.id}>
                <div className={`achats-ligne${r.fournisseur === selected ? ' choisie' : ''}`} onClick={() => basculer(r)}>
                  <div className="txt">
                    <div className="t1"><span className="chevron">{expanded.has(r.id) ? '▾' : '▸'}</span><b>{r.fournisseur}</b><span className="montant" style={flou(masque)}>{amt.reel ? eur(amt.reel) : '—'}</span></div>
                    <div className="t2">{r.magasin}{r.statut && <> · <span title="Décision">{r.statut}</span></>}{r.strategie && <> · <span className="strat-mot" style={{ background: STRAT_COLORS[r.strategie] || '#f1f5f9', ...flou(masque) }}>{r.strategie}</span></>}</div>
                    <div className="t3" style={flou(masque)}>N-1 {r.n1.valeur ? eur(r.n1.valeur) : '—'}{r.n1.saisi ? ' (saisi)' : ''} · Objectif {r.objectifN ? eur(r.objectifN) : '—'}</div>
                    <div className="t3" style={flou(masque)}>Évolution {evo === null ? '—' : pctTexte(evo)} · Reste à engager <span className={reste !== null && reste < 0 ? 'ecart' : ''}>{reste === null ? '—' : resteTexte(reste)}</span></div>
                    <div className="t3" style={flou(masque)}>{amt.qte || '—'} art. · PM {amt.pm ? eur2(amt.pm) : '—'}</div>
                    <div className="n1-mobile" style={flou(masque)}>
                      {r.n1.saisi && <span className="t3">calculé : {r.n1.calc ? eur(r.n1.calc.montant) : '—'}</span>}
                      {r.n1.calc?.sansPrix > 0 && <span className="n1-alerte"> {r.n1.saisi ? '· ' : ''}{textSansPrix(r.n1.calc.sansPrix)}{r.n1.saisi ? '' : ' : sous-estimé'}</span>}
                      {boutonN1(r)}
                    </div>
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
              <div className="t3" style={flou(ghost)}>Évolution {evoTotal === null ? '—' : pctTexte(evoTotal)} · Reste à engager {resteTotal === null ? '—' : resteTexte(resteTotal)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="carte achats-tableau">
          <table className="achats-table">
            <thead>
              <tr>
                <th title="Votre décision d'achat (✅ ⏳ ❌), saisie à la main">Décision</th><th>Magasin</th><th>Fournisseur</th>
                <th className="c-montant" title={saisonN1 ? `Calculé d'après les entrées du Cahier de ${libelleSaison(saisonN1)} (retours exclus), ou saisi à la main` : 'Saisi à la main'}>Reçu N-1</th>
                <th className="c-montant">Objectif N</th>
                <th className="c-montant">Réel achat N</th>
                <th className="c-montant" title="Réel achat N contre Reçu N-1, en %">Évolution</th>
                <th className="c-montant" title="Objectif N − Réel achat N">Reste à engager</th>
                <th className="c-montant">Quantité</th>
                <th className="c-montant">PM</th>
                <th>Stratégie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isSel = r.fournisseur === selected, masque = ghost && !isSel, amt = rowAmounts(r, univFilter), evo = evoDe(r), reste = resteDe(r)
                return (
                  <Fragment key={r.id}>
                    <tr className={`achats-tr${isSel ? ' choisie' : ''}`} onClick={() => basculer(r)} title="Cliquer pour déplier le détail par univers">
                      <td className="c-statut">{r.statut}</td>
                      <td className="c-mag">{r.magasin}</td>
                      <td><span className="chevron">{expanded.has(r.id) ? '▾' : '▸'}</span><strong>{r.fournisseur}</strong></td>
                      <td className="c-montant doux c-n1">{celluleN1(r, flou(masque))}</td>
                      <td className="c-montant doux" style={flou(masque)}>{r.objectifN ? eur(r.objectifN) : '—'}</td>
                      <td className="c-montant fort" style={flou(masque)}>{amt.reel ? eur(amt.reel) : '—'}</td>
                      <td className="c-montant" style={flou(masque)}>{evo === null ? '—' : pctTexte(evo)}</td>
                      <td className={`c-montant${reste !== null && reste < 0 ? ' ecart' : ''}`} style={flou(masque)}>{reste === null ? '—' : resteTexte(reste)}</td>
                      <td className="c-montant" style={flou(masque)}>{amt.qte || '—'}</td>
                      <td className="c-montant doux" style={flou(masque)}>{amt.pm ? eur2(amt.pm) : '—'}</td>
                      <td style={flou(masque)}><span className="strat-mot" style={{ background: STRAT_COLORS[r.strategie] || '#f1f5f9' }}>{r.strategie || '—'}</span></td>
                      <td><button className="icone-btn" onClick={e => { e.stopPropagation(); modifier(r) }} title="Modifier" aria-label={`Modifier ${r.fournisseur} · ${r.magasin}`}><Icone nom="crayon" taille={18} /></button></td>
                    </tr>
                    {expanded.has(r.id) && <tr className="achats-detail-tr"><td colSpan={12} style={flou(masque)}>{detailUnivers(r)}</td></tr>}
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
                <td className="c-montant" style={flou(ghost)}>{evoTotal === null ? '—' : pctTexte(evoTotal)}</td>
                <td className="c-montant" style={flou(ghost)}>{resteTotal === null ? '—' : resteTexte(resteTotal)}</td>
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

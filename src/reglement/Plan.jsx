import { useState, useMemo, useEffect, useRef } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { useMediaQuery, PHONE } from '../lib/useMediaQuery'
import { db } from '../db'
import { LoadingState } from '../components/shared'
import { useSeason } from '../context/SeasonContext'
import { SOCIETES } from '../data/societes'
import Icone from '../components/ui/Icone'
import { useVariantes } from '../shell/essai'
import PanneauEssai from '../shell/PanneauEssai'
import { POINTS_PLAN } from './points'
import { calculerPlan, filtrer, parMois, totaux, groupesDuMois, fmtDate, monthKey, monthLabel, eur, dateKey, isoStr, seasonDeadline, MODE_COLORS } from './calcul'
import './plan.css'

// Pastille du mode : mêmes couleurs que l'outil actuel
function ModeBadge({ mode }) {
  const mc = MODE_COLORS[mode] || { bg: '#f1f5f9', color: '#475569' }
  return <span className="mode-badge" style={{ background: mc.bg, color: mc.color }}>{mode}</span>
}

function CasePaye({ checked, indeterminate, onChange, titre }) {
  return <input type="checkbox" className="case-paye" checked={checked} ref={el => { if (el) el.indeterminate = !!indeterminate }}
    onChange={onChange} onClick={e => e.stopPropagation()} title={titre} aria-label={titre} />
}

export default function Plan() {
  const v = useVariantes(POINTS_PLAN)
  const telephone = useMediaQuery(PHONE)
  const { season, seasons } = useSeason()
  const [magasinFilter,  setMagasinFilter]  = useState('')
  const [modeFilter,     setModeFilter]     = useState('')
  const [societeFilter,  setSocieteFilter]  = useState('')
  const [marqueFilter,   setMarqueFilter]   = useState('')
  const [expanded,       setExpanded]       = useState(() => new Set())
  const [moisOuverts,    setMoisOuverts]    = useState(() => new Set())   // mois passés dépliés à la main (R3)
  const [reportDismiss,  setReportDismiss]  = useState(false)
  const [erreur,         setErreur]         = useState('')

  // Mêmes lectures que l'outil actuel, puis le calcul déplacé tel quel (calcul.js)
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
    return calculerPlan({ params, entrees, magasins, fournisseurs, modesReglement, defectueux, pointages }, season)
  }, [season])

  const allEcheances = data?.echeances ?? []
  const magasins     = data?.magasins  ?? []
  const modes   = useMemo(() => [...new Set(allEcheances.map(e => e.mode).filter(Boolean))].sort(), [allEcheances])
  const marques = useMemo(() => [...new Set(allEcheances.map(e => e.fournisseur).filter(Boolean))].sort(), [allEcheances])
  const filtered = useMemo(() => filtrer(allEcheances, { societeFilter, magasinFilter, marqueFilter, modeFilter }), [allEcheances, magasinFilter, modeFilter, societeFilter, marqueFilter])
  const withDate    = filtered.filter(e => e.date)
  const withoutDate = filtered.filter(e => !e.date)
  const byMonth = useMemo(() => parMois(withDate), [withDate])
  const { totalGeneral, totalReste } = totaux(filtered)
  const monthKeys = Object.keys(byMonth).sort()
  const curKey    = monthKey(new Date())
  const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0)
  const enRetard  = withDate.filter(e => !e.paye && e.date < aujourdhui)
  const totalRetard = enRetard.reduce((s, e) => s + e.montant, 0)

  // Pointage : mêmes clés et mêmes écritures que l'outil actuel
  async function togglePaye(e) {
    setErreur('')
    try {
      if (e.paye) await db.reglementPaye.where('cle').equals(e.key).delete()
      else        await db.reglementPaye.add({ cle: e.key })
    } catch (err) { setErreur('Pointage impossible : ' + (err.message || err)) }
  }
  async function setPaye(items, makePaid) {
    setErreur('')
    try {
      for (const e of items) {
        if (makePaid && !e.paye)      await db.reglementPaye.add({ cle: e.key })
        else if (!makePaid && e.paye) await db.reglementPaye.where('cle').equals(e.key).delete()
      }
    } catch (err) { setErreur('Pointage impossible : ' + (err.message || err)) }
  }

  // Avoirs non pointés d'une saison terminée → proposer de les reporter sur la saison suivante (identique)
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
    } catch (err) { setErreur('Report impossible : ' + (err.message || err)) }
    setReportDismiss(true)
  }

  const toggle = (set, k) => set(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })

  // R2 : ouvrir sur le mois en cours (ou le premier mois à venir)
  const refsMois = useRef({})
  const dejaPlace = useRef('')
  useEffect(() => {
    if (!v.plan_mois_en_cours || data === undefined || !monthKeys.length) return
    const cle = `${season}`
    if (dejaPlace.current === cle) return
    dejaPlace.current = cle
    const cible = monthKeys.find(k => k >= curKey)
    if (cible && cible !== monthKeys[0]) refsMois.current[cible]?.scrollIntoView({ block: 'start' })
  })

  // Une ligne d'échéance (seule ou dans le détail d'un groupe)
  function ligneEcheance(e, rowKey, detail = false) {
    if (telephone) return (
      <div key={rowKey} className={`plan-ligne ${e.paye ? 'payee' : ''} ${detail ? 'detail' : ''}`}>
        <CasePaye checked={!!e.paye} onChange={() => togglePaye(e)} titre={e.paye ? 'Payé — décocher' : 'Marquer comme payé'} />
        <div className="txt">
          <div className="t1">{e.fournisseur} <span className="montant">{eur(e.montant)}</span></div>
          <div className="t2">{fmtDate(e.date)} · {e.magasin} · <ModeBadge mode={e.mode} /> · {e.info}</div>
          <div className="t3">{e.source}</div>
        </div>
      </div>
    )
    return (
      <tr key={rowKey} className={e.paye ? 'payee' : ''}>
        <td className="c-paye"><CasePaye checked={!!e.paye} onChange={() => togglePaye(e)} titre={e.paye ? 'Payé — décocher' : 'Marquer comme payé'} /></td>
        <td className={`c-date ${detail ? 'detail' : ''}`}>{fmtDate(e.date)}</td>
        <td className="c-mag">{e.magasin}</td>
        <td>{detail ? <span className="doux">{e.fournisseur}</span> : <strong>{e.fournisseur}</strong>}</td>
        <td><ModeBadge mode={e.mode} /></td>
        <td className="doux">{e.info}</td>
        <td className="discret">{e.source}</td>
        <td className="c-montant">{eur(e.montant)}</td>
      </tr>
    )
  }

  function lignesDuMois(key, items) {
    const out = []
    groupesDuMois(items).forEach(({ soc, total, lignes }) => {
      out.push(telephone
        ? <div key={`h-${soc}`} className="plan-societe"><span>{soc}</span><span>{eur(total)}</span></div>
        : <tr key={`h-${soc}`} className="ligne-societe"><td colSpan={7}>{soc}</td><td className="c-montant">{eur(total)}</td></tr>)
      lignes.forEach(g => {
        if (g.items.length === 1) { out.push(ligneEcheance(g.items[0], `${soc}-${g.fournisseur}-${dateKey(g.date)}`)); return }
        const gkey = `${key}|${soc}|${g.fournisseur}|${dateKey(g.date)}`
        const allPaid  = g.items.every(x => x.paye)
        const somePaid = g.items.some(x => x.paye)
        const isOpen   = expanded.has(gkey)
        const mags = [...new Set(g.items.map(x => x.magasin))]
        const mods = [...new Set(g.items.map(x => x.mode))]
        const nbPaye = g.items.filter(x => x.paye).length
        out.push(telephone ? (
          <div key={gkey} className={`plan-ligne groupe ${allPaid ? 'payee' : ''}`} onClick={() => toggle(setExpanded, gkey)} role="button" aria-expanded={isOpen}>
            <CasePaye checked={allPaid} indeterminate={somePaid && !allPaid} onChange={() => setPaye(g.items, !allPaid)} titre="Tout cocher / décocher" />
            <div className="txt">
              <div className="t1">{g.fournisseur} <span className="montant">{eur(g.total)}</span></div>
              <div className="t2">{isOpen ? '▾' : '▸'} {fmtDate(g.date)} · {mags.length === 1 ? mags[0] : `${mags.length} magasins`} · {mods.length === 1 ? <ModeBadge mode={mods[0]} /> : 'plusieurs'} · {g.items.length} échéances · {nbPaye}/{g.items.length} payé</div>
            </div>
          </div>
        ) : (
          <tr key={gkey} className={`ligne-groupe ${allPaid ? 'payee' : ''}`} onClick={() => toggle(setExpanded, gkey)} aria-expanded={isOpen}>
            <td className="c-paye"><CasePaye checked={allPaid} indeterminate={somePaid && !allPaid} onChange={() => setPaye(g.items, !allPaid)} titre="Tout cocher / décocher" /></td>
            <td className="c-date"><span className="chevron">{isOpen ? '▾' : '▸'}</span>{fmtDate(g.date)}</td>
            <td className="c-mag">{mags.length === 1 ? mags[0] : `${mags.length} magasins`}</td>
            <td><strong>{g.fournisseur}</strong></td>
            <td>{mods.length === 1 ? <ModeBadge mode={mods[0]} /> : <span className="doux">plusieurs</span>}</td>
            <td className="doux">{g.items.length} échéances</td>
            <td className="discret">{nbPaye}/{g.items.length} payé</td>
            <td className="c-montant fort">{eur(g.total)}</td>
          </tr>
        ))
        if (isOpen) g.items.slice().sort((a, b) => a.date - b.date).forEach((e, i) => out.push(ligneEcheance(e, `${gkey}-d${i}`, true)))
      })
    })
    return out
  }

  const entetes = (
    <thead><tr>
      <th className="c-paye">Payé</th><th>Échéance</th><th>Magasin</th><th>Fournisseur</th>
      <th>Mode</th><th>Détail</th><th>Source</th><th className="c-montant">Montant</th>
    </tr></thead>
  )

  if (data === undefined) return <LoadingState />

  return (
    <div className="plan-reglement">
      {showReport && (
        <>
          <div className="feuille-fond" onClick={() => setReportDismiss(true)} />
          <div className="feuille" role="dialog" aria-label="Avoirs à reporter">
            <div className="feuille-entete"><h2>Avoirs à reporter</h2><button className="icone-btn" onClick={() => setReportDismiss(true)} aria-label="Fermer"><Icone nom="fermer" /></button></div>
            <div className="feuille-corps">
              <p style={{ marginTop: 0 }}>
                La saison <strong>{curSeasonLabel}</strong> est terminée et {unpaidAvoirs.length} avoir{unpaidAvoirs.length > 1 ? 's' : ''} n'{unpaidAvoirs.length > 1 ? 'ont' : 'a'} pas été pointé{unpaidAvoirs.length > 1 ? 's' : ''}. Les reporter sur la saison suivante ?
              </p>
              <div className="liste">
                {unpaidAvoirs.map((a, i) => (
                  <div key={i} className="ligne" style={{ minHeight: 48 }}>
                    <span className="txt"><span className="t1">{a.fournisseur}</span><span className="t2" style={{ display: 'block' }}>{a.magasin} · {fmtDate(a.date)}</span></span>
                    <strong>{eur(a.montant)}</strong>
                  </div>
                ))}
              </div>
              {!nextSeason && <div className="encart att" style={{ marginTop: 10 }}>Aucune saison suivante n'existe — crée-la d'abord (sélecteur de saison).</div>}
            </div>
            <div className="feuille-pied"><span className="total" />
              <button className="btn" onClick={() => setReportDismiss(true)}>Plus tard</button>
              <button className="btn btn-prim" disabled={!nextSeason} onClick={reportAvoirs}>{nextSeason ? `Reporter sur ${nextSeason.label}` : 'Aucune saison suivante'}</button>
            </div>
          </div>
        </>
      )}

      {/* Chiffres (mêmes calculs) */}
      <div className="plan-chiffres">
        <div className="carte"><b>{totalGeneral.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</b><span>Total à régler{magasinFilter ? ` · ${magasinFilter}` : ''}</span></div>
        <div className="carte"><b className={totalReste > 0.5 ? 'rouge' : 'vert'}>{totalReste.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</b><span>Reste à payer</span></div>
        <div className="carte"><b>{monthKeys.length}</b><span>Mois d'échéances</span></div>
        <div className="carte"><b>{withDate.length}</b><span>Échéances planifiées</span></div>
        {withoutDate.length > 0 && <div className="carte"><b className="orange">{withoutDate.length}</b><span>En attente 1ère réception</span></div>}
      </div>

      {/* Filtres + légende */}
      <div className="plan-filtres">
        <select className="champ" value={societeFilter} onChange={e => { setSocieteFilter(e.target.value); setMagasinFilter('') }} aria-label="Société">
          <option value="">Toutes les sociétés</option>
          {SOCIETES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="champ" value={magasinFilter} onChange={e => setMagasinFilter(e.target.value)} aria-label="Magasin">
          <option value="">Tous les magasins</option>
          {magasins.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className="champ" value={marqueFilter} onChange={e => setMarqueFilter(e.target.value)} aria-label="Marque">
          <option value="">Toutes les marques</option>
          {marques.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className="champ" value={modeFilter} onChange={e => setModeFilter(e.target.value)} aria-label="Mode">
          <option value="">Tous les modes</option>
          {modes.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="plan-legende">{Object.keys(MODE_COLORS).map(m => <ModeBadge key={m} mode={m} />)}</div>
      {erreur && <div className="encart err" style={{ marginBottom: 12 }}>{erreur}</div>}

      {/* R1 : En retard, non payé */}
      {v.plan_retard && enRetard.length > 0 && (
        <section className="carte plan-retard" aria-label="En retard, non payé">
          <div className="plan-retard-titre"><span>En retard, non payé · {enRetard.length} échéance{enRetard.length > 1 ? 's' : ''}</span><b>{eur(totalRetard)}</b></div>
          {telephone
            ? enRetard.map((e, i) => ligneEcheance(e, `r-${i}`))
            : <table className="plan-table">{entetes}<tbody>{enRetard.map((e, i) => ligneEcheance(e, `r-${i}`))}</tbody></table>}
        </section>
      )}

      {monthKeys.length === 0 && withoutDate.length === 0 && (
        <div className="vide">Aucune échéance — configure les modes de règlement dans <strong>Paramètres → Modes</strong> et saisis des entrées.</div>
      )}

      {/* Mois par mois */}
      {monthKeys.map(key => {
        const { total, items } = byMonth[key]
        const [y, m]    = key.split('-')
        const today     = new Date()
        const monthDate = new Date(Number(y), Number(m) - 1, 1)
        const isPast    = monthDate < new Date(today.getFullYear(), today.getMonth(), 1)
        const isCurrent = key === curKey
        const nonPayees = items.filter(e => !e.paye).length
        const replie    = v.plan_passes_replies && isPast && nonPayees === 0 && !moisOuverts.has(key)
        return (
          <section key={key} ref={el => { refsMois.current[key] = el }} className={`carte plan-mois ${isCurrent ? 'en-cours' : isPast ? 'passe' : 'a-venir'}`}>
            <button className="plan-mois-titre" onClick={() => v.plan_passes_replies && isPast && nonPayees === 0 && toggle(setMoisOuverts, key)} aria-expanded={!replie}>
              <span className="nom">{monthLabel(key)}</span>
              {isPast    && <span className="etat passe">Passé</span>}
              {isCurrent && <span className="etat en-cours">En cours</span>}
              {replie && <span className="aide">tout est payé · {items.length} échéance{items.length > 1 ? 's' : ''} ▸</span>}
              <b>{total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</b>
            </button>
            {!replie && (telephone
              ? <div className="plan-lignes">{lignesDuMois(key, items)}</div>
              : <table className="plan-table">{entetes}<tbody>{lignesDuMois(key, items)}</tbody></table>)}
          </section>
        )
      })}

      {/* CHEQUE en attente (identique) */}
      {withoutDate.length > 0 && (
        <section className="carte plan-mois attente">
          <div className="plan-mois-titre"><span className="nom">En attente de 1ère réception ({withoutDate.length} échéances CHEQUE)</span></div>
          <table className="plan-table">
            <thead><tr><th>Magasin</th><th>Fournisseur</th><th>Mode</th><th>Détail</th><th className="c-montant">Montant estimé</th></tr></thead>
            <tbody>
              {withoutDate.map((e, i) => (
                <tr key={i}><td>{e.magasin}</td><td><strong>{e.fournisseur}</strong></td><td><ModeBadge mode={e.mode} /></td><td className="doux">{e.info}</td>
                  <td className="c-montant">{e.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <PanneauEssai points={POINTS_PLAN} />
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { useMediaQuery, PHONE } from '../lib/useMediaQuery'
import { isoDate, mondayOf, parseLocal, fmtShort } from '../agenda/dates'
import { JOURS, MIN_ROWS, EMPLOYEE_COLORS } from './constants'
import { isGerant } from '../paie/constants'
import { useMagasin } from '../context/MagasinContext'
import { PageShell } from '../shell/EnTete'
import { LoadingState } from '../components/shared'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Toast } from '../cahier/Reperes'
import { useVariantes } from '../shell/essai'
import PanneauEssai from '../shell/PanneauEssai'
import { POINTS_PLANNING } from './points'
import { addDays, fmtH, weekLabel, minutes, fmtDuree } from './temps'
import { buildWeekSection, buildPrintPage, openPrintWindow } from './impression'
import '../cahier/cahier.css'
import './planning.css'

const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const enChamp = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

// Créneaux d'une semaine pour un magasin, lus en base (impression, annulation, reprise de la semaine précédente)
const lireSemaine = async (semaine, magasin) => (await db.planning.where('semaine').equals(semaine).toArray()).filter(s => s.magasin === magasin)

// ── Saisie d'un créneau : petite fenêtre près de la case (ordinateur) ou feuille en bas de l'écran (téléphone) ──
function SaisieCreneau({ shift, salarie, jour, dateJour, anchorRect, enFeuille, clipboard, onSave, onCopy, onClose }) {
  const [debut, setDebut] = useState(shift?.heureDebut || '09:30')
  const [fin,   setFin]   = useState(shift?.heureFin   || '17:30')
  const [note,  setNote]  = useState(shift?.note        || '')
  const debutRef = useRef(null), finRef = useRef(null), noteRef = useRef(null)
  const ok = debut && fin && debut < fin
  const save = () => { if (ok) onSave({ heureDebut: debut, heureFin: fin, note }) }

  // Clavier comme aujourd'hui : → passe au champ suivant, Entrée valide, Échap ferme
  function onDebutKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); save() }
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); finRef.current?.focus() }
  }
  function onFinKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); save() }
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'ArrowLeft'  || (e.key === 'Tab' && e.shiftKey))  { e.preventDefault(); debutRef.current?.focus() }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); noteRef.current?.focus() }
  }
  function onNoteKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); save() }
    if (e.key === 'Escape') { onClose() }
    if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); finRef.current?.focus() }
  }

  let place = {}
  if (!enFeuille && anchorRect) {
    const popH = clipboard ? 268 : 232
    const top  = anchorRect.bottom + popH > window.innerHeight ? Math.max(8, anchorRect.top - popH - 4) : anchorRect.bottom + 4
    place = { top, left: Math.min(Math.max(anchorRect.left, 8), window.innerWidth - 288) }
  }

  const contenu = <>
    {clipboard && (
      <button className="btn coller" onClick={() => { setDebut(clipboard.heureDebut); setFin(clipboard.heureFin); setNote(clipboard.note || '') }}>
        Coller {fmtH(clipboard.heureDebut)} – {fmtH(clipboard.heureFin)}
      </button>
    )}
    <div className="heures">
      <label className="etiquette">Début<input ref={debutRef} className="champ" type="time" value={debut} onChange={e => setDebut(e.target.value)} onKeyDown={onDebutKey} autoFocus={!enFeuille} /></label>
      <span className="fleche" aria-hidden="true">→</span>
      <label className="etiquette">Fin<input ref={finRef} className="champ" type="time" value={fin} onChange={e => setFin(e.target.value)} onKeyDown={onFinKey} /></label>
    </div>
    {!ok && debut && fin && <div className="aide att">L’heure de fin doit être après l’heure de début.</div>}
    <input ref={noteRef} className="champ" value={note} onChange={e => setNote(e.target.value)} onKeyDown={onNoteKey} placeholder="Note (optionnel)" style={{ marginTop: 8 }} />
    <div className="actions">
      <button className="btn" onClick={() => onSave(null)}>Repos</button>
      {shift && <button className="btn" onClick={() => { onCopy({ heureDebut: debut, heureFin: fin, note }); onClose() }}>Copier</button>}
      <button className="btn btn-prim" onClick={save} disabled={!ok} style={{ flex: 1 }}>OK</button>
    </div>
    {!enFeuille && <div className="aide" style={{ textAlign: 'center', marginTop: 8 }}>→ passe au champ suivant · Entrée pour valider</div>}
  </>

  if (enFeuille) return (
    <>
      <div className="feuille-fond" onClick={onClose} />
      <div className="feuille bas saisie-creneau" role="dialog" aria-label={`${salarie} — ${JOURS[jour]}`}>
        <div className="feuille-entete"><h2>{salarie} — {JOURS[jour]} {dateJour}</h2><button className="icone-btn" onClick={onClose} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">{contenu}</div>
      </div>
    </>
  )
  return (
    <>
      <div className="voile-creneau" onClick={onClose} />
      <div className="pop-creneau saisie-creneau" role="dialog" aria-label={`${salarie} — ${JOURS[jour]}`} style={place}>
        <div className="titre">{salarie} — {JOURS[jour]} {dateJour}</div>
        {contenu}
      </div>
    </>
  )
}

// ── Choix de l'impression : 1, 2 ou 3 semaines à partir de la semaine affichée (point C « avec ») ──
function ChoixImpression({ semaine, onImprimer, onFermer }) {
  const [n, setN] = useState(1)
  const semaines = Array.from({ length: n }, (_, i) => addDays(semaine, 7 * i))
  return (
    <Confirmation titre="Imprimer le planning" confirmer={`Imprimer ${n > 1 ? `les ${n} semaines` : 'la semaine'}`} annuler="Fermer"
      onAnnuler={onFermer} onConfirmer={() => onImprimer(semaines)}>
      <p style={{ margin: '0 0 10px' }}>Combien de semaines sur la même page ?</p>
      <div className="segment" role="group" aria-label="Nombre de semaines" style={{ marginBottom: 12 }}>
        {[1, 2, 3].map(x => <button key={x} aria-pressed={n === x} onClick={() => setN(x)}>{x}</button>)}
      </div>
      <ul className="liste-resume">{semaines.map(w => <li key={w}><span>{weekLabel(w)}</span></li>)}</ul>
    </Confirmation>
  )
}

export default function Planning() {
  const v = useVariantes(POINTS_PLANNING)
  const telephone = useMediaQuery(PHONE)
  const today = isoDate(new Date())
  const [semaine,        setSemaine]        = useState(() => isoDate(mondayOf(new Date())))
  const { magasin: magasinCourant, setMagasin: setMagasinCourant } = useMagasin()
  const magasin = magasinCourant?.nom || ''
  const [active,         setActive]         = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [clipboard,      setClipboard]      = useState(null)
  const [undoStack,      setUndoStack]      = useState([])
  const [pendingWeeks,   setPendingWeeks]   = useState(() => { try { return JSON.parse(localStorage.getItem('planning_pending_weeks') || '[]') } catch { return [] } })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [extraRows,      setExtraRows]      = useState([])
  const [addingExtra,    setAddingExtra]    = useState(false)
  const [extraName,      setExtraName]      = useState('')
  const [jourVu,         setJourVu]         = useState(null)   // téléphone, jour par jour
  const [reprise,        setReprise]        = useState(null)   // { depuis, aCopier, deja }
  const [toast,          setToast]          = useState(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.duree || 5000); return () => clearTimeout(t) }, [toast])

  const magasins = useLiveQuery(() => db.magasins.toArray(), [])
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const shifts   = useLiveQuery(
    () => magasin
      ? db.planning.where('semaine').equals(semaine).and(s => s.magasin === magasin).toArray()
      : Promise.resolve([]),
    [semaine, magasin]
  )

  // Annuler la dernière modification (bouton, ou Ctrl+Z hors d'un champ de saisie). Le retour en arrière vise
  // la semaine et le magasin où la modification a été faite (avant : la semaine affichée).
  const undoRef = useRef([])
  useEffect(() => { undoRef.current = undoStack }, [undoStack])
  async function annulerDerniere() {
    const stack = undoRef.current
    if (!stack.length) return
    const last = stack[stack.length - 1]
    undoRef.current = stack.slice(0, -1)
    setUndoStack(s => s.slice(0, -1))
    try {
      if (last.lot) {
        for (const id of last.lot) await db.planning.delete(id)
      } else {
        const existing = (await lireSemaine(last.semaine, last.magasin)).find(s => s.salarie === last.salarie && s.jour === last.jour)
        if (!last.before) { if (existing) await db.planning.delete(existing.id) }
        else if (existing) await db.planning.update(existing.id, { heureDebut: last.before.heureDebut, heureFin: last.before.heureFin, note: last.before.note })
        else await db.planning.add({ semaine: last.semaine, magasin: last.magasin, salarie: last.salarie, jour: last.jour, ...last.before })
      }
      setToast({ texte: 'Modification annulée', duree: 2500 })
    } catch (e) { setToast({ texte: 'Annulation impossible : ' + (e.message || 'vérifie la connexion.') }) }
  }
  const annulerRef = useRef(annulerDerniere)
  useEffect(() => { annulerRef.current = annulerDerniere })
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !enChamp(e.target)) { e.preventDefault(); annulerRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const employees    = (salaries || []).filter(s => !isGerant(s.nom) && (!s.magasin || s.magasin === magasin))
  const salaryNames  = new Set((salaries || []).map(s => s.nom))

  const tempFromShifts = [...new Set((shifts || []).filter(s => !salaryNames.has(s.salarie) && !isGerant(s.salarie)).map(s => s.salarie))]
  const allTempNames   = new Set([...tempFromShifts, ...extraRows.map(r => r.nom).filter(Boolean)])
  const tempRows       = [...allTempNames].map(nom => ({ id: `t-${nom}`, nom, isTemp: true }))
  const allRows        = [...employees, ...tempRows]
  const displayRows    = !v.planning_lignes_vides || allRows.length >= MIN_ROWS
    ? allRows
    : [...allRows, ...Array.from({ length: MIN_ROWS - allRows.length }, (_, i) => ({ id: `_${i}`, nom: '' }))]

  const colorMap = {}
  allRows.forEach((s, i) => { colorMap[s.nom] = EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length] })

  function getShift(nom, jourIdx) { return (shifts || []).find(s => s.salarie === nom && s.jour === jourIdx) }
  const totalSemaine = nom => (shifts || []).filter(s => s.salarie === nom).reduce((t, s) => t + minutes(s), 0)

  async function handleSave(salarie, jour, value) {
    setActive(null)
    if (!salarie || saving) return
    setSaving(true)
    try {
      const existing = getShift(salarie, jour)
      const before   = existing ? { heureDebut: existing.heureDebut, heureFin: existing.heureFin, note: existing.note || '' } : null
      if (!value) {
        if (existing) await db.planning.delete(existing.id)
      } else {
        if (existing) await db.planning.update(existing.id, value)
        else           await db.planning.add({ semaine, magasin, salarie, jour, ...value })
      }
      setUndoStack(s => [...s.slice(-19), { semaine, magasin, salarie, jour, before }])
    } catch (e) {
      setToast({ texte: 'Enregistrement impossible : ' + (e.message || 'vérifie la connexion et réessaie.') })
    } finally { setSaving(false) }
  }

  function confirmAddExtra() {
    const nom = extraName.trim()
    if (!nom) return
    setExtraRows(r => [...r, { id: `loc-${Date.now()}`, nom, isTemp: true }])
    setExtraName(''); setAddingExtra(false)
  }
  const removeExtraRow = nom => setExtraRows(r => r.filter(row => row.nom !== nom))

  // ── Reprendre la semaine précédente (A) : recopie ses horaires dans les cases vides, sans rien écraser ──
  async function preparerReprise() {
    const depuis = addDays(semaine, -7)
    try {
      const prev = (await lireSemaine(depuis, magasin)).filter(p => !isGerant(p.salarie))
      const actuels = await lireSemaine(semaine, magasin)
      const aCopier = prev.filter(p => !actuels.some(c => c.salarie === p.salarie && c.jour === p.jour))
      if (!prev.length) return setToast({ texte: `Rien à reprendre : aucun horaire la ${weekLabel(depuis).toLowerCase()}.` })
      if (!aCopier.length) return setToast({ texte: 'Rien à reprendre : les cases correspondantes sont déjà remplies.' })
      setReprise({ depuis, aCopier, deja: prev.length - aCopier.length })
    } catch (e) { setToast({ texte: 'Lecture impossible : ' + (e.message || 'vérifie la connexion.') }) }
  }
  async function reprendre() {
    const { aCopier } = reprise
    setReprise(null)
    const ids = []
    try {
      for (const p of aCopier) ids.push(await db.planning.add({ semaine, magasin, salarie: p.salarie, jour: p.jour, heureDebut: p.heureDebut, heureFin: p.heureFin, note: p.note || '' }))
      setUndoStack(s => [...s.slice(-19), { lot: ids }])
      setToast({ texte: `${ids.length} horaire${ids.length > 1 ? 's' : ''} repris de la semaine précédente`, duree: 8000,
        annuler: async () => { setUndoStack(s => s.filter(x => x.lot !== ids)); for (const id of ids) await db.planning.delete(id) } })
    } catch (e) {
      if (ids.length) setUndoStack(s => [...s.slice(-19), { lot: ids }])
      setToast({ texte: `Reprise interrompue (${ids.length} horaire${ids.length > 1 ? 's' : ''} copié${ids.length > 1 ? 's' : ''}) : ` + (e.message || 'vérifie la connexion.') })
    }
  }

  // ── Impression ──
  function savePending(arr) {
    setPendingWeeks(arr)
    try { localStorage.setItem('planning_pending_weeks', JSON.stringify(arr)) } catch { /* ignore */ }
  }
  const cancelPending = () => savePending([])
  function onPrintClick() {
    if (!v.planning_impression && pendingWeeks.length >= 2) doPrint([...pendingWeeks, semaine])   // 2 semaines déjà en attente → imprimer les 3
    else setShowPrintModal(true)
  }
  function onWaitNextWeek() {
    setShowPrintModal(false)
    savePending([...pendingWeeks, semaine])
    changerSemaine(addDays(semaine, 7))
  }
  const onPrintNow = () => doPrint([...pendingWeeks, semaine])
  async function doPrint(weeks) {
    setShowPrintModal(false)
    const sections = []
    for (let i = 0; i < weeks.length; i++) {
      if (i > 0) sections.push('<div class="sep"></div>')
      const w = weeks[i]
      const weekShifts = w === semaine ? (shifts || []) : await lireSemaine(w, magasin)
      sections.push(buildWeekSection(w, weekShifts, { employees, salaryNames, colorMap }))
    }
    if (!openPrintWindow(buildPrintPage(magasin, sections.join('')))) setToast({ texte: 'Le navigateur a bloqué la fenêtre d’impression : autorise les fenêtres pour ce site.' })
    if (!v.planning_impression) savePending([])
  }

  // ── Valeurs d'affichage ──
  const todayJour    = JOURS.findIndex((_, i) => addDays(semaine, i) === today)
  const nbTotal      = pendingWeeks.length + 1
  const enAttente    = !v.planning_impression && pendingWeeks.length > 0
  const printLabel   = enAttente ? `Imprimer les ${nbTotal} semaines` : 'Imprimer'
  const jourMobile   = jourVu ?? (todayJour >= 0 ? todayJour : 0)
  const jourParJour  = telephone && v.planning_jour_par_jour
  const dateDuJour   = j => fmtShort(parseLocal(addDays(semaine, j)))
  function changerSemaine(w) { setSemaine(w); setJourVu(null); setActive(null) }
  const ouvrir = (nom, jour, e) => { if (!saving) setActive({ salarie: nom, jour, anchorRect: e?.currentTarget?.getBoundingClientRect(), shift: getShift(nom, jour) }) }

  const nomCellule = row => (
    <div className="nom-planning">
      <span className="barre-couleur" style={{ background: colorMap[row.nom] }} />
      <span className="txt"><span className="t1">{row.nom}</span>{row.isTemp && <span className="t2">remplaçant</span>}</span>
      {row.isTemp && !JOURS.some((_, i) => getShift(row.nom, i)) && extraRows.some(r => r.nom === row.nom) &&
        <button className="icone-btn petit" onClick={() => removeExtraRow(row.nom)} aria-label={`Retirer ${row.nom}`} title="Retirer la ligne"><Icone nom="fermer" taille={16} /></button>}
    </div>
  )
  const creneau = (s, color) => (
    <span className="creneau" style={{ borderLeftColor: color, background: color + '22' }}>
      {fmtH(s.heureDebut)} – {fmtH(s.heureFin)}
      {s.note && <span className="note">{s.note}</span>}
    </span>
  )
  const ajoutRemplacant = addingExtra ? (
    <form className="ajout-remplacant" onSubmit={e => { e.preventDefault(); confirmAddExtra() }}>
      <input className="champ" autoFocus value={extraName} onChange={e => setExtraName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') setAddingExtra(false) }} placeholder="Prénom du remplaçant…" />
      <button type="submit" className="btn btn-prim" disabled={!extraName.trim()}>Ajouter</button>
      <button type="button" className="btn" onClick={() => { setAddingExtra(false); setExtraName('') }}>Annuler</button>
    </form>
  ) : <button className="lien" onClick={() => setAddingExtra(true)}><Icone nom="ajout" taille={16} style={{ verticalAlign: '-3px' }} /> Ajouter un remplaçant</button>

  let grille
  if (!magasin) grille = <div className="vide">Choisis un magasin pour afficher le planning.</div>
  else if (salaries === undefined || shifts === undefined) grille = <LoadingState />
  else if (jourParJour) grille = (
    <>
      <div className="chips jours-planning" role="group" aria-label="Jour">
        {JOURS_COURTS.map((j, i) => (
          <button key={j} className={`chip ${i === todayJour ? 'aujourdhui' : ''}`} aria-pressed={i === jourMobile} onClick={() => setJourVu(i)}>
            {j} {parseLocal(addDays(semaine, i)).getDate()}
          </button>
        ))}
      </div>
      <div className="groupe-titre">{JOURS[jourMobile]} {dateDuJour(jourMobile)}{jourMobile === todayJour ? ' · aujourd’hui' : ''}</div>
      <div className="liste">
        {allRows.length === 0 && <div className="vide">Aucun salarié pour ce magasin.</div>}
        {allRows.map(row => {
          const s = getShift(row.nom, jourMobile)
          return (
            <button key={row.id} className="ligne" onClick={e => ouvrir(row.nom, jourMobile, e)}>
              <span className="barre-couleur" style={{ background: colorMap[row.nom] }} />
              <span className="txt">
                <span className="t1">{row.nom}{row.isTemp && <span> · remplaçant</span>}</span>
                {v.planning_total_heures && <span className="t2" style={{ display: 'block' }}>Semaine : {fmtDuree(totalSemaine(row.nom))}</span>}
              </span>
              {s ? creneau(s, colorMap[row.nom]) : <span className="aide">Pas d’horaire</span>}
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: 10 }}>{ajoutRemplacant}</div>
    </>
  )
  else grille = (
    <div className="grille-planning-zone">
      <table className="grille-planning">
        <thead>
          <tr>
            <th className="col-nom">Salarié</th>
            {JOURS.map((j, i) => (
              <th key={j} className={i === todayJour ? 'aujourdhui' : ''}>{j}<span className="date">{dateDuJour(i)}</span></th>
            ))}
            {v.planning_total_heures && <th className="col-total">Total</th>}
          </tr>
        </thead>
        <tbody>
          {displayRows.map(row => {
            const nom = row.nom || ''
            if (!nom) return (
              <tr key={row.id} className="ligne-fantome"><td className="col-nom" />{JOURS.map((j, i) => <td key={j} className={i === todayJour ? 'aujourdhui' : ''} />)}{v.planning_total_heures && <td className="col-total" />}</tr>
            )
            const color = colorMap[nom]
            return (
              <tr key={row.id}>
                <td className="col-nom">{nomCellule(row)}</td>
                {JOURS.map((j, jourIdx) => {
                  const shift = getShift(nom, jourIdx)
                  const isActive = active?.salarie === nom && active?.jour === jourIdx
                  return (
                    <td key={j} className={`case-planning ${jourIdx === todayJour ? 'aujourdhui' : ''} ${isActive ? 'active' : ''}`}
                      onClick={e => { e.stopPropagation(); ouvrir(nom, jourIdx, e) }}
                      role="button" tabIndex={0} aria-label={`${nom}, ${j} : ${shift ? `${fmtH(shift.heureDebut)} – ${fmtH(shift.heureFin)}` : 'pas d’horaire'}`}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(nom, jourIdx, e) } }}>
                      {shift ? <>
                        {creneau(shift, color)}
                        <button className="copier-survol" title="Copier ces horaires" aria-label="Copier ces horaires"
                          onClick={e => { e.stopPropagation(); setClipboard({ heureDebut: shift.heureDebut, heureFin: shift.heureFin, note: shift.note || '' }) }}>Copier</button>
                      </> : <span className="plus" aria-hidden="true">+</span>}
                    </td>
                  )
                })}
                {v.planning_total_heures && <td className="col-total">{fmtDuree(totalSemaine(nom))}</td>}
              </tr>
            )
          })}
          <tr className="ligne-ajout"><td colSpan={v.planning_total_heures ? 9 : 8}>{ajoutRemplacant}</td></tr>
        </tbody>
      </table>
    </div>
  )

  const actions = magasin ? <button className={`btn ${enAttente ? 'btn-prim' : ''}`} onClick={onPrintClick}>{printLabel}</button> : null

  return (
    <PageShell title="Planning" withSeason={false} rightExtra={actions}>
      <div className="planning">
        <div className="chips" style={{ marginBottom: 10 }}>
          {(magasins || []).map(m => <button key={m.id} className="chip" aria-pressed={m.nom === magasin} onClick={() => { setMagasinCourant(m); setActive(null) }}><Icone nom="magasin" taille={16} />{m.nom}</button>)}
        </div>

        <div className="barre-semaine">
          <button className="icone-btn" onClick={() => changerSemaine(addDays(semaine, -7))} aria-label="Semaine précédente"><Icone nom="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
          <span className="libelle-semaine">{weekLabel(semaine)}</span>
          <button className="icone-btn" onClick={() => changerSemaine(addDays(semaine, 7))} aria-label="Semaine suivante"><Icone nom="chevron" /></button>
          <button className="chip" onClick={() => changerSemaine(isoDate(mondayOf(new Date())))}>Aujourd’hui</button>
        </div>

        {magasin && (v.planning_copier_semaine || undoStack.length > 0 || clipboard) && (
          <div className="outils-planning">
            {v.planning_copier_semaine && <button className="chip" onClick={preparerReprise}>Reprendre la semaine précédente</button>}
            {undoStack.length > 0 && <button className="chip" onClick={annulerDerniere} title="Ctrl+Z">Annuler la dernière modification ({undoStack.length})</button>}
            {clipboard && (
              <span className="chip copie">{fmtH(clipboard.heureDebut)}–{fmtH(clipboard.heureFin)} copié
                <button className="icone-btn petit" onClick={() => setClipboard(null)} aria-label="Oublier les horaires copiés"><Icone nom="fermer" taille={14} /></button>
              </span>
            )}
          </div>
        )}

        {enAttente && (
          <div className="encart neutre" style={{ marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 200 }}>
              {pendingWeeks.length === 1
                ? <><strong>{weekLabel(pendingWeeks[0])}</strong> en attente</>
                : <><strong>{weekLabel(pendingWeeks[0])}</strong> et <strong>{weekLabel(pendingWeeks[1])}</strong> en attente</>}
              {pendingWeeks.length < 2
                ? <> — remplis cette semaine puis touche <strong>{printLabel}</strong> pour tout imprimer.</>
                : <> — touche <strong>{printLabel}</strong> pour imprimer les 3 semaines ensemble.</>}
            </span>
            <button className="btn" onClick={cancelPending}>Annuler</button>
          </div>
        )}

        {grille}
        {magasin && v.planning_total_heures && <div className="aide" style={{ marginTop: 8 }}>Total : de l’heure de début à l’heure de fin de chaque jour, pauses non déduites.</div>}
      </div>

      {active && (
        <SaisieCreneau key={`${active.salarie}-${active.jour}`} shift={active.shift} salarie={active.salarie} jour={active.jour} dateJour={dateDuJour(active.jour)}
          anchorRect={active.anchorRect} enFeuille={telephone} clipboard={clipboard} onCopy={setClipboard}
          onSave={val => handleSave(active.salarie, active.jour, val)} onClose={() => setActive(null)} />
      )}

      {showPrintModal && (v.planning_impression
        ? <ChoixImpression semaine={semaine} onImprimer={doPrint} onFermer={() => setShowPrintModal(false)} />
        : <Confirmation titre="Impression du planning"
            texte={pendingWeeks.length === 0
              ? 'Veux-tu attendre le planning de la semaine suivante pour les imprimer ensemble sur une même page ?'
              : 'Tu as déjà 1 semaine en attente. Veux-tu attendre encore la semaine suivante pour imprimer 3 plannings sur la même page ?'}
            annuler="Fermer" secondaire={{ texte: pendingWeeks.length === 0 ? 'Non, imprimer maintenant' : `Imprimer les ${nbTotal} semaines`, onClick: onPrintNow }}
            confirmer={pendingWeeks.length === 0 ? 'Oui, attendre' : 'Attendre encore'}
            onAnnuler={() => setShowPrintModal(false)} onConfirmer={onWaitNextWeek} />)}

      {reprise && (
        <Confirmation titre="Reprendre la semaine précédente ?"
          texte={`${reprise.aCopier.length} horaire${reprise.aCopier.length > 1 ? 's' : ''} de la ${weekLabel(reprise.depuis).toLowerCase()} ${reprise.aCopier.length > 1 ? 'seront recopiés' : 'sera recopié'} dans les cases vides. Les cases déjà remplies ne changent pas${reprise.deja ? ` (${reprise.deja} déjà remplie${reprise.deja > 1 ? 's' : ''})` : ''}.`}
          confirmer="Reprendre" onAnnuler={() => setReprise(null)} onConfirmer={reprendre} />
      )}

      <Toast toast={toast} onFermer={() => setToast(null)} />
      <PanneauEssai points={POINTS_PLANNING} />
    </PageShell>
  )
}

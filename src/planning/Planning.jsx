import { useState, useRef, useEffect } from 'react'
import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { isoDate, mondayOf, parseLocal, fmtShort } from '../agenda/dates'
import { JOURS, MIN_ROWS, EMPLOYEE_COLORS } from './constants'
import { isGerant } from '../paie/constants'

function addDays(isoStr, n) {
  const d = parseLocal(isoStr)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

function fmtH(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return m === '00' ? `${+h}h` : `${+h}h${m}`
}

function weekLabel(isoMonday) {
  const from = parseLocal(isoMonday)
  const to   = parseLocal(addDays(isoMonday, 6))
  return `Semaine du ${fmtShort(from)} au ${fmtShort(to)} ${to.getFullYear()}`
}

// ── Popover saisie horaires ────────────────────────────────────────────────
function CellPopover({ shift, salarie, jour, anchorRect, clipboard, onSave, onCopy, onClose }) {
  const [debut, setDebut] = useState(shift?.heureDebut || '09:30')
  const [fin,   setFin]   = useState(shift?.heureFin   || '17:30')
  const [note,  setNote]  = useState(shift?.note        || '')
  const debutRef = useRef(null)
  const finRef   = useRef(null)
  const noteRef  = useRef(null)

  const popH = clipboard ? 228 : 206
  const top  = anchorRect.bottom + popH > window.innerHeight
    ? anchorRect.top - popH - 4
    : anchorRect.bottom + 4
  const left = Math.min(Math.max(anchorRect.left, 8), window.innerWidth - 252)
  const ok   = debut && fin && debut < fin

  function save() { if (ok) onSave({ heureDebut: debut, heureFin: fin, note }) }

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

  const inputStyle = {
    flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 7,
    fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none',
    fontVariantNumeric: 'tabular-nums', minWidth: 0,
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={onClose} />
      <div style={{
        position: 'fixed', zIndex: 1000, top, left, width: 248,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 14,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
          {salarie} — {JOURS[jour]}
        </div>

        {clipboard && (
          <button onClick={() => { setDebut(clipboard.heureDebut); setFin(clipboard.heureFin); setNote(clipboard.note || '') }}
            style={{ width: '100%', marginBottom: 8, padding: '5px 10px', borderRadius: 7, border: '1px dashed var(--accent)', background: 'var(--accent-bg)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left', boxSizing: 'border-box' }}>
            📋 Coller {fmtH(clipboard.heureDebut)} – {fmtH(clipboard.heureFin)}
          </button>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <input ref={debutRef} type="time" value={debut} onChange={e => setDebut(e.target.value)} onKeyDown={onDebutKey} autoFocus style={inputStyle} />
          <span style={{ color: 'var(--text-4)', fontSize: 12, flexShrink: 0 }}>→</span>
          <input ref={finRef} type="time" value={fin} onChange={e => setFin(e.target.value)} onKeyDown={onFinKey} style={inputStyle} />
        </div>

        <input ref={noteRef} value={note} onChange={e => setNote(e.target.value)} onKeyDown={onNoteKey}
          placeholder="Note (optionnel)"
          style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onSave(null)}
            style={{ flex: 1, padding: 7, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>
            Repos
          </button>
          {shift && (
            <button onClick={() => { onCopy({ heureDebut: debut, heureFin: fin, note }); onClose() }}
              style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}
              title="Copier ces horaires">
              📋
            </button>
          )}
          <button onClick={save} disabled={!ok}
            style={{ flex: 2, padding: 7, borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 700, background: ok ? 'var(--accent)' : 'var(--border)', color: ok ? '#fff' : 'var(--text-4)', cursor: ok ? 'pointer' : 'default' }}>
            OK ✓
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-5)', textAlign: 'center', marginTop: 8 }}>
          → passe au champ suivant · Entrée pour valider
        </div>
      </div>
    </>
  )
}

// ── Composant principal ────────────────────────────────────────────────────
export default function Planning({ onHome }) {
  const today = isoDate(new Date())
  const [semaine,        setSemaine]        = useState(() => isoDate(mondayOf(new Date())))
  const [magasin,        setMagasin]        = useState(() => localStorage.getItem('planning_magasin') || '')
  const [active,         setActive]         = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [clipboard,      setClipboard]      = useState(null)
  const [undoStack,      setUndoStack]      = useState([])
  const [pendingWeeks,   setPendingWeeks]   = useState(() => { try { return JSON.parse(localStorage.getItem('planning_pending_weeks') || '[]') } catch { return [] } })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [extraRows,      setExtraRows]      = useState([])
  const [addingExtra,    setAddingExtra]    = useState(false)
  const [extraName,      setExtraName]      = useState('')

  const magasins = useLiveQuery(() => db.magasins.toArray(), [])
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const shifts   = useLiveQuery(
    () => magasin
      ? db.planning.where('semaine').equals(semaine).and(s => s.magasin === magasin).toArray()
      : Promise.resolve([]),
    [semaine, magasin]
  )

  const shiftsRef = useRef([])
  useEffect(() => { shiftsRef.current = shifts || [] }, [shifts])
  const undoRef = useRef([])
  useEffect(() => { undoRef.current = undoStack }, [undoStack])

  // Ctrl+Z undo
  useEffect(() => {
    async function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const stack = undoRef.current
        if (!stack.length) return
        const last = stack[stack.length - 1]
        setUndoStack(s => s.slice(0, -1))
        const existing = shiftsRef.current.find(s => s.salarie === last.salarie && s.jour === last.jour)
        if (!last.before) {
          if (existing) await db.planning.delete(existing.id)
        } else {
          if (existing)
            await db.planning.update(existing.id, { heureDebut: last.before.heureDebut, heureFin: last.before.heureFin, note: last.before.note })
          else
            await db.planning.add({ semaine: last.semaine, magasin: last.magasin, salarie: last.salarie, jour: last.jour, ...last.before })
        }
      }
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
  const displayRows    = allRows.length >= MIN_ROWS
    ? allRows
    : [...allRows, ...Array.from({ length: MIN_ROWS - allRows.length }, (_, i) => ({ id: `_${i}`, nom: '' }))]

  const colorMap = {}
  allRows.forEach((s, i) => { colorMap[s.nom] = EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length] })

  function selectMagasin(m) { setMagasin(m); localStorage.setItem('planning_magasin', m) }
  function getShift(nom, jourIdx) { return (shifts || []).find(s => s.salarie === nom && s.jour === jourIdx) }
  function rowHasShifts(nom) { return nom && JOURS.some((_, i) => getShift(nom, i)) }

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
    } finally { setSaving(false) }
  }

  function confirmAddExtra() {
    const nom = extraName.trim()
    if (!nom) return
    setExtraRows(r => [...r, { id: `loc-${Date.now()}`, nom, isTemp: true }])
    setExtraName(''); setAddingExtra(false)
  }

  function removeExtraRow(nom) {
    setExtraRows(r => r.filter(row => row.nom !== nom))
  }

  // ── Impression ─────────────────────────────────────────────────────────
  function savePending(arr) {
    setPendingWeeks(arr)
    localStorage.setItem('planning_pending_weeks', JSON.stringify(arr))
  }

  function cancelPending() { savePending([]) }

  function onPrintClick() {
    if (pendingWeeks.length >= 2) {
      // 2 semaines déjà en attente → imprimer les 3 directement
      doPrint([...pendingWeeks, semaine])
    } else {
      setShowPrintModal(true)
    }
  }

  function onWaitNextWeek() {
    setShowPrintModal(false)
    savePending([...pendingWeeks, semaine])
    setSemaine(addDays(semaine, 7))
  }

  function onPrintNow() {
    setShowPrintModal(false)
    doPrint([...pendingWeeks, semaine])
  }

  async function doPrint(weeks) {
    const sections = []
    for (let i = 0; i < weeks.length; i++) {
      if (i > 0) sections.push('<div class="sep"></div>')
      const w = weeks[i]
      const weekShifts = w === semaine
        ? (shifts || [])
        : await db.planning.where('semaine').equals(w).and(s => s.magasin === magasin).toArray()
      sections.push(buildWeekSection(w, weekShifts))
    }
    openPrintWindow(buildPrintPage(magasin, sections.join('')))
    savePending([])
  }

  function buildWeekSection(isoMonday, shiftsForWeek) {
    function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
    function getS(nom, i) { return shiftsForWeek.find(s => s.salarie === nom && s.jour === i) }

    const hasShift  = nom => shiftsForWeek.some(s => s.salarie === nom)
    const tempNames = [...new Set(shiftsForWeek.filter(s => !salaryNames.has(s.salarie) && !isGerant(s.salarie)).map(s => s.salarie))]
    const rows = [...employees.filter(e => hasShift(e.nom)), ...tempNames.map(nom => ({ nom }))]

    const label = weekLabel(isoMonday)

    if (rows.length === 0) {
      return `<div class="wk-label">${esc(label)}</div><p style="color:#aaa;font-style:italic;font-size:9pt;margin:4px 0 0">Aucun horaire saisi</p>`
    }

    const thead = `<tr>
      <th class="name-col">Salarié</th>
      ${JOURS.map((j, i) => {
        const d = parseLocal(addDays(isoMonday, i))
        return `<th>${esc(j)}<br><span class="sub">${esc(fmtShort(d))}</span></th>`
      }).join('')}
    </tr>`

    const tbody = rows.map(row => {
      const nom   = row.nom
      const color = colorMap[nom] || '#3b82f6'
      const cells = JOURS.map((_, i) => {
        const s = getS(nom, i)
        if (!s) return '<td></td>'
        const note = s.note ? `<br><span class="note">${esc(s.note)}</span>` : ''
        return `<td><span class="shift" style="border-left-color:${color};background:${color}18">${esc(fmtH(s.heureDebut))} – ${esc(fmtH(s.heureFin))}${note}</span></td>`
      }).join('')
      return `<tr>
        <td class="name-cell"><span class="dot" style="background:${color}"></span>${esc(nom)}</td>
        ${cells}
      </tr>`
    }).join('')

    return `<div class="wk-label">${esc(label)}</div>
<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
  }

  function buildPrintPage(mag, content) {
    function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
    return `<!DOCTYPE html>
<html lang="fr"><head>
  <meta charset="utf-8">
  <title>Planning ${esc(mag)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 10pt; color: #111; padding: 13mm 14mm; }
    h1 { font-size: 15pt; font-weight: 800; letter-spacing: -.3px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #222; }
    .wk-label { font-size: 8pt; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin: 0 0 5px; }
    .sep { height: 2px; background: #bbb; margin: 30px 0 22px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #bbb; }
    th { background: #f0f0f0; color: #333; font-size: 8.5pt; font-weight: 700; padding: 5px 6px; text-align: center; border: 1px solid #ccc; }
    th.name-col { text-align: left; width: 130px; }
    .sub { font-weight: 400; font-size: 7.5pt; opacity: .7; }
    td { border: 1px solid #ddd; padding: 4px 5px; text-align: center; vertical-align: middle; height: 28px; }
    td.name-cell { text-align: left; background: #f7f7f7; font-weight: 600; font-size: 9pt; padding-left: 8px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .shift { display: inline-block; border-left: 3px solid; border-radius: 3px; padding: 2px 7px; font-size: 8.5pt; font-weight: 700; }
    .note { font-size: 7pt; font-weight: 400; opacity: .65; }
  </style>
</head><body>
  <h1>Planning ${esc(mag)}</h1>
  ${content}
</body></html>`
  }

  function openPrintWindow(html) {
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    w.onafterprint = () => w.close()
    setTimeout(() => w.print(), 250)
  }

  // ── Derived UI values ───────────────────────────────────────────────────
  const todayJour    = JOURS.findIndex((_, i) => addDays(semaine, i) === today)
  const currentLabel = weekLabel(semaine)
  const nbTotal      = pendingWeeks.length + 1   // semaines à imprimer ensemble
  const printBtnLabel = pendingWeeks.length === 0
    ? '🖨 Imprimer'
    : `🖨 Imprimer les ${nbTotal} semaines`

  return (
    <>
      <style>{`
        .plan-cell:hover { background: var(--accent-bg) !important; }
        .copy-btn { opacity: 0; transition: opacity .15s; }
        .plan-cell:hover .copy-btn { opacity: 1; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-grad)' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <button onClick={onHome} style={iconBtn}>←</button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>📅 Planning</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button onClick={() => setSemaine(s => addDays(s, -7))} style={navBtn}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 244, textAlign: 'center' }}>
              {currentLabel}
            </span>
            <button onClick={() => setSemaine(s => addDays(s, 7))} style={navBtn}>›</button>
          </div>

          <button onClick={() => setSemaine(isoDate(mondayOf(new Date())))}
            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
            Aujourd'hui
          </button>

          <select value={magasin} onChange={e => selectMagasin(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--surface)', color: magasin ? 'var(--text)' : 'var(--text-4)', cursor: 'pointer' }}>
            <option value="">— Magasin —</option>
            {(magasins || []).map(m => <option key={m.id} value={m.nom}>{m.nom}</option>)}
          </select>

          {clipboard && (
            <span style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              📋 {fmtH(clipboard.heureDebut)}–{fmtH(clipboard.heureFin)} copié
              <button onClick={() => setClipboard(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}

          {undoStack.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>Ctrl+Z ({undoStack.length})</span>
          )}

          <button onClick={onPrintClick}
            style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: pendingWeeks.length ? 'none' : '1px solid var(--border)', background: pendingWeeks.length ? 'var(--accent)' : 'var(--surface)', color: pendingWeeks.length ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: pendingWeeks.length ? 700 : 400 }}>
            {printBtnLabel}
          </button>
        </div>

        {/* ── Bandeau semaines en attente ─────────────────────────────────── */}
        {pendingWeeks.length > 0 && (
          <div style={{
            background: 'var(--accent-bg)', borderBottom: '1px solid var(--accent)',
            padding: '8px 16px', fontSize: 13, color: 'var(--accent)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span>🕐</span>
            <span>
              {pendingWeeks.length === 1
                ? <><strong>{weekLabel(pendingWeeks[0])}</strong> en attente</>
                : <><strong>{weekLabel(pendingWeeks[0])}</strong> et <strong>{weekLabel(pendingWeeks[1])}</strong> en attente</>
              }
              {pendingWeeks.length < 2
                ? <> — remplissez cette semaine puis cliquez <strong>{printBtnLabel}</strong> pour tout imprimer.</>
                : <> — cliquez <strong>{printBtnLabel}</strong> pour imprimer les 3 semaines ensemble.</>
              }
            </span>
            <button onClick={cancelPending}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--accent)', borderRadius: 6, cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: '3px 10px' }}>
              Annuler
            </button>
          </div>
        )}

        {/* ── Grille ─────────────────────────────────────────────────────── */}
        {!magasin ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-4)', fontSize: 15 }}>
            Sélectionnez un magasin pour afficher le planning
          </div>
        ) : (
          <div style={{ overflowX: 'auto', padding: '20px 16px' }}>
            <table className="plan-tbl" style={{
              borderCollapse: 'collapse', minWidth: 700, width: '100%',
              background: 'var(--surface)', borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <thead>
                <tr>
                  <th style={{ width: 150, padding: '10px 14px', textAlign: 'left', background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
                    Salarié
                  </th>
                  {JOURS.map((j, i) => {
                    const isToday = i === todayJour
                    return (
                      <th key={j} style={{
                        minWidth: 110, padding: '10px 6px', textAlign: 'center',
                        background: isToday ? 'var(--accent-bg)' : 'var(--surface-2)',
                        borderBottom: '2px solid var(--border)', borderLeft: '1px solid var(--border)',
                        fontSize: 13, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-2)',
                      }}>
                        <div>{j}</div>
                        <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
                          {fmtShort(parseLocal(addDays(semaine, i)))}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {displayRows.map((row, rowIdx) => {
                  const nom    = row.nom || ''
                  const isReal = !!nom
                  const color  = colorMap[nom] || '#94a3b8'
                  const rowBg  = rowIdx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'

                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>

                      <td style={{
                        padding: '0 14px', height: 54,
                        borderRight: '2px solid var(--border)',
                        background: 'var(--surface-2)', verticalAlign: 'middle',
                      }}>
                        {isReal ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{nom}</span>
                            {row.isTemp && (
                              <button onClick={() => removeExtraRow(nom)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-5)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-5)'}>×</button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-5)', fontSize: 13 }}>—</span>
                        )}
                      </td>

                      {JOURS.map((j, jourIdx) => {
                        if (!isReal) {
                          return (
                            <td key={j} style={{
                              borderLeft: '1px solid var(--border)', height: 54,
                              background: jourIdx === todayJour ? 'var(--accent-bg)' : rowBg,
                            }} />
                          )
                        }

                        const shift    = getShift(nom, jourIdx)
                        const isActive = active?.salarie === nom && active?.jour === jourIdx
                        const isToday  = jourIdx === todayJour

                        return (
                          <td key={j}
                            className="plan-cell"
                            onClick={e => {
                              e.stopPropagation()
                              setActive({ salarie: nom, jour: jourIdx, anchorRect: e.currentTarget.getBoundingClientRect(), shift })
                            }}
                            style={{
                              borderLeft: '1px solid var(--border)', height: 54,
                              background: isActive ? 'var(--accent-bg)' : isToday ? 'var(--accent-bg)' : rowBg,
                              cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle',
                              userSelect: 'none', transition: 'background 0.1s', position: 'relative',
                            }}
                          >
                            {shift ? (
                              <div style={{ padding: '0 8px', position: 'relative' }}>
                                <div className="shift-block" style={{
                                  display: 'inline-block',
                                  background: color + '22', borderLeft: `3px solid ${color}`,
                                  borderRadius: 5, padding: '4px 9px',
                                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                                }}>
                                  {fmtH(shift.heureDebut)} – {fmtH(shift.heureFin)}
                                </div>
                                {shift.note && (
                                  <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>{shift.note}</div>
                                )}
                                <button
                                  className="copy-btn"
                                  onClick={e => { e.stopPropagation(); setClipboard({ heureDebut: shift.heureDebut, heureFin: shift.heureFin, note: shift.note || '' }) }}
                                  title="Copier ces horaires"
                                  style={{ position: 'absolute', top: 2, right: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10, cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1.4 }}>
                                  📋
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--border)', fontSize: 22, lineHeight: 1 }}>+</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                <tr style={{ borderTop: '2px dashed var(--border)' }}>
                  <td colSpan={7} style={{ padding: '10px 14px' }}>
                    {addingExtra ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input autoFocus value={extraName}
                          onChange={e => setExtraName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') confirmAddExtra(); if (e.key === 'Escape') setAddingExtra(false) }}
                          placeholder="Prénom du remplaçant…"
                          style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--accent)', borderRadius: 7, fontSize: 13, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                        />
                        <button onClick={confirmAddExtra} disabled={!extraName.trim()}
                          style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          Ajouter
                        </button>
                        <button onClick={() => { setAddingExtra(false); setExtraName('') }}
                          style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13 }}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingExtra(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 13, padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}>
                        <span style={{ fontSize: 18, fontWeight: 300, lineHeight: 1 }}>＋</span>
                        Ajouter un remplaçant
                      </button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Popover cellule ────────────────────────────────────────────────── */}
      {active && (
        <CellPopover
          shift={active.shift}
          salarie={active.salarie}
          jour={active.jour}
          anchorRect={active.anchorRect}
          clipboard={clipboard}
          onCopy={setClipboard}
          onSave={v => handleSave(active.salarie, active.jour, v)}
          onClose={() => setActive(null)}
        />
      )}

      {/* ── Modale confirmation impression ─────────────────────────────────── */}
      {showPrintModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100 }}
            onClick={() => setShowPrintModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,0.25)', padding: 28, zIndex: 1101,
            width: 410, maxWidth: '92vw',
          }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
              🖨 Impression du planning
            </div>

            {pendingWeeks.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 22 }}>
                Voulez-vous attendre le planning de la <strong>semaine suivante</strong> pour les imprimer ensemble sur une même page ?
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 22 }}>
                Vous avez déjà <strong>1 semaine en attente</strong>. Voulez-vous attendre encore la semaine suivante pour imprimer <strong>3 plannings</strong> sur la même page ?
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onPrintNow}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13 }}>
                {pendingWeeks.length === 0 ? 'Non, imprimer maintenant' : `Imprimer les ${nbTotal} semaines`}
              </button>
              <button onClick={onWaitNextWeek}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {pendingWeeks.length === 0 ? 'Oui, attendre' : 'Attendre encore'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

const iconBtn = { width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, color: 'var(--text-2)' }
const navBtn  = { width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 18, color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }

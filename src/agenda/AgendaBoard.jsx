import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import AgendaModal from './AgendaModal'
import { isoDate, parseLocal, mondayOf, fmtDayShort, fmtDayLabel, fmtShort } from './dates'
import { GOOGLE_CALENDARS, GOOGLE_API_KEY, fetchGoogleEvents, rangeFor } from './googleCalendars'

const MODES = [['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']]
const WD = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
function accentOf(e) { return e.source === 'google' ? e.color : 'var(--accent)' }

export default function AgendaBoard() {
  const [mode,         setMode]         = useState('semaine')
  const [cursor,       setCursor]       = useState(() => isoDate(new Date()))
  const [googleEvents, setGoogleEvents] = useState([])
  const [formDate,     setFormDate]     = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editEvent,    setEditEvent]    = useState(null)
  const [detail,       setDetail]       = useState(null) // événement Google (lecture seule)

  const today = isoDate(new Date())
  const cur = parseLocal(cursor)

  const data = useLiveQuery(async () => {
    const rows = await db.evenements.toArray()
    return rows
  }, [])

  useEffect(() => {
    let active = true
    const { timeMin, timeMax } = rangeFor(mode, parseLocal(cursor), mondayOf)
    fetchGoogleEvents(timeMin, timeMax).then(evs => { if (active) setGoogleEvents(evs) })
    return () => { active = false }
  }, [mode, cursor])

  const byDay = useMemo(() => {
    const m = {}
    const appEvents = (data ?? []).map(x => ({ ...x, source: 'app' }))
    for (const e of [...appEvents, ...googleEvents]) { (m[e.date] ||= []).push(e) }
    for (const k in m) m[k].sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
    return m
  }, [data, googleEvents])

  function onEvent(e) { if (e.source === 'google') setDetail(e); else setEditEvent(e) }
  function openNew(date) { setFormDate(date); setShowForm(true) }
  function openDay(iso)  { setCursor(iso); setMode('jour') }
  function openMonth(d)  { setCursor(isoDate(d)); setMode('mois') }

  function shift(delta) {
    const d = parseLocal(cursor)
    if (mode === 'jour')         d.setDate(d.getDate() + delta)
    else if (mode === 'semaine') d.setDate(d.getDate() + delta * 7)
    else if (mode === 'mois')    d.setMonth(d.getMonth() + delta)
    else                         d.setFullYear(d.getFullYear() + delta)
    setCursor(isoDate(d))
  }

  let label
  if (mode === 'jour')         label = `${fmtDayLabel(cur)} ${cur.getFullYear()}`
  else if (mode === 'semaine') { const mon = mondayOf(cur); const sat = new Date(mon); sat.setDate(mon.getDate() + 5); label = `Semaine du ${fmtShort(mon)} au ${fmtShort(sat)}` }
  else if (mode === 'mois')    label = `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`
  else                         label = String(cur.getFullYear())

  return (
    <div style={{ width: '100%' }}>
      {showForm  && <AgendaModal defaultDate={formDate} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {editEvent && <AgendaModal event={editEvent} onClose={() => setEditEvent(null)} onSaved={() => setEditEvent(null)} />}
      {detail    && <GoogleDetail event={detail} onClose={() => setDetail(null)} />}

      {/* Barre : titre + sélecteur de vue */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>📅 Agenda</h2>
        <div style={{ display: 'inline-flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, gap: 2 }}>
          {MODES.map(([m, lbl]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: mode === m ? 'var(--surface)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-3)',
                boxShadow: mode === m ? '0 1px 3px var(--shadow)' : 'none',
              }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
        <button onClick={() => shift(-1)} title="Précédent"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-2)' }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 180, textAlign: 'center' }}>{label}</span>
        <button onClick={() => shift(1)} title="Suivant"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--text-2)' }}>→</button>
        <button onClick={() => setCursor(today)}
          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Aujourd'hui</button>
      </div>

      {/* Légende des couleurs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 14, fontSize: 12, color: 'var(--text-3)' }}>
        <Legend color="var(--accent)" label="Mes événements" />
        {GOOGLE_CALENDARS.map(c => <Legend key={c.id} color={c.color} label={c.label} />)}
        {!GOOGLE_API_KEY && <span style={{ color: '#f59e0b' }}>⚠️ Google non configuré</span>}
      </div>

      {data === undefined ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>Chargement…</div>
      ) : (
        <>
          {mode === 'jour'    && <DayView    cursor={cursor} byDay={byDay} today={today} onAdd={openNew} onEvent={onEvent} />}
          {mode === 'semaine' && <WeekView   cur={cur} byDay={byDay} today={today} onAdd={openNew} onEvent={onEvent} />}
          {mode === 'mois'    && <MonthView  cur={cur} byDay={byDay} today={today} onDay={openDay} />}
          {mode === 'annee'   && <YearView   cur={cur} byDay={byDay} today={today} onMonth={openMonth} />}
        </>
      )}
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
    </span>
  )
}

function EventChip({ e, onEvent, compact }) {
  const accent = accentOf(e)
  return (
    <button onClick={() => onEvent(e)} title={e.source === 'google' ? `${e.calLabel}${e.note ? ' — ' + e.note : ''}` : (e.note || 'Modifier')}
      style={{
        width: '100%', textAlign: 'left', border: 'none', borderLeft: `3px solid ${accent}`,
        borderRadius: 7, cursor: 'pointer', background: 'var(--surface-2)',
        padding: compact ? '5px 8px' : '8px 12px', display: 'flex', flexDirection: 'column', gap: 1,
      }}>
      <span style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: accent }}>
        {e.heure || '—'}{e.note ? ' 📝' : ''}{e.source === 'google' ? ' ·' : ''}
      </span>
      <span style={{ fontSize: compact ? 13 : 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {e.titre || '(sans titre)'}
      </span>
    </button>
  )
}

// ─── Vue JOUR ─────────────────────────────────────────────────────────────────
function DayView({ cursor, byDay, today, onAdd, onEvent }) {
  const events = byDay[cursor] || []
  const isToday = cursor === today
  return (
    <div className="store-card" style={{ padding: 0, overflow: 'hidden', border: isToday ? '2px solid var(--accent-border)' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isToday ? 'var(--accent-bg)' : 'var(--surface-2)', borderBottom: '1px solid var(--surface-3)' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: isToday ? 'var(--accent-2)' : 'var(--text-2)' }}>{cap(fmtDayLabel(parseLocal(cursor)))}{isToday && ' · Aujourd’hui'}</span>
        <button onClick={() => onAdd(cursor)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--accent)', fontSize: 16 }}>+</button>
      </div>
      {events.length === 0
        ? <div style={{ padding: '16px', color: 'var(--text-5)', fontSize: 14 }}>Aucun événement</div>
        : <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>{events.map(e => <EventChip key={e.id} e={e} onEvent={onEvent} />)}</div>}
    </div>
  )
}

// ─── Vue SEMAINE (Lun → Sam) ──────────────────────────────────────────────────
function WeekView({ cur, byDay, today, onAdd, onEvent }) {
  const mon = mondayOf(cur)
  const days = Array.from({ length: 6 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(150px, 1fr))', gap: 10, minWidth: 6 * 150 }}>
        {days.map(d => {
          const iso = isoDate(d)
          const events = byDay[iso] || []
          const isToday = iso === today
          return (
            <div key={iso} style={{ background: 'var(--surface)', borderRadius: 12, overflow: 'hidden', border: isToday ? '2px solid var(--accent-border)' : '1px solid var(--border)', boxShadow: '0 1px 4px var(--shadow-sm)', minHeight: 120, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: isToday ? 'var(--accent-bg)' : 'var(--surface-2)', borderBottom: '1px solid var(--surface-3)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? 'var(--accent-2)' : 'var(--text-2)' }}>{fmtDayShort(d)}</span>
                <button onClick={() => onAdd(iso)} title="Ajouter" style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--accent)', fontSize: 15, lineHeight: 1 }}>+</button>
              </div>
              <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {events.length === 0
                  ? <div style={{ color: 'var(--text-5)', fontSize: 12, padding: '6px 4px' }}>—</div>
                  : events.map(e => <EventChip key={e.id} e={e} onEvent={onEvent} compact />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vue MOIS ─────────────────────────────────────────────────────────────────
function MonthView({ cur, byDay, today, onDay }) {
  const y = cur.getFullYear(), mth = cur.getMonth()
  const first = new Date(y, mth, 1)
  const start = mondayOf(first)
  const daysInMonth = new Date(y, mth + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })

  return (
    <div className="store-card" style={{ padding: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase' }}>{w}</div>)}
        {cells.map(d => {
          const iso = isoDate(d)
          const inMonth = d.getMonth() === mth
          const isToday = iso === today
          const events = byDay[iso] || []
          return (
            <button key={iso} onClick={() => onDay(iso)}
              style={{
                textAlign: 'left', border: '1px solid var(--surface-3)', borderRadius: 8, cursor: 'pointer',
                background: isToday ? 'var(--accent-bg)' : 'var(--surface)', opacity: inMonth ? 1 : 0.4,
                minHeight: 78, padding: 6, display: 'flex', flexDirection: 'column', gap: 3,
              }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent-2)' : 'var(--text-2)', alignSelf: 'flex-start' }}>{d.getDate()}</span>
              {events.slice(0, 3).map(e => (
                <span key={e.id} style={{ fontSize: 11, color: 'var(--text)', background: accentOf(e) === 'var(--accent)' ? 'var(--accent-bg)' : accentOf(e) + '22', borderLeft: `2px solid ${accentOf(e)}`, borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.heure ? e.heure + ' ' : ''}{e.titre}
                </span>
              ))}
              {events.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-4)' }}>+{events.length - 3}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Vue ANNÉE ────────────────────────────────────────────────────────────────
function YearView({ cur, byDay, today, onMonth }) {
  const y = cur.getFullYear()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
      {MONTHS.map((name, mth) => {
        const first = new Date(y, mth, 1)
        const start = mondayOf(first)
        const daysInMonth = new Date(y, mth + 1, 0).getDate()
        const lead = (first.getDay() + 6) % 7
        const weeks = Math.ceil((lead + daysInMonth) / 7)
        const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
        return (
          <button key={mth} onClick={() => onMonth(first)}
            style={{ textAlign: 'left', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', cursor: 'pointer', padding: 12, boxShadow: '0 1px 4px var(--shadow-sm)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-2)', marginBottom: 8 }}>{name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map(d => {
                const iso = isoDate(d)
                const inMonth = d.getMonth() === mth
                const isToday = iso === today
                const has = inMonth && (byDay[iso] || []).length > 0
                return (
                  <span key={iso} style={{
                    fontSize: 10, textAlign: 'center', lineHeight: '18px', height: 18, borderRadius: '50%',
                    color: !inMonth ? 'transparent' : isToday ? '#fff' : has ? 'var(--accent-2)' : 'var(--text-3)',
                    fontWeight: has || isToday ? 700 : 400,
                    background: isToday ? 'var(--accent)' : has ? 'var(--accent-bg-2)' : 'transparent',
                  }}>{inMonth ? d.getDate() : ''}</span>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Détail d'un événement Google (lecture seule) ─────────────────────────────
function GoogleDetail({ event, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event.titre}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', background: event.color, padding: '3px 10px', borderRadius: 999 }}>
            {event.calLabel}
          </span>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
            {event.heure ? `🕐 ${event.heure}` : '📆 Journée entière'}{event.lieu ? ` · 📍 ${event.lieu}` : ''}
          </p>
          {event.note && <p style={{ whiteSpace: 'pre-wrap', fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>{event.note}</p>}
          <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Événement Google — lecture seule</p>
        </div>
      </div>
    </div>
  )
}

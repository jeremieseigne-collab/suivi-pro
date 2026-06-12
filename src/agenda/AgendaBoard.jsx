import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import AgendaModal from './AgendaModal'
import { isoDate, parseLocal, mondayOf, fmtDayShort, fmtDayLabel, fmtShort } from './dates'

const MODES = [['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']]
const WD = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default function AgendaBoard() {
  const [mode,      setMode]      = useState('semaine')
  const [cursor,    setCursor]    = useState(() => isoDate(new Date()))
  const [formDate,  setFormDate]  = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [editEvent, setEditEvent] = useState(null)

  const today = isoDate(new Date())
  const cur = parseLocal(cursor)

  const data = useLiveQuery(async () => {
    const rows = await db.evenements.toArray()
    rows.sort((a, b) => (a.heure || '').localeCompare(b.heure || ''))
    return rows
  }, [])

  const byDay = useMemo(() => {
    const m = {}
    for (const e of (data ?? [])) { (m[e.date] ||= []).push(e) }
    return m
  }, [data])

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

      {/* Barre : titre + sélecteur de vue */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>📅 Agenda</h2>
        <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: 10, padding: 3, gap: 2 }}>
          {MODES.map(([m, lbl]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#0f172a' : '#64748b',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={() => shift(-1)} title="Précédent"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#475569' }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', minWidth: 180, textAlign: 'center' }}>{label}</span>
        <button onClick={() => shift(1)} title="Suivant"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#475569' }}>→</button>
        <button onClick={() => setCursor(today)}
          style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Aujourd'hui</button>
      </div>

      {data === undefined ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>
      ) : (
        <>
          {mode === 'jour'    && <DayView    cursor={cursor} byDay={byDay} today={today} onAdd={openNew} onEdit={setEditEvent} />}
          {mode === 'semaine' && <WeekView   cur={cur} byDay={byDay} today={today} onAdd={openNew} onEdit={setEditEvent} />}
          {mode === 'mois'    && <MonthView  cur={cur} byDay={byDay} today={today} onDay={openDay} />}
          {mode === 'annee'   && <YearView   cur={cur} byDay={byDay} today={today} onMonth={openMonth} />}
        </>
      )}
    </div>
  )
}

// ─── Vue JOUR ─────────────────────────────────────────────────────────────────
function DayView({ cursor, byDay, today, onAdd, onEdit }) {
  const events = byDay[cursor] || []
  const isToday = cursor === today
  return (
    <div className="store-card" style={{ padding: 0, overflow: 'hidden', border: isToday ? '2px solid #93c5fd' : '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: isToday ? '#eff6ff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: isToday ? '#2563eb' : '#475569' }}>{cap(fmtDayLabel(parseLocal(cursor)))}{isToday && ' · Aujourd’hui'}</span>
        <button onClick={() => onAdd(cursor)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#3b82f6', fontSize: 16 }}>+</button>
      </div>
      {events.length === 0
        ? <div style={{ padding: '16px', color: '#cbd5e1', fontSize: 14 }}>Aucun événement</div>
        : events.map((e, i) => <EventRow key={e.id} e={e} first={i === 0} onEdit={onEdit} />)}
    </div>
  )
}

// ─── Vue SEMAINE (Lun → Sam) ──────────────────────────────────────────────────
function WeekView({ cur, byDay, today, onAdd, onEdit }) {
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
            <div key={iso} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: isToday ? '2px solid #93c5fd' : '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: 120, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: isToday ? '#eff6ff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#2563eb' : '#475569' }}>{fmtDayShort(d)}</span>
                <button onClick={() => onAdd(iso)} title="Ajouter" style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#3b82f6', fontSize: 15, lineHeight: 1 }}>+</button>
              </div>
              <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {events.length === 0
                  ? <div style={{ color: '#cbd5e1', fontSize: 12, padding: '6px 4px' }}>—</div>
                  : events.map(e => (
                    <button key={e.id} onClick={() => onEdit(e)} title={e.note || 'Modifier'}
                      style={{ textAlign: 'left', border: 'none', borderRadius: 7, cursor: 'pointer', background: '#eff6ff', padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{e.heure || '—'}{e.note ? ' 📝' : ''}</span>
                      <span style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titre || '(sans titre)'}</span>
                    </button>
                  ))}
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
        {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{w}</div>)}
        {cells.map(d => {
          const iso = isoDate(d)
          const inMonth = d.getMonth() === mth
          const isToday = iso === today
          const events = byDay[iso] || []
          return (
            <button key={iso} onClick={() => onDay(iso)}
              style={{
                textAlign: 'left', border: '1px solid #f1f5f9', borderRadius: 8, cursor: 'pointer',
                background: isToday ? '#eff6ff' : '#fff', opacity: inMonth ? 1 : 0.4,
                minHeight: 78, padding: 6, display: 'flex', flexDirection: 'column', gap: 3,
              }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? '#2563eb' : '#475569', alignSelf: 'flex-start' }}>{d.getDate()}</span>
              {events.slice(0, 3).map(e => (
                <span key={e.id} style={{ fontSize: 11, color: '#1e293b', background: '#eff6ff', borderRadius: 4, padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.heure ? e.heure + ' ' : ''}{e.titre}
                </span>
              ))}
              {events.length > 3 && <span style={{ fontSize: 10, color: '#94a3b8' }}>+{events.length - 3}</span>}
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
            style={{ textAlign: 'left', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', cursor: 'pointer', padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>{name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map(d => {
                const iso = isoDate(d)
                const inMonth = d.getMonth() === mth
                const isToday = iso === today
                const has = inMonth && (byDay[iso] || []).length > 0
                return (
                  <span key={iso} style={{
                    fontSize: 10, textAlign: 'center', lineHeight: '18px', height: 18, borderRadius: '50%',
                    color: !inMonth ? 'transparent' : isToday ? '#fff' : has ? '#1d4ed8' : '#64748b',
                    fontWeight: has || isToday ? 700 : 400,
                    background: isToday ? '#3b82f6' : has ? '#dbeafe' : 'transparent',
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

// ─── Ligne d'événement (vues jour) ────────────────────────────────────────────
function EventRow({ e, first, onEdit }) {
  return (
    <button onClick={() => onEdit(e)} title={e.note || 'Modifier'}
      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', border: 'none', borderTop: first ? 'none' : '1px solid #f1f5f9', background: '#fff', cursor: 'pointer' }}>
      <span style={{ minWidth: 48, fontWeight: 700, fontSize: 14, color: e.heure ? '#0f172a' : '#cbd5e1' }}>{e.heure || '—'}</span>
      <span style={{ flex: 1, fontSize: 15, color: '#0f172a' }}>{e.titre || '(sans titre)'}{e.note ? ' 📝' : ''}</span>
    </button>
  )
}

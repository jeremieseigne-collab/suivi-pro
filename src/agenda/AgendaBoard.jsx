import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import AgendaModal from './AgendaModal'
import { isoDate, parseLocal, mondayOf, fmtDayShort, fmtDayLabel, fmtShort } from './dates'
import { useMediaQuery, PHONE, TABLET } from '../lib/useMediaQuery'
import { GOOGLE_CALENDARS, fetchGoogleEvents, messageCalendriers, rangeFor } from './googleCalendars'
import Icone from '../components/ui/Icone'
import { useCompte } from '../context/CompteContext'
import './agenda.css'

// Agenda partagé : événements saisis dans l'outil (table evenements, modifiables par tous les comptes connectés)
// + 3 calendriers Google des magasins (lecture seule, couleurs par magasin). 4 vues : Jour, Semaine, Mois, Année.
const MODES = [['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['annee', 'Année']]
const WD = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const VIOLET = '#8b5cf6'   // même couleur que les événements de l'outil dans « À venir » (accueil)
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
const plus1 = iso => { const d = parseLocal(iso); d.setDate(d.getDate() + 1); return isoDate(d) }

export default function AgendaBoard() {
  const couleurOutil = VIOLET   // décision G1
  const accentOf = e => e.source === 'google' ? e.color : couleurOutil
  const [mode,         setMode]         = useState('mois')
  const [cursor,       setCursor]       = useState(() => isoDate(new Date()))
  const [googleEvents, setGoogleEvents] = useState([])
  const { estDirection } = useCompte()
  const [formDate,     setFormDate]     = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editEvent,    setEditEvent]    = useState(null)
  const [detail,       setDetail]       = useState(null) // événement Google (lecture seule)
  const today = isoDate(new Date())
  const cur = parseLocal(cursor)
  const phone  = useMediaQuery(PHONE)
  const tablet = useMediaQuery(TABLET)
  const nbJoursSemaine = 7   // décision G2 : lundi → dimanche

  const data = useLiveQuery(() => db.evenements.toArray(), [])

  useEffect(() => {
    let active = true
    const { timeMin, timeMax } = rangeFor(mode, parseLocal(cursor), mondayOf)
    if (mode === 'semaine') timeMax.setDate(timeMax.getDate() + 1)   // G2 : charger aussi le dimanche
    fetchGoogleEvents(timeMin, timeMax).then(evs => { if (active) setGoogleEvents(evs) })
    return () => { active = false }
  }, [mode, cursor])

  const byDay = useMemo(() => {
    const m = {}
    const appEvents = (data ?? []).map(x => ({ ...x, source: 'app' }))
    for (const e of [...appEvents, ...googleEvents]) {
      (m[e.date] ||= []).push(e)
      // Décision G3 : un événement des calendriers sur plusieurs jours apparaît aussi les jours suivants (62 jours au plus)
      if (e.source === 'google' && e.dateFin && e.dateFin > e.date) {
        let d = plus1(e.date), n = 0
        while (d <= e.dateFin && n++ < 62) { (m[d] ||= []).push({ ...e, suite: true }); d = plus1(d) }
      }
    }
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
  else if (mode === 'semaine') { const mon = mondayOf(cur); const fin = new Date(mon); fin.setDate(mon.getDate() + nbJoursSemaine - 1); label = `Semaine du ${fmtShort(mon)} au ${fmtShort(fin)}` }
  else if (mode === 'mois')    label = `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`
  else                         label = String(cur.getFullYear())

  const props = { byDay, today, accentOf, onEvent }
  return (
    <div className="agenda">
      {showForm  && <AgendaModal defaultDate={formDate} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {editEvent && <AgendaModal event={editEvent} onClose={() => setEditEvent(null)} onSaved={() => setEditEvent(null)} />}
      {detail    && <GoogleDetail event={detail} onClose={() => setDetail(null)} />}

      <div className="agenda-barre">
        <div className="segment" role="group" aria-label="Vue">
          {MODES.map(([m, lbl]) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{lbl}</button>)}
        </div>
        <button className="btn btn-prim" onClick={() => openNew(mode === 'jour' ? cursor : today)}><Icone nom="ajout" taille={18} />Nouvel événement</button>
      </div>

      <div className="agenda-nav">
        <button className="icone-btn" onClick={() => shift(-1)} aria-label="Précédent"><Icone nom="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
        <span className="libelle">{label}</span>
        <button className="icone-btn" onClick={() => shift(1)} aria-label="Suivant"><Icone nom="chevron" /></button>
        <button className="chip" onClick={() => setCursor(today)}>Aujourd’hui</button>
      </div>

      <div className="agenda-legende">
        <span><i style={{ background: couleurOutil }} />Événements de l’outil</span>
        {GOOGLE_CALENDARS.map(c => <span key={c.cle}><i style={{ background: c.color }} />{c.label}</span>)}
        {messageCalendriers(googleEvents) && <span className="aide att">{messageCalendriers(googleEvents, estDirection)}</span>}
      </div>

      {data === undefined ? <div className="vide">Chargement…</div> : (
        <>
          {mode === 'jour'    && <DayView    cursor={cursor} onAdd={openNew} {...props} />}
          {mode === 'semaine' && <WeekView   cur={cur} nbJours={nbJoursSemaine} onAdd={openNew} stacked={tablet} {...props} />}
          {mode === 'mois'    && <MonthView  cur={cur} onDay={openDay} dots={phone} {...props} />}
          {mode === 'annee'   && <YearView   cur={cur} onMonth={openMonth} small={phone} {...props} />}
        </>
      )}
    </div>
  )
}

function EventChip({ e, onEvent, accentOf, compact }) {
  const accent = accentOf(e)
  const quand = e.heure || (e.source === 'google' ? (e.dateFin && e.dateFin > e.date ? `jusqu’au ${fmtShort(parseLocal(e.dateFin))}` : 'Journée') : '—')
  return (
    <button className={`agenda-evt ${compact ? 'compact' : ''}`} onClick={() => onEvent(e)} style={{ borderLeftColor: accent }}
      title={e.source === 'google' ? `${e.calLabel}${e.note ? ' — ' + e.note : ''}` : (e.note || 'Modifier')}>
      <span className="quand" style={{ color: accent }}>{quand}{e.note ? ' · note' : ''}</span>
      <span className="quoi">{e.titre || '(sans titre)'}</span>
    </button>
  )
}

// ─── Vue JOUR ───
function DayView({ cursor, byDay, today, onAdd, onEvent, accentOf }) {
  const events = byDay[cursor] || []
  const isToday = cursor === today
  return (
    <div className={`carte agenda-jour ${isToday ? 'aujourdhui' : ''}`}>
      <div className="entete-jour">
        <span>{cap(fmtDayLabel(parseLocal(cursor)))}{isToday && ' · aujourd’hui'}</span>
        <button className="icone-btn" onClick={() => onAdd(cursor)} aria-label="Ajouter un événement ce jour"><Icone nom="ajout" /></button>
      </div>
      {events.length === 0
        ? <div className="aide" style={{ padding: 16 }}>Aucun événement</div>
        : <div className="evts">{events.map((e, i) => <EventChip key={e.id + '-' + i} e={e} onEvent={onEvent} accentOf={accentOf} />)}</div>}
    </div>
  )
}

// ─── Vue SEMAINE (lundi → dimanche) ───
function WeekView({ cur, nbJours, byDay, today, onAdd, onEvent, accentOf, stacked }) {
  const mon = mondayOf(cur)
  const days = Array.from({ length: nbJours }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
  return (
    <div className={`agenda-semaine ${stacked ? 'empilee' : ''}`} style={stacked ? undefined : { gridTemplateColumns: `repeat(${nbJours}, minmax(0, 1fr))` }}>
      {days.map(d => {
        const iso = isoDate(d)
        const events = byDay[iso] || []
        const isToday = iso === today
        return (
          <div key={iso} className={`carte agenda-jour ${isToday ? 'aujourdhui' : ''}`}>
            <div className="entete-jour petit">
              <span>{fmtDayShort(d)}</span>
              <button className="icone-btn petit" onClick={() => onAdd(iso)} aria-label={`Ajouter un événement le ${fmtDayShort(d)}`}><Icone nom="ajout" taille={18} /></button>
            </div>
            <div className="evts">
              {events.length === 0 ? <div className="aide" style={{ padding: '4px 2px' }}>—</div>
                : events.map((e, i) => <EventChip key={e.id + '-' + i} e={e} onEvent={onEvent} accentOf={accentOf} compact />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Vue MOIS ───
function MonthView({ cur, byDay, today, onDay, dots, accentOf }) {
  const y = cur.getFullYear(), mth = cur.getMonth()
  const first = new Date(y, mth, 1)
  const start = mondayOf(first)
  const daysInMonth = new Date(y, mth + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  return (
    <div className={`carte agenda-mois ${dots ? 'points' : ''}`}>
      {WD.map(w => <div key={w} className="jour-semaine">{w}</div>)}
      {cells.map(d => {
        const iso = isoDate(d)
        const inMonth = d.getMonth() === mth
        const isToday = iso === today
        const events = byDay[iso] || []
        return (
          <button key={iso} onClick={() => onDay(iso)} className={`case-mois ${isToday ? 'aujourdhui' : ''} ${inMonth ? '' : 'hors'}`} aria-label={`${d.getDate()} : ${events.length} événement${events.length > 1 ? 's' : ''}`}>
            <span className="num-jour">{d.getDate()}</span>
            {dots ? (
              <span className="pastilles">
                {events.slice(0, 4).map((e, i) => <i key={i} style={{ background: accentOf(e) }} />)}
                {events.length > 4 && <span className="encore">+</span>}
              </span>
            ) : events.slice(0, 3).map((e, i) => (
              <span key={i} className="evt-mois" style={{ borderLeftColor: accentOf(e), background: `color-mix(in srgb, ${accentOf(e)} 14%, transparent)` }}>
                {e.heure ? e.heure + ' ' : ''}{e.titre}
              </span>
            ))}
            {!dots && events.length > 3 && <span className="encore">+{events.length - 3}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Vue ANNÉE ───
function YearView({ cur, byDay, today, onMonth, small }) {
  const y = cur.getFullYear()
  return (
    <div className="agenda-annee" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${small ? 140 : 180}px, 1fr))` }}>
      {MONTHS.map((name, mth) => {
        const first = new Date(y, mth, 1)
        const start = mondayOf(first)
        const daysInMonth = new Date(y, mth + 1, 0).getDate()
        const lead = (first.getDay() + 6) % 7
        const weeks = Math.ceil((lead + daysInMonth) / 7)
        const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
        return (
          <button key={mth} className="carte mois-annee" onClick={() => onMonth(first)}>
            <div className="nom-mois">{name}</div>
            <div className="grille-mini">
              {cells.map(d => {
                const iso = isoDate(d)
                const inMonth = d.getMonth() === mth
                const isToday = iso === today
                const has = inMonth && (byDay[iso] || []).length > 0
                return <span key={iso} className={`${!inMonth ? 'vide-mini' : ''} ${isToday ? 'auj' : ''} ${has ? 'a-evt' : ''}`}>{inMonth ? d.getDate() : ''}</span>
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Détail d'un événement des calendriers des magasins (lecture seule) ───
function GoogleDetail({ event, onClose }) {
  const plusieurs = event.dateFin && event.dateFin > event.date
  const quand = plusieurs
    ? `Du ${fmtDayLabel(parseLocal(event.date)).toLowerCase()} au ${fmtDayLabel(parseLocal(event.dateFin)).toLowerCase()}${event.heure ? ` · ${event.heure}` : ''}`
    : (event.heure ? event.heure : 'Journée entière')
  return (
    <>
      <div className="feuille-fond" onClick={onClose} />
      <div className="feuille" role="dialog" aria-label={event.titre}>
        <div className="feuille-entete"><h2>{event.titre}</h2><button className="icone-btn" onClick={onClose} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <span className="etiquette-cal" style={{ background: event.color }}>{event.calLabel}</span>
          <p style={{ margin: '12px 0 0' }}><Icone nom="horloge" taille={18} style={{ verticalAlign: '-3px', color: 'var(--doux)' }} /> {quand}{event.lieu ? ` · ${event.lieu}` : ''}</p>
          {event.note && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{event.note}</p>}
          <p className="aide">Événement Google — lecture seule</p>
        </div>
      </div>
    </>
  )
}

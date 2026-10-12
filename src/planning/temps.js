import { isoDate, parseLocal, fmtShort } from '../agenda/dates'

// Petites aides de dates et d'heures du planning (heure locale, comme l'outil actuel)
export function addDays(isoStr, n) {
  const d = parseLocal(isoStr)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

// « 09:30 » → « 9h30 », « 17:00 » → « 17h »
export function fmtH(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return m === '00' ? `${+h}h` : `${+h}h${m}`
}

export function weekLabel(isoMonday) {
  const from = parseLocal(isoMonday)
  const to   = parseLocal(addDays(isoMonday, 6))
  return `Semaine du ${fmtShort(from)} au ${fmtShort(to)} ${to.getFullYear()}`
}

// Durée d'un créneau en minutes (de l'heure de début à l'heure de fin, pauses non déduites)
export function minutes(s) {
  if (!s?.heureDebut || !s?.heureFin) return 0
  const m = t => { const [h, mi] = t.split(':').map(Number); return h * 60 + (mi || 0) }
  return Math.max(0, m(s.heureFin) - m(s.heureDebut))
}

// 450 → « 7h30 », 480 → « 8h »
export function fmtDuree(min) {
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

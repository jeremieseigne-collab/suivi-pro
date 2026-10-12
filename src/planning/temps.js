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

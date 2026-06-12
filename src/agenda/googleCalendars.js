import { isoDate } from './dates'

// Clé API Google (Calendar API) — dans .env.local, ignoré par git
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''

// Les 3 calendriers Google (publics) affichés en lecture seule dans l'agenda.
// Couleurs alignées sur les magasins (cf. provenance des Commandes).
export const GOOGLE_CALENDARS = [
  { id: '9efscnevn3g2nk701ooscqkcr0vi5ap1@import.calendar.google.com', label: 'Bailly Albi',     color: '#2563eb' },
  { id: 'ki70pq3ab7kcbj56qrrc0ech1jm42nc9@import.calendar.google.com', label: 'Bailly Rouffiac', color: '#059669' },
  { id: '8h2o2u9k4jjsaj14v4qi9bo70rsdc6mc@import.calendar.google.com', label: 'Les 2 Zèbres',     color: '#d97706' },
]

function timeOf(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// Récupère les événements des 3 calendriers entre deux dates (objets Date).
// Renvoie [] si la clé API n'est pas configurée ou en cas d'erreur réseau.
export async function fetchGoogleEvents(timeMin, timeMax) {
  if (!GOOGLE_API_KEY) return []
  const out = []
  await Promise.all(GOOGLE_CALENDARS.map(async cal => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`
      + `?key=${GOOGLE_API_KEY}`
      + `&timeMin=${timeMin.toISOString()}`
      + `&timeMax=${timeMax.toISOString()}`
      + `&singleEvents=true&orderBy=startTime&maxResults=2500`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          console.warn(`Calendrier "${cal.label}" inaccessible (${res.status}) — vérifier qu'il est public et l'ID.`)
        }
        return
      }
      const data = await res.json()
      for (const ev of (data.items || [])) {
        const s = ev.start || {}
        let date, heure
        if (s.date) { date = s.date; heure = '' }               // événement journée entière
        else if (s.dateTime) { const d = new Date(s.dateTime); date = isoDate(d); heure = timeOf(d) }
        else continue
        out.push({
          id: 'g_' + cal.id + '_' + ev.id,
          date, heure,
          titre: ev.summary || '(sans titre)',
          note: ev.description || '',
          lieu: ev.location || '',
          source: 'google',
          color: cal.color,
          calLabel: cal.label,
        })
      }
    } catch { /* réseau : on ignore, l'agenda reste utilisable */ }
  }))
  return out
}

// Fenêtre [timeMin, timeMax] (objets Date) à charger selon la vue affichée
export function rangeFor(mode, curDate, mondayOf) {
  const y = curDate.getFullYear(), m = curDate.getMonth()
  if (mode === 'jour') {
    const a = new Date(y, m, curDate.getDate())
    const b = new Date(a); b.setDate(a.getDate() + 1)
    return { timeMin: a, timeMax: b }
  }
  if (mode === 'semaine') {
    const a = mondayOf(curDate)
    const b = new Date(a); b.setDate(a.getDate() + 6)
    return { timeMin: a, timeMax: b }
  }
  if (mode === 'mois') {
    const a = mondayOf(new Date(y, m, 1))
    const b = new Date(y, m + 1, 7)
    return { timeMin: a, timeMax: b }
  }
  // année
  return { timeMin: new Date(y, 0, 1), timeMax: new Date(y + 1, 0, 1) }
}

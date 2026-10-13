/* global process */
// Calendriers des magasins lus par le serveur (plan A, 13/10).
// Les liens iCloud publiés sont des SECRETS : ils viennent uniquement des variables du serveur
// (Vercel ; en local, ~/.suivi-pro/agenda.env, hors du projet). Jamais dans le code, jamais dans les journaux.
// Le contenu des événements n'est jamais écrit dans les journaux.
import ICAL from 'ical.js'

const CALENDRIERS = [
  { cle: 'albi',     variable: 'AGENDA_ICAL_ALBI' },
  { cle: 'rouffiac', variable: 'AGENDA_ICAL_ROUFFIAC' },
  { cle: 'zebres',   variable: 'AGENDA_ICAL_ZEBRES' },
]
const MEMOIRE_MS = 5 * 60 * 1000          // un calendrier est relu chez iCloud au plus toutes les 5 minutes
const DELAI_MS   = 10 * 1000              // délai maximal d'une lecture iCloud
const MAX_JOURS  = 400                    // fenêtre maximale demandée (vue Année + marge)
const MAX_OCCURRENCES = 20000             // garde-fou sur le déroulé d'un rendez-vous récurrent
const memoire = new Map()                 // cle → { t, comp }

// ── Lecture d'un calendrier (avec mémoire de 5 minutes ; en cas d'échec, la dernière copie lue est gardée) ──
async function lireCalendrier(cal) {
  const url = String(process.env[cal.variable] || '').trim().replace(/^webcal:\/\//i, 'https://')
  if (!url) return { configure: false }
  const deja = memoire.get(cal.cle)
  if (deja && Date.now() - deja.t < MEMOIRE_MS) return { configure: true, comp: deja.comp }
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(DELAI_MS), headers: { 'User-Agent': 'suivi-pro-agenda' } })
    if (!r.ok) { const e = new Error('réponse ' + r.status); e.code = r.status; throw e }
    const texte = await r.text()
    if (!texte.startsWith('BEGIN:VCALENDAR')) throw new Error('réponse inattendue')
    const comp = new ICAL.Component(ICAL.parse(texte))
    for (const vtz of comp.getAllSubcomponents('vtimezone')) {
      const tz = new ICAL.Timezone(vtz)
      if (!ICAL.TimezoneService.has(tz.tzid)) ICAL.TimezoneService.register(tz.tzid, tz)
    }
    memoire.set(cal.cle, { t: Date.now(), comp })
    return { configure: true, comp }
  } catch (e) {
    // Journal sans le lien ni le contenu : seulement le magasin et la nature de l'erreur
    console.error(`Agenda : calendrier « ${cal.cle} » indisponible (${e.code || e.name || 'erreur'})`)
    if (deja) return { configure: true, comp: deja.comp }
    return { configure: true, erreur: true }
  }
}

// ── Dates à l'heure de Paris ──
const PARIS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
function enParis(d) {
  const p = Object.fromEntries(PARIS.formatToParts(d).map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` }
}
const deux = n => String(n).padStart(2, '0')
const isoJour = t => `${t.year}-${deux(t.month)}-${deux(t.day)}`
function veille(iso) { const [y, m, d] = iso.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d - 1)); return `${x.getUTCFullYear()}-${deux(x.getUTCMonth() + 1)}-${deux(x.getUTCDate())}` }
// Instant absolu d'une heure ICAL ; une heure « flottante » (sans fuseau) est lue comme l'heure de Paris
function instant(t) {
  if (t.isDate) return new Date(Date.UTC(t.year, t.month - 1, t.day))
  const tzid = t.zone?.tzid
  if (!tzid || tzid === 'floating') {
    const paris = ICAL.TimezoneService.get('Europe/Paris')
    if (paris) { const c = t.clone(); c.zone = paris; return c.toJSDate() }
  }
  return t.toJSDate()
}

// Une occurrence → la forme attendue par l'agenda (mêmes règles qu'avant, quand c'était Google qui les calculait)
function versAgenda(cle, item, debutT, finT, cleOcc) {
  let date, heure, dateFin
  if (debutT.isDate) {                                     // journée entière (fin exclue)
    date = isoJour(debutT); heure = ''
    dateFin = finT ? veille(isoJour(finT)) : date
  } else {
    const d = enParis(instant(debutT)); date = d.date; heure = d.heure
    if (finT) { const f = enParis(instant(finT)); dateFin = f.heure === '00:00' ? veille(f.date) : f.date }
  }
  if (!dateFin || dateFin < date) dateFin = date
  return {
    id: `g_${cle}_${cleOcc}`,
    date, heure, dateFin,
    titre: item.summary || '(sans titre)',
    note: item.description || '',
    lieu: item.location || '',
  }
}

// Occurrences qui chevauchent [debut, fin[ (comme la lecture Google : début < fin de la fenêtre, fin > début de la fenêtre)
function evenementsEntre(cle, comp, debut, fin) {
  const vevents = comp.getAllSubcomponents('vevent')
  const maitres = new Map(), exceptions = []
  for (const ve of vevents) {
    const ev = new ICAL.Event(ve)
    if (ev.isRecurrenceException()) exceptions.push(ev)
    else maitres.set(ev.uid + '|' + maitres.size, ev)
  }
  const parUid = new Map()
  for (const ev of maitres.values()) { if (!parUid.has(ev.uid)) parUid.set(ev.uid, ev) }
  for (const ex of exceptions) { const m = parUid.get(ex.uid); if (m) m.relateException(ex) }
  const chevauche = (dT, fT) => { const a = instant(dT), b = fT ? instant(fT) : (dT.isDate ? new Date(a.getTime() + 86400000) : a); return a < fin && (b > debut || (b.getTime() === a.getTime() && a >= debut)) }
  const out = []
  for (const ev of maitres.values()) {
    if (!ev.startDate) continue
    if (!ev.isRecurring()) {
      if (chevauche(ev.startDate, ev.endDate)) out.push(versAgenda(cle, ev, ev.startDate, ev.endDate, `${ev.uid}`))
      continue
    }
    const it = ev.iterator()
    let t, n = 0
    while ((t = it.next()) && n++ < MAX_OCCURRENCES) {
      const o = ev.getOccurrenceDetails(t)
      if (instant(o.startDate) >= fin) break
      if (chevauche(o.startDate, o.endDate)) out.push(versAgenda(cle, o.item, o.startDate, o.endDate, `${ev.uid}_${o.recurrenceId.toString()}`))
    }
  }
  // Exceptions « orphelines » (rendez-vous déplacé dont la série n'est pas dans le calendrier)
  for (const ex of exceptions) if (!parUid.has(ex.uid) && chevauche(ex.startDate, ex.endDate)) out.push(versAgenda(cle, ex, ex.startDate, ex.endDate, `${ex.uid}_${ex.recurrenceId?.toString()}`))
  return out
}

// ── Point d'entrée : événements des 3 calendriers entre deux instants ──
export function lireFenetre(params) {
  const debut = new Date(params.get('debut') || ''), fin = new Date(params.get('fin') || '')
  const refus = () => { const e = new Error('Période invalide'); e.status = 400; throw e }
  if (isNaN(debut) || isNaN(fin) || fin <= debut || (fin - debut) / 86400000 > MAX_JOURS) refus()
  return { debut, fin }
}
export async function agendaEntre(debut, fin) {
  const calendriers = await Promise.all(CALENDRIERS.map(async cal => {
    const c = await lireCalendrier(cal)
    if (!c.configure) return { cle: cal.cle, ok: false, nonConfigure: true, evenements: [] }
    if (c.erreur) return { cle: cal.cle, ok: false, evenements: [] }
    try { return { cle: cal.cle, ok: true, evenements: evenementsEntre(cal.cle, c.comp, debut, fin) } }
    catch (e) { console.error(`Agenda : lecture du calendrier « ${cal.cle} » impossible (${e.name})`); return { cle: cal.cle, ok: false, evenements: [] } }
  }))
  return { calendriers }
}

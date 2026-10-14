
import { supabase } from '../lib/supabase'

// Les 3 calendriers des magasins (abonnements iCloud), lus par le SERVEUR (fonction api/agenda, plan A du 13/10) :
// ni clé Google, ni identifiant, ni lien de calendrier dans le code publié ; seul un appareil connecté reçoit les événements.
// Couleurs alignées sur les magasins (cf. provenance des Commandes).
export const GOOGLE_CALENDARS = [
  { cle: 'albi',     label: 'Bailly Albi',     color: '#2563eb' },
  { cle: 'rouffiac', label: 'Bailly Rouffiac', color: '#059669' },
  { cle: 'zebres',   label: 'Les 2 Zèbres',     color: '#d97706' },
]

const MEMOIRE_MS = 3 * 60 * 1000   // l'appareil garde une période déjà lue 3 minutes (le serveur garde les calendriers 5 minutes)
const memoire = new Map()

// Événements des 3 calendriers entre deux dates (objets Date), sous la même forme qu'avant.
// Le tableau renvoyé porte aussi : indisponibles (noms des calendriers illisibles pour le moment),
// nonConfigure (aucun calendrier réglé sur le serveur), erreur (serveur injoignable). Jamais d'exception : l'agenda reste utilisable.
export function fetchGoogleEvents(timeMin, timeMax) {
  const cle = timeMin.toISOString() + '|' + timeMax.toISOString()
  const deja = memoire.get(cle)
  if (deja && Date.now() - deja.t < MEMOIRE_MS) return deja.p
  const p = charger(timeMin, timeMax).then(r => { if (r.erreur || r.indisponibles.length) memoire.delete(cle); return r })
  memoire.set(cle, { t: Date.now(), p })
  return p
}

async function charger(timeMin, timeMax) {
  const resultat = (extra = {}) => Object.assign([], { indisponibles: [], motifs: {}, nonConfigure: false, erreur: false }, extra)
  try {
    const { data } = await supabase.auth.getSession()
    const jeton = data?.session?.access_token
    if (!jeton) return resultat({ erreur: true })
    const r = await fetch(`/api/agenda?debut=${encodeURIComponent(timeMin.toISOString())}&fin=${encodeURIComponent(timeMax.toISOString())}`, { headers: { Authorization: `Bearer ${jeton}` } })
    if (!r.ok) return resultat({ erreur: true })
    const d = await r.json()
    const liste = d.calendriers || []
    const out = resultat({ nonConfigure: liste.length > 0 && liste.every(c => c.nonConfigure) })
    for (const c of liste) {
      const cal = GOOGLE_CALENDARS.find(x => x.cle === c.cle)
      if (!cal) continue
      if (!c.ok) { if (!c.nonConfigure) { out.indisponibles.push(cal.label); if (c.motif) out.motifs[cal.label] = c.motif } continue }
      for (const e of c.evenements || []) out.push({ ...e, source: 'google', color: cal.color, calLabel: cal.label })
    }
    return out
  } catch { return resultat({ erreur: true }) }
}

// Message à afficher sous l'agenda / « À venir » quand un calendrier manque ('' si tout va bien).
// detail (comptes Direction) : ajoute le motif de l'erreur, en clair, pour savoir quoi corriger (jamais de lien).
const MOTIFS = { 'lien-mal-forme': 'lien mal recopié dans Vercel', 'delai': 'iCloud trop lent', 'pas-un-calendrier': "iCloud n'a pas renvoyé de calendrier" }
const motifEnClair = m => MOTIFS[m] || (m.startsWith('refus-') ? `refusé par iCloud, code ${m.slice(6)}` : m.startsWith('reseau') ? `iCloud injoignable${m.length > 6 ? ' (' + m.slice(7) + ')' : ''}` : m)
export function messageCalendriers(evs, detail = false) {
  if (!evs) return ''
  if (evs.nonConfigure) return 'Calendriers des magasins non configurés'
  if (evs.erreur) return 'Calendriers des magasins indisponibles pour le moment'
  if (evs.indisponibles?.length) {
    const noms = evs.indisponibles.map(n => detail && evs.motifs?.[n] ? `${n} (${motifEnClair(evs.motifs[n])})` : n)
    return `${evs.indisponibles.length > 1 ? 'Calendriers' : 'Calendrier'} indisponible${evs.indisponibles.length > 1 ? 's' : ''} pour le moment : ${noms.join(', ')}`
  }
  return ''
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

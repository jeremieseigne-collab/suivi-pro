import { useSyncExternalStore } from 'react'

// ─── Liens directs par écran (#/cahier, #/sav…) : le retour du navigateur et du téléphone fonctionne ───
const lireVue = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home')

export function useVue() {
  return useSyncExternalStore(
    cb => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) },
    lireVue,
  )
}

// Ouvrir un écran avec une action (ex. « #/cahier?nouveau » depuis les raccourcis de l'accueil).
// L'écran lit l'action à son ouverture (actionDemandee) puis l'efface (effacerAction) pour qu'un rechargement ne la rejoue pas.
export function ouvrirAvec(vue, action) { location.hash = `#/${vue}?${action}`; window.scrollTo(0, 0) }
export const actionDemandee = action => (location.hash.split('?')[1] || '').split('&').includes(action)
export function effacerAction() {
  const [base, q] = location.hash.split('?')
  if (q !== undefined) history.replaceState(null, '', location.pathname + location.search + base)
}

export function aller(vue) {
  const cible = vue === 'home' ? '#/' : `#/${vue}`
  if (location.hash !== cible) location.hash = cible
  window.scrollTo(0, 0)
}

// ─── Apparence : Auto (suit l'appareil) / Clair / Sombre — un seul réglage pour tout l'outil ───
// Mémorisée sur l'appareil (localStorage['theme']). En « Auto », on pose quand même data-theme
// pour que les écrans pas encore refaits (App.css) suivent aussi le réglage de l'appareil.
const CLE = 'theme'
const mq = window.matchMedia('(prefers-color-scheme: dark)')
let choixApparence = (() => { try { return localStorage.getItem(CLE) || 'auto' } catch { return 'auto' } })()
const abonnes = new Set()
function appliquerApparence() {
  const sombre = choixApparence === 'dark' || (choixApparence === 'auto' && mq.matches)
  document.documentElement.dataset.theme = sombre ? 'dark' : 'light'
}
appliquerApparence()
mq.addEventListener('change', appliquerApparence)

function choisirApparence(v) {
  choixApparence = v
  try { localStorage.setItem(CLE, v) } catch { /* navigation privée : sans mémoire */ }
  appliquerApparence()
  abonnes.forEach(cb => cb())
}

export function useApparence() {
  const choix = useSyncExternalStore(cb => { abonnes.add(cb); return () => abonnes.delete(cb) }, () => choixApparence)
  return [choix, choisirApparence]
}

export const APPARENCES = [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']]

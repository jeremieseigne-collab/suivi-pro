import { useSyncExternalStore } from 'react'

// ─── Liens directs par écran (#/cahier, #/sav…) : le retour du navigateur et du téléphone fonctionne ───
const lireVue = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home')

export function useVue() {
  return useSyncExternalStore(
    cb => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) },
    lireVue,
  )
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

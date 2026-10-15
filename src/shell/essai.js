import { useSyncExternalStore } from 'react'

// Points « à trancher » d'un écran en construction : affichés AVEC par défaut (rien n'est retiré tant que ce n'est pas tranché).
// En local seulement, le panneau « Essai local » permet d'essayer chaque point avec et sans ; il disparaît une fois le choix fait.
const CLE = 'refonte_variantes'
const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || '{}') } catch { return {} } }
let etat = lire()
const abonnes = new Set()
export function choisirVariante(cle, v) { etat = { ...etat, [cle]: v }; try { localStorage.setItem(CLE, JSON.stringify(etat)) } catch { /* ignore */ } abonnes.forEach(f => f()) }
export function useVariantes(points) {
  const e = useSyncExternalStore(cb => { abonnes.add(cb); return () => abonnes.delete(cb) }, () => etat)
  return Object.fromEntries(points.map(p => [p.cle, e[p.cle] !== 'sans']))   // true = avec
}

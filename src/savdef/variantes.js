import { useSyncExternalStore } from 'react'

// Points laissés « à décider sur la maquette » : affichés AVEC par défaut (rien n'est retiré tant que ce n'est pas tranché).
// En local seulement, un petit panneau permet d'essayer chaque point avec et sans. Il disparaîtra une fois le choix fait.
export const POINTS = [
  { cle: 'magSoc', titre: 'Défectueux : magasin et société sur chaque ligne' },
  { cle: 'etat', titre: 'Défectueux : champ « État » à la création' },
  { cle: 'magasinSav', titre: 'SAV : champ « Magasin » à la création' },
]
const CLE = 'refonte_variantes'
const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || '{}') } catch { return {} } }
let etat = lire()
const abonnes = new Set()
export function choisirVariante(cle, v) { etat = { ...etat, [cle]: v }; try { localStorage.setItem(CLE, JSON.stringify(etat)) } catch { /* ignore */ } abonnes.forEach(f => f()) }
export function useVariantes() {
  const e = useSyncExternalStore(cb => { abonnes.add(cb); return () => abonnes.delete(cb) }, () => etat)
  return Object.fromEntries(POINTS.map(p => [p.cle, e[p.cle] !== 'sans']))   // true = avec
}


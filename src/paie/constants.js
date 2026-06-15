import { SOCIETES } from '../data/societes'

export { SOCIETES }

// Magasins concernés par chaque société (affichés dans le sélecteur de l'App Paie)
export const SOCIETE_MAGASINS = {
  "B'Shoes":  'Bailly Albi & Les 2 Zèbres',
  'JR Shoes': 'Bailly Rouffiac',
}

// Gérants exclus de l'App Paie (ils restent dans la table salaries pour les autres apps)
const norm = s => (s || '').normalize('NFD').split('').filter(c => { const n = c.charCodeAt(0); return n < 0x300 || n > 0x36f }).join('').trim().toLowerCase()
const GERANTS = ['Jérémie', 'Raphaël'].map(norm)
export const isGerant = nom => GERANTS.includes(norm(nom))

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

// Période courante au format 'AAAA-MM'
export function currentPeriode() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function periodeLabel(p) {
  if (!p) return ''
  const [y, m] = p.split('-').map(Number)
  return `${MOIS[m - 1]} ${y}`
}

// Décale une période de `delta` mois (ex. shiftPeriode('2026-01', -1) -> '2025-12')
export function shiftPeriode(p, delta) {
  let [y, m] = p.split('-').map(Number)
  m += delta
  while (m < 1)  { m += 12; y -= 1 }
  while (m > 12) { m -= 12; y += 1 }
  return `${y}-${String(m).padStart(2, '0')}`
}

// Sections avec date + heures (lignes répétables)
export const HOUR_SECTIONS = [
  { key: 'heuresSupp', label: 'Heures supplémentaires',           icon: '⏱️' },
  { key: 'dimanche',   label: 'Heures travaillées le dimanche',   icon: '📅' },
  { key: 'feries',     label: 'Heures travaillées les jours fériés', icon: '🎉' },
]

// Sections avec période du / au (lignes répétables)
export const RANGE_SECTIONS = [
  { key: 'conges',  label: 'Congés pris',   icon: '🏖️' },
  { key: 'maladie', label: 'Arrêt maladie', icon: '🤒' },
]

export const EMPTY_DATA = {
  heuresSupp: [], dimanche: [], feries: [], conges: [], maladie: [], commentaire: '',
}

export const SOCIETE_MAP = {
  'Bailly Albi':     "B'Shoes",
  'les 2 Zèbres':    "B'Shoes",
  'Bailly Rouffiac tolosan': 'JR Shoes',
}

export const SOCIETES = [...new Set(Object.values(SOCIETE_MAP))].sort()

export function getSociete(magasin) {
  if (!magasin) return magasin
  const norm = magasin.trim().toLowerCase()
  const key  = Object.keys(SOCIETE_MAP).find(k => k.trim().toLowerCase() === norm)
  return key ? SOCIETE_MAP[key] : magasin
}

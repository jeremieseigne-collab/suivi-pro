// Réception rattachée à une commande (plan C, étape 3) : petits outils sans écran
import { CAT_DE_GRILLE } from '../cahier/commun'

// Nom du modèle dans le Cahier : « Code, Couleur » (comme l'import des modèles et l'import des entrées)
export const nomModele = (code, couleur) => (couleur ? `${code}, ${couleur}` : code)

// Grille de pointures d'un article d'après la Famille / le Rayon du fichier Polaris
export function grilleDe(l) {
  const t = `${l?.famille || ''} ${l?.rayon || ''} ${l?.sousFamille || l?.sous_famille || ''}`.toLowerCase()
  if (/accessoire|maroquin|entretien|lacet|chaussette|semelle|casquette|lunette|coussin/.test(t)) return 'ACC'
  if (/b[ée]b[ée]|1er pas/.test(t)) return 'B'
  if (/enfant|gar[cç]on|fille/.test(t)) return 'E'
  if (/homme/.test(t)) return 'H'
  return 'F'
}
export const categorieDe = typeKey => CAT_DE_GRILLE[typeKey] || ''

// Paires non attendues d'un article : tailles absentes de la commande ou au-delà du reste
export function horsCommande(tailles, lignesArticle) {
  const parTaille = Object.fromEntries((lignesArticle || []).map(l => [l.taille, l]))
  const out = []
  for (const [t, q] of Object.entries(tailles)) {
    const n = Number(q) || 0; if (n <= 0) continue
    const l = parTaille[t]
    if (!l) out.push({ taille: t, qte: n, raison: 'absente de la commande' })
    else if (n > l.reste) out.push({ taille: t, qte: n - l.reste, raison: `au-delà du reste (${l.reste})` })
  }
  return out
}

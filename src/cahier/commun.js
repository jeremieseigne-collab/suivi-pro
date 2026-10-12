// Règles communes du Cahier des entrées (voir PLAN-REFONTE.md §2 ter et la charte)

// Statuts : ordre des étapes Aucun → Enregistré → Imp. étiquettes, puis Réassort et Retour.
// La valeur enregistrée reste « Imp. Etiquettes » (sans accent) : seul l'affichage change.
export const STATUTS = ['', 'Enregistré', 'Imp. Etiquettes', 'Réassort', 'Retour']
export const STATUT_LIBELLE = { '': 'Aucun', 'Enregistré': 'Enregistré', 'Imp. Etiquettes': 'Imp. étiquettes', 'Réassort': 'Réassort', 'Retour': 'Retour' }
// Couleurs selon la progression : orange = en cours, vert = terminé, bleu = réassort, rouge = retour
export const STATUT_CLASSE = { 'Enregistré': 'att', 'Imp. Etiquettes': 'ok', 'Réassort': 'info', 'Retour': 'err' }
export const libelleStatut = s => STATUT_LIBELLE[s] ?? s

// Catégories ; choisir une catégorie choisit la grille correspondante (comme l'outil actuel)
export const CATEGORIES = ['Femme', 'Homme', 'Enfant', 'Bébé', 'Acc']
export const CAT_TO_KEY = { 'Femme': 'F', 'Homme': 'H', 'Enfant': 'E', 'Bébé': 'B', 'Acc': 'ACC' }
export const CAT_DE_GRILLE = { F: 'Femme', H: 'Homme', E: 'Enfant', B: 'Bébé', ACC: 'Acc' }

// N° de commande : même logique que l'outil actuel — nombre du N°, (N° − 1) modulo 3 → 1 rouge, 2 bleu, 3 vert…
export function classeNumero(n) { const v = parseInt(n); return v ? 'n' + ((v - 1) % 3 + 1) : '' }

// Dates : stockées en texte JJ/MM/AAAA ; calculs en heure locale (pas d'UTC → pas de décalage la nuit)
const deux = n => String(n).padStart(2, '0')
export function aujourdhuiFr() { const d = new Date(); return `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()}` }
export function frVersIso(fr) { const [j, m, a] = (fr || '').split('/'); return a && a.length === 4 ? `${a}-${deux(m)}-${deux(j)}` : '' }
export function isoVersFr(iso) { const [a, m, j] = (iso || '').split('-'); return j ? `${j}/${m}/${a}` : '' }
export const cleDate = fr => frVersIso(fr) || '0000-00-00'
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export function libelleJour(fr) {
  const iso = frVersIso(fr); if (!iso) return 'Sans date'
  const d = new Date(iso + 'T12:00'), a = new Date(); a.setHours(12, 0, 0, 0)
  const ecart = Math.round((a - d) / 86400000)
  if (ecart === 0) return "Aujourd'hui"
  if (ecart === 1) return 'Hier'
  const txt = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}${d.getFullYear() !== a.getFullYear() ? ' ' + d.getFullYear() : ''}`
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export const fmtEur = n => (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
export const pluriel = (n, mot) => `${n} ${mot}${Math.abs(n) > 1 ? 's' : ''}`

// Jauge : seuils de l'outil actuel — 0 % gris, < 50 % orange, ≥ 50 % bleu, 100 % vert
export const niveauJauge = pc => pc <= 0 ? 'zero' : pc >= 100 ? 'ok' : pc >= 50 ? 'bleu' : 'orange'

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

// N° de référence du modèle : même logique que l'outil actuel — nombre du N°, (N° − 1) modulo 3 → 1 rouge, 2 bleu, 3 vert…
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

// ─── Noms de marque : présentation propre et détection des doublons ───
// Nom tel qu'il sera enregistré : espaces en trop retirés ; un nom tapé tout en majuscules reste tel quel (« UGG ») ;
// sinon majuscule au début de chaque mot (le reste tel que tapé), sauf les petits mots de liaison qui restent en minuscules
// quand ils ne sont pas en premier (« coco et abricot » → « Coco et Abricot »)
const MOTS_LIAISON = new Set(['et', 'de', 'du', 'des', 'la', 'le', 'les', 'en', 'à'])
export function nomPropre(s) {
  const net = (s || '').trim().replace(/\s+/g, ' ')
  if (/\p{L}/u.test(net) && net === net.toLocaleUpperCase('fr-FR')) return net
  return net.split(' ').map((mot, i) => i > 0 && MOTS_LIAISON.has(mot.toLocaleLowerCase('fr-FR')) ? mot.toLocaleLowerCase('fr-FR')
    : mot.replace(/(^|[-'&/])(\p{L})/gu, (m, sep, l) => sep + l.toLocaleUpperCase('fr-FR'))).join(' ')
}
// Forme de comparaison : sans majuscules, accents, espaces ni ponctuation (« Dr. Martens » = « dr martens » = « DrMartens »)
export const formeComparaison = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
function ecart(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
// Marques existantes qui ressemblent au nom tapé : même forme, ou 1 lettre d'écart (noms courts) / 2 lettres (noms de 6 lettres et plus)
export function marquesSemblables(nom, marques) {
  const f = formeComparaison(nom); if (!f) return []
  const seuil = f.length >= 6 ? 2 : 1
  return marques.map(m => ({ m, d: formeComparaison(m) === f ? 0 : ecart(f, formeComparaison(m)) }))
    .filter(x => x.d <= seuil).sort((a, b) => a.d - b.d || a.m.localeCompare(b.m)).map(x => x.m)
}

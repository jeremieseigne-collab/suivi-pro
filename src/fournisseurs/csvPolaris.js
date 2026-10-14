// Lecture d'un fichier de commande au format d'import Polaris (plan C, décisions 1 à 4).
// Le fichier doit être STRICTEMENT celui de Polaris : 20 colonnes, ces intitulés, dans cet ordre, séparateur « ; ».
// Fonctions pures (aucun accès à la base) : la correspondance des magasins et la marque sont fournies par l'appelant.

export const COLONNES_POLARIS = [
  'Collection', 'Magasin', 'Marque', 'Gencode', 'Code Modèle', 'Libelle', 'Couleur', 'Taille', 'Rayon', 'Famille',
  'Sous famille', "Prix d'achat", 'PVC (FR)', 'Chaussant', 'Hauteur de talon', 'Matière', 'Semelle extérieure', 'Fermeture',
  'Saison', 'Quantité commandé',
]
// Nom de la colonne en base (achats_lignes), même ordre
const CHAMPS = [
  'collection', 'magasin_fichier', 'marque', 'gencode', 'code_modele', 'libelle', 'couleur', 'taille', 'rayon', 'famille',
  'sous_famille', 'prix_achat', 'pvc', 'chaussant', 'hauteur_talon', 'matiere', 'semelle_exterieure', 'fermeture',
  'saison_polaris', 'qte_commandee',
]

// Même forme de comparaison que la base (forme_texte) et que formeMagasin : sans majuscules, accents, espaces ni tirets
export const forme = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Taille : « 36,5 » → « 36.5 », « 35 - 36 » → « 35-36 » (comme l'import actuel de Réglages → Marques)
export const normTaille = t => String(t || '').trim().replace(',', '.').replace(/\s*-\s*/g, '-').replace(/\s*\/\s*/g, '-')

// Nombre écrit à la française (« 92,00 », « 1 234,50 ») ; '' → null
export function nombre(s) {
  const t = String(s ?? '').replace(/[\s\u00a0\u202f€]/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

// Collection Polaris → saison Suivi Pro : H26 → HIVER_2026, E27 → ETE_2027
export function saisonDeCollection(c) {
  const m = /^([HE])(\d{2})$/i.exec(String(c || '').trim())
  if (!m) return null
  return `${m[1].toUpperCase() === 'H' ? 'HIVER' : 'ETE'}_20${m[2]}`
}
// Saisons suivies par commandes : Été 2027 et après (décision 14 ; même règle que saison_suivie_par_commandes en base)
export function suivieParCommandes(saison) {
  const m = /^(ETE|HIVER)_(\d{4})$/.exec(saison || '')
  return !!m && Number(m[2]) * 2 + (m[1] === 'HIVER' ? 1 : 0) >= 2027 * 2
}
export const libelleSaison = s => { const m = /^(ETE|HIVER)_(\d{4})$/.exec(s || ''); return m ? `${m[1] === 'ETE' ? 'Été' : 'Hiver'} ${m[2]}` : (s || '—') }

// Une ligne CSV (guillemets permis : "a;b" et "" pour un guillemet)
function decouper(ligne) {
  const out = []; let cur = '', q = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (q) {
      if (c === '"') { if (ligne[i + 1] === '"') { cur += '"'; i++ } else q = false }
      else cur += c
    } else if (c === '"') q = true
    else if (c === ';') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

/**
 * Lit le texte d'un fichier Polaris.
 * correspondances : [{ valeur, magasin_id }] (table magasins_correspondance)
 * Renvoie { erreur } (fichier refusé en entier) ou
 * { saison, collection, marque, lignes: [{ magasin_id, ordre, …20 champs }], refusees: [{ ligne, raison }],
 *   parMagasin: { [magasin_id]: { articles, paires, montant } }, nbMagasinsFichier }
 */
export function lireFichierPolaris(texte, correspondances) {
  const brut = String(texte || '').replace(/^\uFEFF/, '')
  const lignes = brut.split(/\r?\n/)
  while (lignes.length && !lignes[lignes.length - 1].trim()) lignes.pop()
  if (!lignes.length) return { erreur: 'Le fichier est vide.' }

  // En-tête : exactement les 20 colonnes de Polaris, dans l'ordre
  const entete = decouper(lignes[0]).map(s => s.trim())
  const diff = []
  if (entete.length !== COLONNES_POLARIS.length) diff.push(`${entete.length} colonnes au lieu de ${COLONNES_POLARIS.length}`)
  COLONNES_POLARIS.forEach((c, i) => { if (entete[i] !== c) diff.push(`colonne ${i + 1} : « ${entete[i] ?? '(absente)'} » au lieu de « ${c} »`) })
  entete.slice(COLONNES_POLARIS.length).forEach((c, i) => diff.push(`colonne en plus ${COLONNES_POLARIS.length + i + 1} : « ${c} »`))
  if (diff.length) return { erreur: 'Ce n’est pas le format d’import Polaris (20 colonnes, mêmes intitulés, même ordre).', details: diff.slice(0, 8) }

  const parValeur = Object.fromEntries((correspondances || []).map(c => [forme(c.valeur), c.magasin_id]))
  const out = [], refusees = [], inconnus = new Set(), collections = new Set(), marques = new Set(), magasinsFichier = new Set()
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i].trim()) continue
    const cols = decouper(lignes[i])
    const n = i + 1
    if (cols.length !== COLONNES_POLARIS.length) { refusees.push({ ligne: n, raison: `${cols.length} colonnes au lieu de 20` }); continue }
    const v = Object.fromEntries(CHAMPS.map((c, j) => [c, (cols[j] ?? '').trim()]))
    collections.add(v.collection); marques.add(v.marque); magasinsFichier.add(v.magasin_fichier)
    const magasin_id = parValeur[forme(v.magasin_fichier)]
    if (!magasin_id) { inconnus.add(v.magasin_fichier || '(vide)'); continue }
    if (!v.code_modele) { refusees.push({ ligne: n, raison: 'Code Modèle vide' }); continue }
    const prix = nombre(v.prix_achat), pvc = nombre(v.pvc), qte = nombre(v.qte_commandee)
    if (prix === null || Number.isNaN(prix) || prix < 0) { refusees.push({ ligne: n, raison: `Prix d'achat illisible (« ${v.prix_achat} »)` }); continue }
    if (qte === null || Number.isNaN(qte) || !Number.isInteger(qte) || qte < 0) { refusees.push({ ligne: n, raison: `Quantité illisible (« ${v.qte_commandee} »)` }); continue }
    if (qte === 0) { refusees.push({ ligne: n, raison: 'Quantité 0 (ligne ignorée)' }); continue }
    if (Number.isNaN(pvc)) { refusees.push({ ligne: n, raison: `PVC illisible (« ${v.pvc} »)` }); continue }
    out.push({ ...v, magasin_id, ordre: n, taille: normTaille(v.taille), prix_achat: prix, pvc, qte_commandee: qte })
  }
  if (inconnus.size) return { erreur: `Magasin inconnu dans le fichier : ${[...inconnus].map(x => `« ${x} »`).join(', ')}. Ajoute la correspondance dans Réglages → Magasins.` }
  if (collections.size !== 1) return { erreur: `Le fichier mélange plusieurs collections (${[...collections].join(', ')}).` }
  if (marques.size !== 1) return { erreur: `Le fichier contient plusieurs marques (${[...marques].join(', ')}) : un fichier par marque.` }
  const collection = [...collections][0]
  const saison = saisonDeCollection(collection)
  if (!saison) return { erreur: `Collection « ${collection} » non reconnue (attendu : H26, E27…).` }
  if (!out.length) return { erreur: 'Aucune ligne utilisable dans le fichier.', refusees }

  // Même article deux fois (deux BC) : additionné à l'import si le prix est le même, sinon refusé par la base
  const vus = {}, doublons = [], prixDifferents = []
  for (const l of out) {
    const k = [l.magasin_id, l.code_modele, l.couleur, l.taille].join('|')
    if (vus[k]) { doublons.push(`${l.code_modele} ${l.couleur} ${l.taille}`); if (vus[k].prix_achat !== l.prix_achat) prixDifferents.push(`${l.code_modele} ${l.couleur} ${l.taille}`) }
    else vus[k] = l
  }
  const parMagasin = {}
  for (const l of out) {
    const m = (parMagasin[l.magasin_id] ||= { articles: new Set(), paires: 0, montant: 0 })
    m.articles.add([l.code_modele, l.couleur, l.taille].join('|')); m.paires += l.qte_commandee; m.montant += l.qte_commandee * l.prix_achat
  }
  for (const k of Object.keys(parMagasin)) parMagasin[k] = { ...parMagasin[k], articles: parMagasin[k].articles.size }
  return { saison, collection, marque: [...marques][0], lignes: out, refusees, parMagasin, nbMagasinsFichier: magasinsFichier.size, doublons, prixDifferents }
}

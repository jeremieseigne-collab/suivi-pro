// Règles communes de SAV & défectueux (mêmes données et mêmes enchaînements que l'outil actuel)
import { db } from '../db'
import { nbPaires, sizesRetour } from './paires'

export const TYPES_SAV = [['retour', 'Retour client'], ['forme', 'Mise à la forme'], ['reparation', 'Réparation']]
export const libelleType = t => (TYPES_SAV.find(([v]) => v === t) || [t, t])[1]
export const avecMarque = t => t === 'retour' || t === 'reparation'   // retour et réparation : marque du répertoire, défectueux lié

export const STATUTS_DEF = ['À traiter', 'Mail envoyé', 'Avoir reçu', 'Clôturé', 'Refusé']
export const DEF_TERMINES = ['Clôturé', 'Refusé']                    // ligne grisée
export const DEF_FIN = ['Avoir reçu', 'Clôturé', 'Refusé']            // proposer de clôturer aussi le SAV lié (U5)
// Couleur du mot (pas de point : le point de couleur est réservé au statut des entrées)
export const CLASSE_DEF = { 'À traiter': 'att', 'Mail envoyé': 'info', 'Avoir reçu': 'ok', 'Clôturé': 'ok', 'Refusé': 'err' }

export const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) }
export const aujourdhuiFr = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` }

// Défectueux : changement d'état. Seul « Mail envoyé » se propage au SAV lié (→ « Mail marque envoyé »),
// comme aujourd'hui ; la clôture du SAV n'est jamais automatique (elle est proposée à l'écran).
export async function changerEtatDefectueux(id, statut) {
  await db.defectueux.update(id, { statut })
  if (statut === 'Mail envoyé') {
    const sav = await db.sav.where('defectueuxId').equals(id).first()
    if (sav && avecMarque(sav.type) && !['Mail marque envoyé', 'Clôturé'].includes(sav.statut)) await db.sav.update(sav.id, { statut: 'Mail marque envoyé' })
  }
}

// SAV : mail à la marque envoyé → « Mail marque envoyé », et le défectueux lié passe à « Mail envoyé » (comme aujourd'hui)
export async function marquerMailSav(row) {
  if (['Mail marque envoyé', 'Réponse reçue', 'Clôturé'].includes(row.statut)) return
  await db.sav.update(row.id, { statut: 'Mail marque envoyé' })
  if (row.defectueuxId) {
    const def = await db.defectueux.get(row.defectueuxId)
    if (def && def.statut !== 'Mail envoyé' && !DEF_FIN.includes(def.statut)) await db.defectueux.update(row.defectueuxId, { statut: 'Mail envoyé' })
  }
}

// Mise à la forme : la machine tient une paire à la fois. Si elle est libre, le plus ancien dossier en attente démarre.
export async function lancerAttente(magasinId, saufId) {
  const tous = await db.sav.toArray()
  if (tous.some(s => s.type === 'forme' && s.magasinId === magasinId && s.id !== saufId && s.enCoursAt && s.statut !== 'Clôturé')) return
  const attente = tous.filter(s => s.type === 'forme' && s.magasinId === magasinId && s.id !== saufId && !s.enCoursAt && (s.statut || '') === '').sort((a, b) => a.id - b.id)
  if (attente[0]) await db.sav.update(attente[0].id, { enCoursAt: new Date().toISOString() })
}
export async function terminerForme(row) {
  await db.sav.update(row.id, { statut: 'Terminé', enCoursAt: null })
  await lancerAttente(row.magasinId, row.id)
}
export async function cloturerSav(row) {
  await db.sav.update(row.id, { statut: 'Clôturé', enCoursAt: null })
  if (row.type === 'forme') await lancerAttente(row.magasinId, row.id)
}

// Prix unitaire HT d'un RETOUR (marque × magasin), dans cet ordre :
//   1. prix du modèle dans la saison active ;
//   2. prix du modèle dans une autre saison (la plus récente d'abord) — ajout du 13/10 : un retour saisi en Hiver
//      d'un modèle acheté en Été trouvait 0 € ;
//   3. prix moyen de la marque dans la saison active ;
//   4. prix moyen de la marque dans la saison où le modèle a été commandé (la plus récente) — décision du 13/10 ;
//   5. 0 €.
// Les étapes 3 et 4 donnent un prix ESTIMÉ (moyenne de la marque, pas le prix du modèle).
// Renvoie { unit, source: 'modele' | 'modele-autre-saison' | 'prix-moyen' | 'prix-moyen-saison-modele' | 'aucun', saison, estime }.
const ordreSaison = id => { const m = /^(.+)_(\d{4})$/.exec(id || ''); return m ? Number(m[2]) * 2 + (m[1] === 'HIVER' ? 1 : 0) : -1 }
const prixDuModele = (p, modele) => { const q = Number(p?.modeles?.[modele]), px = Number(p?.prixModeles?.[modele]); return q > 0 && px > 0 ? px / q : 0 }
export async function prixRetour(fournisseurId, magasinId, season, modele) {
  const lignes = await db.parametres.where({ fournisseurId, magasinId }).filter(() => true).toArray()
  const active = lignes.find(x => x.season === season)
  const u1 = prixDuModele(active, modele)
  if (u1) return { unit: u1, source: 'modele', saison: season, estime: false }
  const autres = lignes.filter(x => x.season !== season).sort((a, b) => ordreSaison(b.season) - ordreSaison(a.season))
  for (const p of autres) { const u = prixDuModele(p, modele); if (u) return { unit: u, source: 'modele-autre-saison', saison: p.season, estime: false } }
  if (Number(active?.pm) > 0) return { unit: Number(active.pm), source: 'prix-moyen', saison: season, estime: true }
  const commande = autres.find(p => Object.prototype.hasOwnProperty.call(p.modeles || {}, modele) && Number(p.pm) > 0)
  if (commande) return { unit: Number(commande.pm), source: 'prix-moyen-saison-modele', saison: commande.season, estime: true }
  return { unit: 0, source: 'aucun', saison: '', estime: false }
}
export async function prixUnitaire(fournisseurId, magasinId, season, modele) {
  return (await prixRetour(fournisseurId, magasinId, season, modele)).unit
}
export const ORIGINE_PRIX = { 'modele': 'prix du modèle', 'modele-autre-saison': "prix du modèle d'une autre saison", 'prix-moyen': 'prix moyen de la marque', 'prix-moyen-saison-modele': 'prix moyen de la marque, saison de la commande', 'aucun': 'aucun prix connu' }
export const MENTION_ESTIME = "prix estimé, à vérifier avec l'avoir de la marque"

// Effet du prix d'un retour sur le Plan de règlement, d'après l'état du défectueux lié (mêmes règles que calcul.js :
// un avoir n'apparaît que si le défectueux est « Avoir reçu » ou « Clôturé » et si le prix n'est pas 0 €).
export function effetPlanRetour(statutDefectueux, montant, avoirDeduit) {
  const m = Math.abs(Number(montant) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
  if (!statutDefectueux) return 'Retour sans défectueux : aucun avoir dans le Plan de règlement (le prix sert seulement à la valeur du Cahier).'
  if (statutDefectueux === 'Refusé') return 'Défectueux refusé : aucun avoir dans le Plan de règlement.'
  if (!['Avoir reçu', 'Clôturé'].includes(statutDefectueux)) return `Défectueux « ${statutDefectueux} » : pas encore d'avoir ; il apparaîtra dans le Plan de règlement (${m}) quand le défectueux passera à « Avoir reçu ».`
  if (!Number(montant)) return 'Prix à 0 € : aucun avoir dans le Plan de règlement.'
  return `Avoir de ${m} dans le Plan de règlement, à la date du retour${avoirDeduit ? ' (déjà coché « déduit » : le montant déduit change aussi)' : ''}.`
}

// Pointures reçues, grille, catégorie et N° le plus fréquent d'un modèle (depuis le Cahier des entrées)
export async function infosModele(fournisseurId, modele) {
  if (!fournisseurId || !modele) return { tailles: [], typeKey: 'F', categorie: '', numero: '' }
  const lignes = await db.entrees.where('fournisseurId').equals(Number(fournisseurId)).and(e => e.modele === modele).toArray()
  const t = new Set(); let tk = null; const nums = {}, cats = {}
  for (const e of lignes) {
    Object.entries(e.sizes || {}).forEach(([k, v]) => { if (v > 0) t.add(k) })
    if (!tk && e.typeKey) tk = e.typeKey
    const n = (e.numero || '').trim(); if (n) nums[n] = (nums[n] || 0) + 1
    const c = (e.categorie || '').trim(); if (c) cats[c] = (cats[c] || 0) + 1
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  return { tailles: [...t].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b)), typeKey: tk || 'F', categorie: top(cats), numero: top(nums) }
}

// Paires modifiées tant que le défectueux est « À traiter » : la ligne « Retour » liée suit (pointures, nombre de paires,
// PHT au même prix unitaire). Ensuite, l'avoir se corrige par « Corriger le prix » dans le Cahier.
export async function majRetourPaires(entreeId, paires) {
  const e = entreeId ? await db.entrees.get(entreeId) : null
  if (!e || e.statut !== 'Retour') return
  const n = nbPaires(paires) || 1
  const unit = Number(e.total) ? Math.abs(Number(e.pht) || 0) / Math.abs(Number(e.total)) : 0
  await db.entrees.update(entreeId, { sizes: sizesRetour(paires), total: -n, pht: unit > 0 ? -Math.round(unit * n * 100) / 100 : 0 })
}

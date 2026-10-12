// Règles communes de SAV & défectueux (mêmes données et mêmes enchaînements que l'outil actuel)
import { db } from '../db'

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

// Prix unitaire HT d'un modèle (magasin × saison) : prix par modèle, sinon prix moyen — même calcul que l'outil actuel pour les retours
export async function prixUnitaire(fournisseurId, magasinId, season, modele) {
  const p = await db.parametres.where({ fournisseurId, magasinId }).filter(x => x.season === season).first()
  if (!p) return 0
  const q = p.modeles?.[modele], px = p.prixModeles?.[modele]
  return q > 0 && px > 0 ? px / q : (p.pm || 0)
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

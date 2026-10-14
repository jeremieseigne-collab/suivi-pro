// Enregistrer des contacts d'une marque (plan C, étape 2 bis) : au fournisseur quand la marque en hérite (et toujours pour
// la comptabilité, l'adresse et les notes), sinon à la marque. Relit les fiches en base avant d'écrire (pas de valeur
// périmée) et renvoie de quoi annuler. magasinId : pour les champs propres à un magasin (commercial, SAV, compte).
import { db } from '../db'
import { ecritAuFournisseur } from './contactsRegle'

export const CLES_MAGASIN = ['contact', 'telephone', 'emailCommandes', 'contactSav', 'telephoneFixe', 'email', 'numeroClient', 'btob']

export async function enregistrerContacts(marqueId, magasinId, valeurs) {
  const marque = await db.fournisseurs.get(marqueId)
  if (!marque) throw new Error('Marque introuvable')
  const fournisseur = marque.fournisseurReelId ? await db.fournisseursReels.get(marque.fournisseurReelId) : null
  const cibles = { marque: { table: db.fournisseurs, fiche: marque, maj: {} }, fournisseur: { table: db.fournisseursReels, fiche: fournisseur, maj: {} } }
  for (const [k, v] of Object.entries(valeurs)) {
    const c = cibles[fournisseur && ecritAuFournisseur(marque, k) ? 'fournisseur' : 'marque']
    if (CLES_MAGASIN.includes(k) && magasinId != null) {
      const cm = c.maj.coordsMagasin || { ...(c.fiche.coordsMagasin || {}) }
      cm[magasinId] = { ...(cm[magasinId] || {}), [k]: v }
      c.maj.coordsMagasin = cm
    } else c.maj[k] = v
  }
  const annulations = []
  for (const c of Object.values(cibles)) {
    if (!Object.keys(c.maj).length) continue
    const avant = Object.fromEntries(Object.keys(c.maj).map(k => [k, c.fiche[k] ?? (k === 'coordsMagasin' ? {} : '')]))
    await c.table.update(c.fiche.id, c.maj)
    annulations.push(() => c.table.update(c.fiche.id, avant))
  }
  return { annuler: () => Promise.all(annulations.map(f => f())), auFournisseur: Object.keys(cibles.fournisseur.maj).length > 0 }
}

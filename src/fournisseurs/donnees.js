// Commandes fournisseurs (plan C) : lectures et appels aux fonctions de la base.
// Les tables sont en snake_case (pas de passage par le shim Dexie de db/index.js) ; lectures paginées par fetchAll.
import { supabase } from '../lib/supabase'
import { fetchAll } from '../db'

const verif = ({ data, error }) => { if (error) throw new Error(error.message || error.details || 'Erreur de la base'); return data }

// Commandes d'une saison, avec leurs totaux et leur statut déduit (vue achats_commandes_etat)
export const commandesDeSaison = season =>
  fetchAll(() => supabase.from('achats_commandes_etat').select('*').eq('season', season).order('id'))

// Toutes les commandes d'une marque (pour retrouver une commande par n° de BC, toutes saisons)
export const commandesDeMarque = fournisseurId =>
  fetchAll(() => supabase.from('achats_commandes_etat').select('*').eq('fournisseur_id', fournisseurId).order('id'))

// Lignes (reçu, reste, surplus calculés) de plusieurs commandes, par paquets (adresse de requête limitée)
export async function lignesDe(commandeIds) {
  const out = []
  for (let i = 0; i < commandeIds.length; i += 80) {
    const ids = commandeIds.slice(i, i + 80)
    out.push(...await fetchAll(() => supabase.from('achats_lignes_etat').select('*').in('commande_id', ids).order('id')))
  }
  return out
}

// Réceptions (entrées du Cahier rattachées) et journal d'une commande
export const receptionsDe = commandeId =>
  fetchAll(() => supabase.from('entrees').select('id,date,modele,total,pht,sizes,statut,pointe,commentaire').eq('commande_id', commandeId).order('id'))
export const journalDe = async commandeId =>
  verif(await supabase.from('achats_journal').select('*').eq('commande_id', commandeId).order('id', { ascending: false }))

// Correspondance des magasins des fichiers (Réglages → Magasins)
export const correspondances = async () =>
  verif(await supabase.from('magasins_correspondance').select('*').order('valeur'))
export async function ajouterCorrespondance(valeur, magasinId) {
  verif(await supabase.from('magasins_correspondance').insert({ valeur: valeur.trim(), magasin_id: magasinId }))
}
export async function modifierCorrespondance(id, magasinId) {
  verif(await supabase.from('magasins_correspondance').update({ magasin_id: magasinId }).eq('id', id))
}
export async function supprimerCorrespondance(id) {
  verif(await supabase.from('magasins_correspondance').delete().eq('id', id))
}

// Une marque, un magasin ou une saison ont-ils des commandes fournisseurs ? (garde-fous des Réglages)
export async function aDesCommandes(champ, valeur) {
  const { count, error } = await supabase.from('achats_commandes').select('id', { count: 'exact', head: true }).eq(champ, valeur)
  if (error) throw new Error(error.message)
  return count || 0
}

// Fonctions de la base (droits et règles contrôlés par la base)
export async function importerCommande(infos, lignes) {
  return verif(await supabase.rpc('importer_commande', { p_infos: infos, p_lignes: lignes }))
}
export async function reimporterCommande(commandeId, lignes, essai, infos = {}) {
  return verif(await supabase.rpc('reimporter_commande', { p_commande_id: commandeId, p_lignes: lignes, p_infos: infos, p_essai: essai }))
}

// Supprimer une commande importée (Direction, sans réception ; notée au journal, motif facultatif)
export async function supprimerCommande(commandeId, motif = '') {
  return verif(await supabase.rpc('supprimer_commande', { p_commande_id: commandeId, p_motif: motif }))
}

// Réceptions (étape 3) : une entrée du Cahier par modèle-coloris, mouvements et PHT calculés par la base
// articles = [{ code_modele, couleur, tailles: { "38": 2 }, confirme_hors_commande, numero, categorie, type_key, marque, libelle }]
export async function enregistrerReception(commandeId, dateFr, articles, commentaire = '') {
  return verif(await supabase.rpc('enregistrer_reception', { p_commande_id: commandeId, p_date: dateFr, p_articles: articles, p_commentaire: commentaire }))
}
export async function corrigerReception(entreeId, dateFr, article) {
  return verif(await supabase.rpc('corriger_reception', { p_entree_id: entreeId, p_date: dateFr, p_article: article }))
}

// Entrées (réceptions) qui contiennent des paires « hors commande » (mouvements marqués), par paquets
export async function entreesHorsCommande(entreeIds) {
  const out = new Set()
  for (let i = 0; i < entreeIds.length; i += 80) {
    const { data, error } = await supabase.from('mouvements_stock').select('entree_id').eq('hors_commande', true).in('entree_id', entreeIds.slice(i, i + 80))
    if (error) throw new Error(error.message)
    ;(data || []).forEach(r => out.add(r.entree_id))
  }
  return out
}

// Message d'erreur de la base → texte lisible
export function messageErreur(e) {
  const m = String(e?.message || e || '')
  if (/réservé à la Direction/i.test(m)) return 'Réservé à la Direction.'
  if (/deux prix différents/i.test(m)) return m.replace(/^.*?Article/, 'Article')
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion : vérifie le réseau et réessaie.'
  if (/AU_DELA_DU_RESTE|HORS_COMMANDE/.test(m)) return 'La commande a changé entre-temps (autre réception ?) : ' + m.replace(/^.*?: /, '') + '. Vérifie les quantités et réenregistre.'
  return m || 'Erreur inattendue.'
}

// Annuler / rétablir le reliquat (Direction, motif obligatoire ; la base contrôle les deux) : toute la commande (ligneIds = [null])
// ou certaines lignes (un appel par ligne, chacun noté au journal). Renvoie le nombre de lignes touchées.
export async function annulerRetablirReliquat(commandeId, sens, motif, ligneIds = [null]) {
  let n = 0
  for (const id of ligneIds) n += verif(await supabase.rpc('annuler_retablir_reliquat', { p_commande_id: commandeId, p_sens: sens, p_motif: motif, p_ligne_id: id })) || 0
  return n
}

// Date (AAAA-MM-JJ) de la dernière réception de chaque commande d'une saison : { commande_id: date }
export async function dernieresReceptions(season) {
  const rows = await fetchAll(() => supabase.from('entrees').select('id,commande_id,date').eq('season', season).not('commande_id', 'is', null).order('id'))
  const out = {}
  for (const e of rows) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(e.date || ''); if (!m) continue
    const iso = `${m[3]}-${m[2]}-${m[1]}`
    if (!out[e.commande_id] || iso > out[e.commande_id]) out[e.commande_id] = iso
  }
  return out
}

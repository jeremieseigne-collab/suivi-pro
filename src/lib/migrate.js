import Dexie from 'dexie'
import { supabase } from './supabase'

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function migrateLocalToSupabase(onProgress) {
  // Open old local Dexie database
  const oldDb = new Dexie('SuiviPro')
  oldDb.version(3).stores({
    magasins:       '++id, &nom',
    fournisseurs:   '++id, &nom',
    parametres:     '++id, fournisseurId, magasinId, season',
    entrees:        '++id, magasinId, fournisseurId, date, statut, season',
    suivi:          '++id, fournisseurId, magasinId',
    modesReglement: '++id, fournisseurId, magasinId',
  })

  onProgress('Lecture des données locales…')
  const [magasins, fournisseurs, parametres, entrees, modesReglement, suivi] = await Promise.all([
    oldDb.magasins.toArray(),
    oldDb.fournisseurs.toArray(),
    oldDb.parametres.toArray(),
    oldDb.entrees.toArray(),
    oldDb.modesReglement.toArray(),
    oldDb.suivi.toArray(),
  ])

  if (magasins.length === 0 && fournisseurs.length === 0) {
    throw new Error('Aucune donnée locale trouvée. La base IndexedDB est vide.')
  }

  // Safety: check Supabase isn't already populated
  const { count } = await supabase.from('magasins').select('*', { count: 'exact', head: true })
  if (count > 0) {
    throw new Error('Supabase contient déjà des données. Supprimez-les d\'abord ou annulez.')
  }

  const magasinMap     = {}
  const fournisseurMap = {}

  // --- Magasins ---
  onProgress(`Import magasins (${magasins.length})…`)
  for (const m of magasins) {
    const { data, error } = await supabase.from('magasins').insert({ nom: m.nom }).select('id').single()
    if (error) throw new Error(`Magasin "${m.nom}" : ${error.message}`)
    magasinMap[m.id] = data.id
  }

  // --- Fournisseurs ---
  onProgress(`Import marques (${fournisseurs.length})…`)
  for (const f of fournisseurs) {
    const modelesBySeason = f.modelesBySeason
      || (Array.isArray(f.modeles) && f.modeles.length ? { ETE_2026: f.modeles } : {})
    const { data, error } = await supabase.from('fournisseurs')
      .insert({ nom: f.nom, modeles_by_season: modelesBySeason })
      .select('id').single()
    if (error) throw new Error(`Marque "${f.nom}" : ${error.message}`)
    fournisseurMap[f.id] = data.id
  }

  // --- Parametres (achats) ---
  onProgress(`Import achats (${parametres.length})…`)
  for (const batch of chunk(parametres, 50)) {
    const rows = batch
      .filter(p => magasinMap[p.magasinId] && fournisseurMap[p.fournisseurId])
      .map(p => ({
        fournisseur_id: fournisseurMap[p.fournisseurId],
        magasin_id:     magasinMap[p.magasinId],
        season:         p.season || 'ETE_2026',
        statut:         p.statut || '',
        recu_n1:        p.recuN1     || 0,
        objectif_n:     p.objectifN  || 0,
        reel_n:         p.reelN      || 0,
        quantite:       p.quantite   || 0,
        pm:             p.pm         || 0,
        strategie:      p.strategie  || '',
        pht:            p.pht        || 0,
      }))
    if (rows.length) {
      const { error } = await supabase.from('parametres').insert(rows)
      if (error) throw new Error(`Achats : ${error.message}`)
    }
  }

  // --- Entrées ---
  onProgress(`Import entrées (${entrees.length})…`)
  for (const batch of chunk(entrees, 50)) {
    const rows = batch
      .filter(e => magasinMap[e.magasinId] && fournisseurMap[e.fournisseurId])
      .map(e => ({
        magasin_id:     magasinMap[e.magasinId],
        fournisseur_id: fournisseurMap[e.fournisseurId],
        date:           e.date       || '',
        statut:         e.statut     || '',
        season:         e.season     || 'ETE_2026',
        modele:         e.modele     || '',
        numero:         e.numero     || '',
        categorie:      e.categorie  || '',
        type_key:       e.typeKey    || 'F',
        total:          e.total      || 0,
        pht:            e.pht        || 0,
        sizes:          e.sizes      || {},
        commentaire:    e.commentaire || '',
      }))
    if (rows.length) {
      const { error } = await supabase.from('entrees').insert(rows)
      if (error) throw new Error(`Entrées : ${error.message}`)
    }
  }

  // --- Modes de règlement ---
  const modeRows = modesReglement
    .filter(m => magasinMap[m.magasinId] && fournisseurMap[m.fournisseurId])
    .map(m => ({
      fournisseur_id: fournisseurMap[m.fournisseurId],
      magasin_id:     magasinMap[m.magasinId],
      mode_reglement: m.modeReglement || '',
    }))
  if (modeRows.length) {
    const { error } = await supabase.from('modes_reglement').insert(modeRows)
    if (error) throw new Error(`Modes : ${error.message}`)
  }

  // --- Suivi ---
  const suiviRows = suivi
    .filter(s => magasinMap[s.magasinId] && fournisseurMap[s.fournisseurId])
    .map(s => ({ fournisseur_id: fournisseurMap[s.fournisseurId], magasin_id: magasinMap[s.magasinId] }))
  if (suiviRows.length) {
    const { error } = await supabase.from('suivi').insert(suiviRows)
    if (error) throw new Error(`Suivi : ${error.message}`)
  }

  return { magasins: magasins.length, fournisseurs: fournisseurs.length, parametres: parametres.length, entrees: entrees.length }
}

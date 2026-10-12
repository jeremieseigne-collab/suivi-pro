import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { isActif, retard, joursDepuis, joursEtape } from '../reassort/constants'
import { magasinCommandes, memeMagasin } from '../commandes/constants'

// Dossier SAV (retour client ou réparation) non clôturé au-delà de ce délai → tâche « En retard » sur l'accueil
export const SAV_ATTENTE_JOURS = 15

// Compteurs « à surveiller » et tâches en retard (filtrés sur le magasin courant s'il y en a un)
export function useAlerts(magasin) {
  return useLiveQuery(async () => {
    const [reassorts, defs, savs, cmds, fournisseurs] = await Promise.all([
      db.reassorts.toArray(), db.defectueux.toArray(), db.sav.toArray(), db.commandes.toArray(), db.fournisseurs.toArray(),
    ])
    const nomMarque = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    const mine = r => !magasin || r.magasinId === magasin.id
    const nomCmd = magasinCommandes(magasin?.nom)
    const cmdMine = c => !magasin || memeMagasin(c.magasin, nomCmd)
    const actifs = reassorts.filter(r => isActif(r) && mine(r))
    // Tâches en retard : réassorts « En route » depuis 10 jours ou plus ; dossiers SAV ouverts depuis 15 jours ou plus
    const retards = actifs.filter(r => retard(r))
      .map(r => ({ id: r.id, marque: nomMarque[r.fournisseurId] || '', modele: r.modele || '', statut: r.statut, jours: joursEtape(r), niveau: retard(r) }))
      .sort((a, b) => b.jours - a.jours)
    const savAnciens = savs.filter(s => mine(s) && (s.type === 'retour' || s.type === 'reparation') && s.statut !== 'Clôturé' && s.statut !== 'Récupéré' && (joursDepuis(s.createdAt) ?? 0) >= SAV_ATTENTE_JOURS)
      .map(s => ({ id: s.id, client: s.clientNom || '', marque: nomMarque[s.fournisseurId] || s.marque || '', jours: joursDepuis(s.createdAt), mailEnvoye: s.statut === 'Mail marque envoyé' }))
      .sort((a, b) => b.jours - a.jours)
    return {
      aCommander: actifs.filter(r => r.statut === 'À réassortir').length,   // « Demandé » = demande envoyée : n'est plus « à commander » (13/10)
      enRoute:    actifs.filter(r => r.statut === 'En route').length,
      retard:     retards.length,
      retardRoute: retards.filter(r => r.statut === 'En route').length,   // pour « Réassorts en route · dont X en retard »
      retards, savAnciens,
      defATraiter: defs.filter(d => mine(d) && d.statut === 'À traiter').length,
      savEnCours: savs.filter(s => mine(s) && s.statut !== 'Clôturé' && s.statut !== 'Récupéré').length,
      cmdAPrevenir: cmds.filter(c => cmdMine(c) && c.statut === 'Reçue').length,
      cmdACommander: cmds.filter(c => cmdMine(c) && c.statut === 'À commander').length,
    }
  }, [magasin?.id])
}

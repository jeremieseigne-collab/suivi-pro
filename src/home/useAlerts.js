import { db } from '../db'
import { useLiveQuery } from '../lib/useLiveQuery'
import { isActif, retard } from '../reassort/constants'
import { magasinCommandes } from '../commandes/constants'

// Compteurs « à surveiller » (filtrés sur le magasin courant s'il y en a un)
export function useAlerts(magasin) {
  return useLiveQuery(async () => {
    const [reassorts, defs, savs, cmds] = await Promise.all([
      db.reassorts.toArray(), db.defectueux.toArray(), db.sav.toArray(), db.commandes.toArray(),
    ])
    const mine = r => !magasin || r.magasinId === magasin.id
    const nomCmd = magasinCommandes(magasin?.nom)
    const cmdMine = c => !magasin || c.magasin === nomCmd
    const actifs = reassorts.filter(r => isActif(r) && mine(r))
    return {
      aCommander: actifs.filter(r => r.statut === 'À réassortir' || r.statut === 'Demandé').length,
      enRoute:    actifs.filter(r => r.statut === 'En route').length,
      retard:     actifs.filter(r => retard(r)).length,
      defATraiter: defs.filter(d => mine(d) && d.statut === 'À traiter').length,
      savEnCours: savs.filter(s => mine(s) && s.statut !== 'Clôturé' && s.statut !== 'Récupéré').length,
      cmdAPrevenir: cmds.filter(c => cmdMine(c) && c.statut === 'Reçue').length,
      cmdACommander: cmds.filter(c => cmdMine(c) && c.statut === 'À commander').length,
    }
  }, [magasin?.id])
}

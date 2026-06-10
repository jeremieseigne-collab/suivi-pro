import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'

export function useParams() {
  const { season } = useSeason()

  const params = useLiveQuery(async () => {
    const [magasins, fournisseurs, modesReglement] = await Promise.all([
      db.magasins.orderBy('nom').toArray(),
      db.fournisseurs.orderBy('nom').toArray(),
      db.modesReglement.toArray(),
    ])

    const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    const magasinMap     = Object.fromEntries(magasins.map(m => [m.id, m.nom]))

    const modelesByMarque = {}
    fournisseurs.forEach(f => {
      // modelesBySeason[season] en priorité, sinon modeles (anciens enregistrements)
      modelesByMarque[f.nom] = f.modelesBySeason?.[season] ?? []
    })

    const modeByKey = {}
    modesReglement.forEach(m => {
      const fNom = fournisseurMap[m.fournisseurId]
      const mNom = magasinMap[m.magasinId]
      if (fNom && mNom) {
        modeByKey[fNom + mNom] = { rowIndex: m.id, mode: m.modeReglement || '' }
      }
    })

    return { fournisseurs: fournisseurs.map(f => f.nom), magasins: magasins.map(m => m.nom), modelesByMarque, modeByKey }
  }, [season])

  return { params: params ?? null, loading: params === undefined }
}

export function clearParamsCache() {}

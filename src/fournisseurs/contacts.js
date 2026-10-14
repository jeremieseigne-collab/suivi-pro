// Fournisseurs chargés une fois pour toute l'application (temps réel), pour la lecture des contacts (mails, Répertoire)
import { useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { contactDe } from './contactsRegle'

let parId = {}
const memoriser = liste => { parId = Object.fromEntries(liste.map(f => [f.id, f])) }
export const fournisseurDe = marque => (marque ? parId[marque.fournisseurReelId] : undefined)
export const contact = (marque, magasinId, key) => contactDe(marque, fournisseurDe(marque), magasinId, key)
export function useFournisseursReels() {
  const liste = useLiveQuery(() => db.fournisseursReels.toArray(), [])
  useEffect(() => { if (liste) memoriser(liste) }, [liste])
  return liste
}

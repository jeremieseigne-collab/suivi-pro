import { createContext, useContext } from 'react'

// Compte connecté : { email, estDirection }.
// estDirection sert seulement à l'affichage (menus, boutons) : la base vérifie elle-même les droits.
export const CompteContext = createContext({ email: '', estDirection: false })

export function useCompte() {
  return useContext(CompteContext)
}

export function compteDepuisSession(session) {
  const u = session?.user
  return { email: u?.email || '', estDirection: u?.app_metadata?.role === 'direction' }
}

import { createContext, useContext, useState } from 'react'

// Magasin courant, choisi une seule fois (accueil) et partagé par tous les outils.
// Stocké dans localStorage['magasin_courant'] sous la forme { id, nom }.
const KEY = 'magasin_courant'

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v?.id) return v
    // Reprise du magasin déjà choisi dans un des anciens outils
    for (const k of ['reassort_magasin', 'sav_magasin', 'defectueux_magasin']) {
      const o = JSON.parse(localStorage.getItem(k) || 'null')
      if (o?.id) return { id: o.id, nom: o.nom }
    }
  } catch { /* ignore */ }
  return null
}

const MagasinContext = createContext(null)

export function MagasinProvider({ children }) {
  const [magasin, setState] = useState(load)
  function setMagasin(m) {
    const v = m ? { id: m.id, nom: m.nom } : null
    try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { /* ignore */ }
    setState(v)
  }
  return <MagasinContext.Provider value={{ magasin, setMagasin }}>{children}</MagasinContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMagasin() { return useContext(MagasinContext) }

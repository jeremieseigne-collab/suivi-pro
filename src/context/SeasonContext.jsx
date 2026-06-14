import { createContext, useContext, useState } from 'react'

const COLORS = ['#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf', '#e879f9']

// Libellés de saison sans accents (ex. « Été 2026 » → « Ete 2026 »)
function stripAccents(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const DEFAULT_SEASONS = [
  { id: 'ETE_2026',   label: 'Ete 2026',   color: COLORS[0] },
  { id: 'HIVER_2026', label: 'Hiver 2026', color: COLORS[1] },
  { id: 'ETE_2027',   label: 'Ete 2027',   color: COLORS[2] },
]

function makeId(label) {
  return label.toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

function loadSeasons() {
  try {
    const stored = localStorage.getItem('suivi_seasons')
    const seasons = stored ? JSON.parse(stored) : DEFAULT_SEASONS
    // Migration : enlève les accents des libellés existants (les IDs ne bougent pas)
    const normalized = seasons.map(s => ({ ...s, label: stripAccents(s.label) }))
    if (stored && JSON.stringify(normalized) !== stored) {
      localStorage.setItem('suivi_seasons', JSON.stringify(normalized))
    }
    return normalized
  } catch { return DEFAULT_SEASONS }
}

const SeasonContext = createContext(null)

export function SeasonProvider({ children }) {
  const [seasons, setSeasons] = useState(loadSeasons)
  const [season,  setSeason]  = useState(() => localStorage.getItem('suivi_season') || 'ETE_2026')

  function changeSeason(s) {
    setSeason(s)
    localStorage.setItem('suivi_season', s)
  }

  function addSeason(label) {
    const trimmed = label.trim()
    if (!trimmed) return null
    const id = makeId(trimmed)
    if (seasons.find(s => s.id === id)) return id
    const color = COLORS[seasons.length % COLORS.length]
    const updated = [...seasons, { id, label: stripAccents(trimmed), color }]
    setSeasons(updated)
    localStorage.setItem('suivi_seasons', JSON.stringify(updated))
    return id
  }

  function removeSeason(id) {
    const updated = seasons.filter(s => s.id !== id)
    setSeasons(updated)
    localStorage.setItem('suivi_seasons', JSON.stringify(updated))
    if (season === id && updated.length > 0) changeSeason(updated[0].id)
  }

  return (
    <SeasonContext.Provider value={{ season, setSeason: changeSeason, seasons, addSeason, removeSeason }}>
      {children}
    </SeasonContext.Provider>
  )
}

export function useSeason() {
  return useContext(SeasonContext)
}

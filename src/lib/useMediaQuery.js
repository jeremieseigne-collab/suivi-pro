import { useState, useEffect } from 'react'

// true si la media query correspond (ex. '(max-width: 640px)'), mis à jour au redimensionnement
export function useMediaQuery(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = e => setMatch(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return match
}

// Points de rupture communs
export const PHONE  = '(max-width: 640px)'
export const TABLET = '(max-width: 1024px)'

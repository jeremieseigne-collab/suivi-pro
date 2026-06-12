// Helpers de dates pour l'agenda (en heure locale, pour éviter les décalages)

export function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${j}`
}

export function parseLocal(iso) {
  const [y, m, j] = iso.split('-').map(Number)
  return new Date(y, m - 1, j)
}

export function mondayOf(d) {
  const dt = new Date(d)
  const day = (dt.getDay() + 6) % 7 // 0 = lundi
  dt.setDate(dt.getDate() - day)
  dt.setHours(0, 0, 0, 0)
  return dt
}

// "Lundi 9 juin"
export function fmtDayLabel(d) {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "Lun. 9"
export function fmtDayShort(d) {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "9 juin"
export function fmtShort(d) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

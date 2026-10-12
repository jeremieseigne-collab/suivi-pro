import { SENDER_BY_SOCIETE } from '../defectueux/mail'
import { sortSizes } from './constants'

// Construit l'URL de rédaction Gmail pour une commande de réassort à la marque
export function buildReassortMailUrl({ modele, numero, sizes, magasin, salarie, societe, email, numeroClient }) {
  const subject = `Réassort modèle "${modele}" — Société ${societe}${numeroClient ? ` — N° client ${numeroClient}` : ''}`
  const lignes = sortSizes(Object.keys(sizes || {}))
    .filter(s => Number(sizes[s]) > 0)
    .map(s => `- Pointure ${s} : ${sizes[s]} paire${Number(sizes[s]) > 1 ? 's' : ''}`)
    .join('\n')
  const body =
`Bonjour,
Pourriez-vous nous faire parvenir le réassort suivant pour notre magasin${magasin ? ` de ${magasin}` : ''} :
Référence "${modele}"${numero ? ` (N° ${numero})` : ''}
${lignes}
Merci de nous confirmer la disponibilité et le délai de livraison.
Bien cordialement,

${salarie || ''}
Société ${societe}`
  const sender = SENDER_BY_SOCIETE[societe]
  const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
  return `${base}?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Coordonnée de la marque pour un magasin (répertoire par magasin, sinon valeur commune), sans espaces en trop.
// Utilisée par les mails de réassort, SAV et défectueux.
export function coordMarque(f, magasinId, key) {
  if (!f) return ''
  const cm = f.coordsMagasin && f.coordsMagasin[magasinId]
  const v = String((cm && cm[key] && String(cm[key]).trim()) || f[key] || '').trim()
  return v
}

// « Enregistrer dans le répertoire » : l'adresse tapée est enregistrée pour le magasin du dossier (et non plus pour toute la marque)
export function enregistrerEmailMagasin(f, magasinId, email) {
  const cm = { ...(f?.coordsMagasin || {}) }
  cm[magasinId] = { ...(cm[magasinId] || {}), email: (email || '').trim() }
  return cm
}

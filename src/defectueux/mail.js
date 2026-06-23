// Compte Gmail expéditeur selon la société
const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}

// Construit l'URL de rédaction Gmail pour un défectueux (utilisé à la création ET depuis la liste)
export function buildDefectueuxMailUrl({ modele, pointure, note, societe, email, numeroClient }) {
  const subject = `Défectueux modèle "${modele}" — Société ${societe}${numeroClient ? ` — N° client ${numeroClient}` : ''}`
  const body =
`Bonjour,

Nous avons reçu une paire de la référence "${modele}"${pointure ? ` pointure ${pointure}` : ''} présentant le défaut suivant : ${note || ''}

Vous trouverez les photos en pièce jointe.

Nous vous remercions de bien vouloir nous faire parvenir l'avoir correspondant.

Bien cordialement,

Société ${societe}`
  // Compte expéditeur selon la société (sinon compte Gmail par défaut)
  const sender = SENDER_BY_SOCIETE[societe]
  const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
  return `${base}?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

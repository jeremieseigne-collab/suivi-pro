const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}

export function buildSavRetourMailUrl({ modele, pointure, probleme, salarie, societe, email, numeroClient }) {
  const subject = `Retour client — Modèle "${modele}" — Société ${societe}${numeroClient ? ` — N° client ${numeroClient}` : ''}`
  const body =
`Bonjour,

Nous avons reçu une paire de la référence "${modele}"${pointure ? ` pointure ${pointure}` : ''} présentant le défaut suivant : ${probleme || ''}

Vous trouverez les photos en pièce jointe.

Nous vous remercions de bien vouloir nous faire parvenir l'avoir correspondant.

Bien cordialement,

${salarie || ''}
Société ${societe}`
  const sender = SENDER_BY_SOCIETE[societe]
  const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
  return `${base}?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}

export function buildSavRetourMailUrl({ modele, pointure, probleme, salarie, societe, email, numeroClient }) {
  const subject = `Retour client — Modèle "${modele}" — Société ${societe}${numeroClient ? ` — N° client ${numeroClient}` : ''}`
  const body =
`Bonjour,

Nous avons reçu un retour client pour la référence "${modele}"${pointure ? ` pointure ${pointure}` : ''} présentant le problème suivant : ${probleme || ''}

Merci de nous confirmer si ce cas entre dans votre garantie afin que nous puissions proposer une solution à notre client (remboursement, échange ou avoir).

Nous restons à votre disposition pour vous transmettre des photos ou toute information complémentaire.

Bien cordialement,

${salarie || ''}
Société ${societe}`
  const sender = SENDER_BY_SOCIETE[societe]
  const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
  return `${base}?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

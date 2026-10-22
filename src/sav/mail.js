import { nbPairesDossier } from '../savdef/paires'

const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}

// Une paire : « une paire de la référence "X" pointure 38 » (comme avant) ; plusieurs : « 3 paires de la référence "X" (pointures 38 ×2, 39 ×1) »
function paires(pointure, modele) {
  const n = nbPairesDossier(pointure)
  if (n <= 1) return `une paire de la référence "${modele}"${pointure ? ` pointure ${pointure}` : ''}`
  return `${n} paires de la référence "${modele}" (pointures ${pointure})`
}

export function buildSavRetourMailUrl({ modele, pointure, probleme, salarie, societe, email, numeroClient }) {
  const n = nbPairesDossier(pointure)
  const subject = `Retour client — Modèle "${modele}"${n > 1 ? ` — ${n} paires` : ''} — Société ${societe}${numeroClient ? ` — N° client ${numeroClient}` : ''}`
  const body =
`Bonjour,
Nous avons reçu ${paires(pointure, modele)} présentant le défaut suivant : ${probleme || ''}
Vous trouverez les photos en pièce jointe.
Nous vous remercions de bien vouloir nous faire parvenir l'avoir correspondant.
Bien cordialement,

${salarie || ''}
Société ${societe}`
  const sender = SENDER_BY_SOCIETE[societe]
  const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
  return `${base}?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

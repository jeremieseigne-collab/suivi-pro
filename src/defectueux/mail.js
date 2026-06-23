// Compte Gmail expéditeur selon la société
const SENDER_BY_SOCIETE = {
  "B'Shoes":  'contact.baillyalbi@gmail.com',
  'JR Shoes': 'contact.baillyrouffiac@gmail.com',
}

// Notes auto-générées depuis le SAV : "Retour client — client (tél) : défaut" / "Réparation — … : défaut".
// Pour le mail au fournisseur, on ne garde QUE le défaut (pas le nom du dossier ni le client).
function defautSeul(note) {
  if (!note) return ''
  const m = /^(?:Retour client|Réparation)\s*—\s*[^:]*:\s*([\s\S]*)$/.exec(note)
  return (m ? m[1] : note).trim()
}

// Construit l'URL de rédaction Gmail pour un défectueux (utilisé à la création ET depuis la liste)
export function buildDefectueuxMailUrl({ modele, pointure, note, salarie, societe, email, numeroClient }) {
  const subject = `Défectueux modèle "${modele}" — Société ${societe}${numeroClient ? ` — N° client ${numeroClient}` : ''}`
  const body =
`Bonjour,
Nous avons reçu une paire de la référence "${modele}"${pointure ? ` pointure ${pointure}` : ''} présentant le défaut suivant : ${defautSeul(note)}
Vous trouverez les photos en pièce jointe.
Nous vous remercions de bien vouloir nous faire parvenir l'avoir correspondant.
Bien cordialement,

${salarie || ''}
Société ${societe}`
  // Compte expéditeur selon la société (sinon compte Gmail par défaut)
  const sender = SENDER_BY_SOCIETE[societe]
  const base = sender ? `https://mail.google.com/mail/u/${encodeURIComponent(sender)}/` : 'https://mail.google.com/mail/'
  return `${base}?view=cm&fs=1&to=${encodeURIComponent(email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// Envoi d'email via SMTP Gmail (mot de passe d'application).
// Utilisé par la fonction Vercel api/send-mail.js ET par le middleware de dev (vite.config.js).
import nodemailer from 'nodemailer'

// Seuls les mails prévus par l'outil peuvent partir (App Paie) : destinataires et objets fixés ici,
// côté serveur, pour que la fonction ne puisse pas servir à envoyer des mails à n'importe qui.
const ALLOWED = [
  { to: 'marion.fouquereau@lecussan.fr', subjectPrefix: 'Éléments variables de paie — ' },     // récap mensuel (RECAP_EMAIL)
  { to: 'jeremie.seigne@gmail.com',      subjectPrefix: 'Demande de modification paie — ' },  // demande de modification (ADMIN_EMAIL)
]
const MAX_SUBJECT = 200
const MAX_TEXT    = 20000

// Vérifie la demande ; lève une erreur avec status 400 si elle n'est pas autorisée.
export function validateMail({ to, subject, text } = {}) {
  const fail = msg => { const e = new Error(msg); e.status = 400; throw e }
  if (typeof to !== 'string' || typeof subject !== 'string' || typeof text !== 'string') fail('Demande invalide')
  if (subject.length > MAX_SUBJECT || text.length > MAX_TEXT || /[\r\n]/.test(subject)) fail('Demande invalide')
  const rule = ALLOWED.find(r => r.to === to.trim().toLowerCase() && subject.startsWith(r.subjectPrefix))
  if (!rule) fail('Envoi non autorisé')
  return { to: rule.to, subject, text }
}

let transporter

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '') // les mots de passe d'app Google s'affichent avec des espaces
  if (!user || !pass) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD non configurés')
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    })
  }
  return transporter
}

export async function sendMail(mail) {
  const { to, subject, text } = validateMail(mail)
  const t = getTransporter()
  const from = `B'Shoes & JR Shoes <${process.env.GMAIL_USER}>`
  await t.sendMail({ from, to, subject, text })
}

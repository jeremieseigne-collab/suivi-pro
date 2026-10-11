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
// Même message quel que soit le motif, pour ne rien révéler des destinataires autorisés.
export function validateMail({ to, subject, text } = {}) {
  const fail = msg => { const e = new Error(msg); e.status = 400; throw e }
  if (typeof to !== 'string' || typeof subject !== 'string' || typeof text !== 'string') fail('Demande refusée')
  if (subject.length > MAX_SUBJECT || text.length > MAX_TEXT || /[\r\n]/.test(subject)) fail('Demande refusée')
  const rule = ALLOWED.find(r => r.to === to.trim().toLowerCase() && subject.startsWith(r.subjectPrefix))
  if (!rule) fail('Demande refusée')
  return { to: rule.to, subject, text }
}

// Vérifie que la demande vient d'un appareil connecté à l'outil (jeton de session Supabase valide).
// Lève une erreur 401 sinon. Utilise l'adresse et la clé publique déjà connues (pas de clé secrète).
export async function verifierConnexion(authorization) {
  const refus = () => { const e = new Error('Connexion requise'); e.status = 401; throw e }
  const jeton = /^Bearer\s+(.+)$/i.exec(authorization || '')?.[1]
  if (!jeton) refus()
  const url = process.env.VITE_SUPABASE_URL, cle = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !cle) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non configurées')
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: cle, Authorization: `Bearer ${jeton}` } })
  if (!r.ok) refus()
  return jeton
}

// Plafond d'envoi : la base note l'envoi et refuse au-delà de 3 récaps / 24 h vers la comptable
// et 10 demandes / 24 h vers la direction (fonction noter_envoi_mail, appelée avec la connexion de l'appareil).
// Lève une erreur 429 si le plafond est atteint.
export async function noterEnvoi(jeton, { to, subject }) {
  const url = process.env.VITE_SUPABASE_URL, cle = process.env.VITE_SUPABASE_ANON_KEY
  const r = await fetch(`${url}/rest/v1/rpc/noter_envoi_mail`, {
    method: 'POST',
    headers: { apikey: cle, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinataire: to, objet: subject }),
  })
  if (!r.ok) throw new Error(`Journal des mails indisponible (${r.status})`)
  if ((await r.json()) !== true) { const e = new Error('Plafond d\'envoi atteint pour aujourd\'hui'); e.status = 429; throw e }
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

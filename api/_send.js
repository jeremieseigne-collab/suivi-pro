// Envoi d'email via SMTP Gmail (mot de passe d'application).
// Utilisé par la fonction Vercel api/send-mail.js ET par le middleware de dev (vite.config.js).
import nodemailer from 'nodemailer'

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

export async function sendMail({ to, subject, text, replyTo }) {
  if (!to || !subject) throw new Error('Champs "to" et "subject" requis')
  const t = getTransporter()
  const from = `B'Shoes & JR Shoes <${process.env.GMAIL_USER}>`
  await t.sendMail({ from, to, subject, text, replyTo })
}

import { HOUR_SECTIONS, RANGE_SECTIONS, periodeLabel } from './constants'

// Appel de la fonction serveur d'envoi (Vercel api/send-mail.js, ou middleware Vite en dev)
async function postMail({ to, subject, text }) {
  let res
  try {
    res = await fetch('/api/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text }),
    })
  } catch {
    throw new Error('Service d’envoi injoignable')
  }
  let data
  try { data = await res.json() } catch { throw new Error('Service d’envoi indisponible (réservé à la version en ligne)') }
  if (!res.ok || !data.ok) throw new Error(data?.error || `Erreur ${res.status}`)
}

function fmtDate(d) {
  if (!d) return '?'
  const [y, m, j] = d.split('-')
  return `${j}/${m}/${y}`
}

function num(v) { return parseFloat(String(v).replace(',', '.')) || 0 }

function salarieBlock(row) {
  const d = row.data || {}
  const lines = [`• ${row.salarie}`]
  for (const s of HOUR_SECTIONS) {
    const items = (d[s.key] || []).filter(it => it.date || it.heures)
    if (items.length) {
      const tot = items.reduce((t, it) => t + num(it.heures), 0)
      lines.push(`   - ${s.label} (${tot} h) : ` + items.map(it => `${fmtDate(it.date)} = ${it.heures || '?'} h`).join(', '))
    }
  }
  for (const s of RANGE_SECTIONS) {
    const items = (d[s.key] || []).filter(it => it.du || it.au)
    if (items.length) {
      lines.push(`   - ${s.label} : ` + items.map(it => `du ${fmtDate(it.du)} au ${fmtDate(it.au)}`).join(', '))
    }
  }
  if (d.commentaire && d.commentaire.trim()) lines.push(`   - Commentaire : ${d.commentaire.trim()}`)
  if (lines.length === 1) lines.push('   (rien à signaler)')
  return lines.join('\n')
}

// Récap texte groupé par société
export function buildRecapText(periode, rows) {
  const bySoc = {}
  for (const r of rows) {
    const s = r.societe || 'Sans société'
    ;(bySoc[s] ||= []).push(r)
  }
  const parts = [
    'Bonjour Marion,',
    'J’espère que vous allez bien.',
    `Veuillez trouver ci-dessous les informations nécessaires pour les bulletins de paie de ${periodeLabel(periode)} :`,
    '',
  ]
  for (const soc of Object.keys(bySoc).sort()) {
    parts.push(`═══ ${soc} ═══`, '')
    bySoc[soc].sort((a, b) => a.salarie.localeCompare(b.salarie)).forEach(r => {
      parts.push(salarieBlock(r), '')
    })
  }
  parts.push(...SIGNATURE)
  return parts.join('\n')
}

// Signature ajoutée à la fin du récap
const SIGNATURE = [
  'Bien cordialement,',
  '',
  'Jérémie Seigné',
  '______________________',
  '',
  "B'Shoes & JR Shoes",
  'T / 06.85.78.69.40',
  'M / bshoes.albi@gmail.com',
]

// ─── Demande de modification (envoyée à la direction) ────────────────────────
function modificationBody({ salarie, periode, message }) {
  return `Bonjour,

Une demande de modification des éléments variables de paie a été déposée.

Salarié : ${salarie}
Période : ${periodeLabel(periode)}

Détail de la demande :
${(message || '').trim() || '(aucun détail fourni)'}`
}

export function modificationGmailUrl({ salarie, periode, message, toEmail }) {
  const su = `Demande de modification paie — ${salarie} — ${periodeLabel(periode)}`
  const body = modificationBody({ salarie, periode, message })
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`
}

// Envoi de la demande de modification à la direction
export async function sendModificationRequest({ salarie, periode, message, toEmail }) {
  await postMail({
    to: toEmail,
    subject: `Demande de modification paie — ${salarie} — ${periodeLabel(periode)}`,
    text: modificationBody({ salarie, periode, message }),
  })
}

// Envoi du récap mensuel à la comptable
export async function sendPaieRecap({ periode, rows, toEmail }) {
  const recap = buildRecapText(periode, rows)
  await postMail({
    to: toEmail,
    subject: `Éléments variables de paie — ${periodeLabel(periode)}`,
    text: recap,
  })
  return recap
}

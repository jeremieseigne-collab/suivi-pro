import { HOUR_SECTIONS, RANGE_SECTIONS, periodeLabel } from './constants'

// Clés EmailJS (voir .env.local) — sans elles, l'envoi auto est désactivé
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const emailjsConfigured = !!(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

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
  const parts = [`Éléments variables de paie — ${periodeLabel(periode)}`, '']
  for (const soc of Object.keys(bySoc).sort()) {
    parts.push(`═══ ${soc} ═══`, '')
    bySoc[soc].sort((a, b) => a.salarie.localeCompare(b.salarie)).forEach(r => {
      parts.push(salarieBlock(r), '')
    })
  }
  return parts.join('\n')
}

// Envoi du récap via l'API REST EmailJS (lève une erreur si non configuré ou échec)
export async function sendPaieRecap({ periode, rows, toEmail }) {
  if (!emailjsConfigured) throw new Error('EmailJS non configuré')
  const recap = buildRecapText(periode, rows)
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        periode: periodeLabel(periode),
        recap,
      },
    }),
  })
  if (!res.ok) throw new Error(`EmailJS ${res.status}: ${await res.text()}`)
  return recap
}

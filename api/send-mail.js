import { sendMail } from './_send.js'

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body // Vercel parse déjà le JSON
  return await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ ok: false, error: 'Méthode non autorisée' }))
    return
  }
  try {
    const { to, subject, text, replyTo } = await readJson(req)
    await sendMail({ to, subject, text, replyTo })
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true }))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ ok: false, error: String(e.message || e) }))
  }
}

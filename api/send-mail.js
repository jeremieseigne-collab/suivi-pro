import { sendMail } from './_send.js'

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body // Vercel parse déjà le JSON
  return await new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => { data += c; if (data.length > 100000) reject(new Error('Demande trop volumineuse')) })
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
    const { to, subject, text } = await readJson(req)
    await sendMail({ to, subject, text })
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true }))
  } catch (e) {
    // Refus (400) : on renvoie le motif. Échec d'envoi : message générique, détail dans les logs Vercel.
    if (e.status === 400) {
      res.statusCode = 400
      res.end(JSON.stringify({ ok: false, error: e.message }))
    } else {
      console.error('send-mail', e)
      res.statusCode = 500
      res.end(JSON.stringify({ ok: false, error: 'Envoi impossible pour le moment' }))
    }
  }
}

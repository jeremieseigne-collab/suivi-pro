// Fonction serveur Vercel : événements des calendriers des magasins, pour un appareil connecté seulement.
// GET /api/agenda?debut=<instant ISO>&fin=<instant ISO>, avec « Authorization: Bearer <jeton de session> ».
import { verifierConnexion } from './_send.js'
import { agendaEntre, lireFenetre } from './_agenda.js'

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end(JSON.stringify({ ok: false, error: 'Méthode non autorisée' }))
    return
  }
  try {
    await verifierConnexion(req.headers.authorization)
    const { debut, fin } = lireFenetre(new URL(req.url, 'http://local').searchParams)
    const r = await agendaEntre(debut, fin)
    res.setHeader('Cache-Control', 'private, max-age=180')   // l'appareil garde la réponse 3 minutes ; jamais en cache partagé
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true, ...r }))
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store')
    if (e.status === 400 || e.status === 401) {
      res.statusCode = e.status
      res.end(JSON.stringify({ ok: false, error: e.message }))
    } else {
      console.error('Agenda : erreur du serveur (' + (e.name || 'erreur') + ')')
      res.statusCode = 500
      res.end(JSON.stringify({ ok: false, error: 'Agenda indisponible pour le moment' }))
    }
  }
}

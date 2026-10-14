import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// En local seulement : les liens des calendriers des magasins (secrets) sont lus dans ~/.suivi-pro/agenda.env,
// HORS du projet (jamais dans .env.local, jamais dans Git). En production, ils sont dans les variables de Vercel.
function chargerAgendaLocal() {
  const f = join(homedir(), '.suivi-pro', 'agenda.env')
  if (!existsSync(f)) return
  for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^(AGENDA_ICAL_[A-Z]+)=(.*)$/.exec(l.trim())
    if (m && m[2].trim() && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Charge toutes les variables de .env.local (y compris non VITE_) dans process.env
  // pour que la fonction mail fonctionne aussi pendant `npm run dev`.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      {
        // Sert /api/send-mail en dev (en prod c'est la fonction serverless Vercel api/send-mail.js)
        name: 'dev-api-send-mail',
        configureServer(server) {
          // Sert /api/agenda en dev (en prod : fonction serverless Vercel api/agenda.js)
          chargerAgendaLocal()
          server.middlewares.use('/api/agenda', async (req, res, next) => {
            if (req.method !== 'GET') return next()
            const { default: handler } = await import('./api/agenda.js')
            req.url = req.originalUrl || req.url
            await handler(req, res)
          })
          server.middlewares.use('/api/send-mail', (req, res, next) => {
            if (req.method !== 'POST') return next()
            let body = ''
            req.on('data', c => { body += c })
            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json')
              try {
                const { sendMail, validateMail, verifierConnexion, noterEnvoi } = await import('./api/_send.js')
                const jeton = await verifierConnexion(req.headers.authorization)
                const mail = validateMail(body ? JSON.parse(body) : {})
                await noterEnvoi(jeton, mail)
                // En local, les mails sont seulement affichés dans le terminal (aucun envoi réel),
                // sauf si SEND_REAL_MAIL=1 est défini dans .env.local.
                if (process.env.SEND_REAL_MAIL === '1') {
                  await sendMail(mail)
                } else {
                  const { to, subject, text } = mail
                  console.log(`\n[mail NON envoyé — local]\nÀ : ${to}\nObjet : ${subject}\n\n${text}\n`)
                }
                res.statusCode = 200
                res.end(JSON.stringify({ ok: true }))
              } catch (e) {
                res.statusCode = e.status || 500
                res.end(JSON.stringify({ ok: false, error: String(e.message || e) }))
              }
            })
          })
        },
      },
    ],
  }
})

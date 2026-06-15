import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

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
          server.middlewares.use('/api/send-mail', (req, res, next) => {
            if (req.method !== 'POST') return next()
            let body = ''
            req.on('data', c => { body += c })
            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json')
              try {
                const { sendMail } = await import('./api/_send.js')
                const { to, subject, text, replyTo } = body ? JSON.parse(body) : {}
                await sendMail({ to, subject, text, replyTo })
                res.statusCode = 200
                res.end(JSON.stringify({ ok: true }))
              } catch (e) {
                res.statusCode = 500
                res.end(JSON.stringify({ ok: false, error: String(e.message || e) }))
              }
            })
          })
        },
      },
    ],
  }
})

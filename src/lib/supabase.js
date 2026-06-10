import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || url.startsWith('REMPLACER') || !key || key.startsWith('REMPLACER')) {
  document.body.innerHTML = `
    <div style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto">
      <h2 style="color:#dc2626">⚠️ Configuration manquante</h2>
      <p>Le fichier <code>.env.local</code> n'est pas configuré ou le serveur n'a pas été redémarré.</p>
      <ol>
        <li>Ouvre <code>.env.local</code> et vérifie que l'URL et la clé Supabase sont bien renseignées</li>
        <li>Arrête le serveur (Ctrl+C) et relance <code>npm run dev</code></li>
      </ol>
    </div>`
  throw new Error('Supabase env vars manquantes')
}

export const supabase = createClient(url, key)

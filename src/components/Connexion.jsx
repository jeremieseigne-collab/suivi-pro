import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CompteContext, compteDepuisSession } from '../context/CompteContext'

// Garde l'outil derrière une connexion : tant que l'appareil n'est pas connecté avec un compte,
// seul l'écran de connexion s'affiche. La session reste mémorisée sur l'appareil (pas besoin de se reconnecter).
export default function Connexion({ children }) {
  const [session, setSession] = useState(undefined) // undefined = vérification en cours

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <EcranConnexion />
  return <CompteContext.Provider value={compteDepuisSession(session)}>{children}</CompteContext.Provider>
}

function EcranConnexion() {
  const [email, setEmail]       = useState('')
  const [motDePasse, setMdp]    = useState('')
  const [erreur, setErreur]     = useState('')
  const [enCours, setEnCours]   = useState(false)

  async function valider(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    setEnCours(false)
    if (error) setErreur(error.message === 'Invalid login credentials' ? 'Adresse ou mot de passe incorrect.' : 'Connexion impossible pour le moment. Vérifiez le réseau et réessayez.')
  }

  const champ = { width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '10px 14px', fontSize: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', marginTop: 6 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <form onSubmit={valider} style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', borderRadius: 16, padding: '28px 24px', boxShadow: '0 8px 30px var(--shadow-lg)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, textAlign: 'center', color: 'var(--text)' }}>Suivi Pro</h1>
        <p style={{ margin: '0 0 22px', fontSize: 14, textAlign: 'center', color: 'var(--text-3)' }}>
          Connectez cet appareil avec le compte du magasin. Il restera connecté.
        </p>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-3)' }}>
          Adresse du magasin
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={champ} />
        </label>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--text-3)', marginTop: 14 }}>
          Mot de passe
          <input type="password" autoComplete="current-password" required value={motDePasse} onChange={e => setMdp(e.target.value)} style={champ} />
        </label>
        {erreur && <div className="form-error" style={{ marginTop: 14 }}>{erreur}</div>}
        <button type="submit" className="btn-primary" disabled={enCours} style={{ width: '100%', minHeight: 44, marginTop: 22 }}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}

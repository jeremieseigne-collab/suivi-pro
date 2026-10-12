import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/charte.css'
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
    if (error) setErreur(error.message === 'Invalid login credentials' ? 'Adresse ou mot de passe incorrect.' : 'Connexion impossible pour le moment. Vérifie le réseau et réessaie.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--fond)', boxSizing: 'border-box' }}>
      <form onSubmit={valider} style={{ width: '100%', maxWidth: 380, background: 'var(--carte)', borderRadius: 18, padding: '28px 24px', boxShadow: 'var(--ombre-douce)', color: 'var(--texte)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--action)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>S</span>
          Suivi Pro
        </div>
        <p style={{ margin: '0 0 22px', fontSize: 14, textAlign: 'center', color: 'var(--doux)' }}>
          Connecte cet appareil avec le compte du magasin. Il restera connecté.
        </p>
        <label className="etiquette" htmlFor="connexion-email">Adresse du magasin</label>
        <input id="connexion-email" className="champ" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={{ fontSize: 16 }} />
        <label className="etiquette" htmlFor="connexion-mdp" style={{ marginTop: 14 }}>Mot de passe</label>
        <input id="connexion-mdp" className="champ" type="password" autoComplete="current-password" required value={motDePasse} onChange={e => setMdp(e.target.value)} style={{ fontSize: 16 }} />
        {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
        <button type="submit" className="btn btn-prim" disabled={enCours} style={{ width: '100%', marginTop: 22 }}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}

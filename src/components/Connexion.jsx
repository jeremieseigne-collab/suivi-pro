import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/charte.css'
import { CompteContext, compteDepuisSession } from '../context/CompteContext'
import { useVariantes } from '../shell/essai'
import PanneauEssai from '../shell/PanneauEssai'
import { POINTS_CONNEXION } from '../shell/pointsConnexion'
import './connexion.css'

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

// Message d'erreur : le même pour une adresse inconnue et un mauvais mot de passe (on ne dit jamais si l'adresse existe).
// Toute réponse « refusée » de Supabase (400 : identifiants, adresse non confirmée…) donne ce message ; 429 = trop d'essais ; le reste = réseau.
function messageErreur(error) {
  if (error?.status === 429) return 'Trop d’essais. Attends quelques minutes puis réessaie.'
  if (error?.status === 400 || error?.message === 'Invalid login credentials') return 'Adresse ou mot de passe incorrect.'
  return 'Connexion impossible pour le moment. Vérifie le réseau et réessaie.'
}

function EcranConnexion() {
  const v = useVariantes(POINTS_CONNEXION)
  const [email, setEmail]       = useState('')
  const [motDePasse, setMdp]    = useState('')
  const [voirMdp, setVoirMdp]   = useState(false)
  const [erreur, setErreur]     = useState('')
  const [enCours, setEnCours]   = useState(false)

  async function valider(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    setEnCours(false)
    if (error) setErreur(messageErreur(error))
  }

  return (
    <div className="ecran-connexion">
      <form onSubmit={valider} className="carte-connexion" noValidate={false}>
        <div className="marque-connexion"><b>S</b>Suivi Pro</div>
        <p className="aide" style={{ margin: '0 0 22px', fontSize: 14, textAlign: 'center' }}>
          Connecte cet appareil avec le compte du magasin. Il restera connecté.
        </p>
        <label className="etiquette" htmlFor="connexion-email">Adresse du magasin</label>
        <input id="connexion-email" className="champ" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={{ fontSize: 16 }} />
        <label className="etiquette" htmlFor="connexion-mdp" style={{ marginTop: 14 }}>Mot de passe</label>
        <div className="champ-mdp">
          <input id="connexion-mdp" className="champ" type={v.connexion_afficher_mdp && voirMdp ? 'text' : 'password'} autoComplete="current-password" required value={motDePasse} onChange={e => setMdp(e.target.value)} style={{ fontSize: 16 }} />
          {v.connexion_afficher_mdp && (
            <button type="button" className="lien" onClick={() => setVoirMdp(x => !x)} aria-pressed={voirMdp} aria-controls="connexion-mdp">{voirMdp ? 'Masquer' : 'Afficher'}</button>
          )}
        </div>
        {erreur && <div className="encart err" role="alert" style={{ marginTop: 14 }}>{erreur}</div>}
        <button type="submit" className="btn btn-prim" disabled={enCours} style={{ width: '100%', marginTop: 22 }}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
        {v.connexion_oubli && <p className="aide" style={{ margin: '16px 0 0', textAlign: 'center' }}>Mot de passe oublié ? Demande-le à la direction.</p>}
      </form>
      <PanneauEssai points={POINTS_CONNEXION} />
    </div>
  )
}

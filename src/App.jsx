import { lazy, Suspense } from 'react'
import StoreSelect      from './components/StoreSelect'
import HomeScreen       from './home/HomeScreen'
import { LoadingState } from './components/shared'
import Connexion from './components/Connexion'
import { useCompte } from './context/CompteContext'
import { useAlerts }    from './home/useAlerts'
import { SeasonProvider } from './context/SeasonContext'
import { MagasinProvider, useMagasin } from './context/MagasinContext'
import Coque, { VueClients } from './shell/Coque'
import { useVue, aller } from './shell/navigation'
import { PageShell, BoutonMagasin } from './shell/EnTete'
import './App.css'
import './styles/charte.css'

// Chaque écran n'est chargé qu'au moment où on l'ouvre (ouverture de l'outil plus rapide, surtout sur téléphone)
const Cahier          = lazy(() => import('./cahier/Cahier'))
const Achats          = lazy(() => import('./tabs/Achats'))
const PlanReglement   = lazy(() => import('./tabs/PlanReglement'))
const Parametres      = lazy(() => import('./tabs/Parametres'))
const Repertoire      = lazy(() => import('./tabs/Repertoire'))
const Commandes       = lazy(() => import('./commandes/Commandes'))
const Paie            = lazy(() => import('./paie/Paie'))
const Planning        = lazy(() => import('./planning/Planning'))
const SavDefectueux   = lazy(() => import('./savdef/SavDefectueux'))
const Factures        = lazy(() => import('./factures/Factures'))
const Reassort        = lazy(() => import('./reassort/Reassort'))
const AgendaBoard     = lazy(() => import('./agenda/AgendaBoard'))

// Écrans réservés aux comptes Direction (la base refuse de toute façon les écritures sensibles aux comptes magasin)
const DIRECTION_VIEWS = new Set(['reglement', 'parametres', 'achats'])

// Top modèles & réassorts (par magasin, liés à la saison)
function ReassortApp() {
  const { magasin, setMagasin } = useMagasin()
  if (!magasin) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#059669', border: '#6ee7b7', shadow: 'rgba(5,150,105,0.18)', gradient: 'linear-gradient(135deg, #10b981, #047857)', icon: '⭐' }} />
  return (
    <PageShell title="Top modèles & réassorts" rightExtra={<BoutonMagasin nom={magasin.nom} onClick={() => setMagasin(null)} />}>
      <Reassort magasin={magasin} />
    </PageShell>
  )
}

function Root() {
  const vueDemandee = useVue()
  const { estDirection } = useCompte()
  const vue = DIRECTION_VIEWS.has(vueDemandee) && !estDirection ? 'home' : vueDemandee
  const home = () => aller('home')
  const { magasin, setMagasin } = useMagasin()
  const alerts  = useAlerts(magasin)

  let content
  if (vue === 'cahier')          content = <Cahier />
  else if (vue === 'commandes')  content = <Commandes onHome={home} />
  else if (vue === 'paie')       content = <PageShell title="Éléments variables de paie" withSeason={false}><Paie /></PageShell>
  else if (vue === 'achats')     content = <PageShell title="Achats"><Achats /></PageShell>
  else if (vue === 'repertoire') content = <PageShell title="Répertoire fournisseurs" withSeason={false}><Repertoire /></PageShell>
  else if (vue === 'reglement')  content = <PageShell title="Plan de règlement"><PlanReglement /></PageShell>
  else if (vue === 'parametres') content = <PageShell title="Paramètres"><Parametres /></PageShell>
  else if (vue === 'factures')   content = <PageShell title="Factures" withSeason={false}><Factures /></PageShell>
  else if (vue === 'planning')   content = <Planning onHome={home} />
  else if (vue === 'sav' || vue === 'defectueux') content = <SavDefectueux vue={vue} />
  else if (vue === 'reassort')   content = <ReassortApp />
  else if (vue === 'clients')    content = <VueClients alerts={alerts} />
  else if (vue === 'agenda')     content = <PageShell title="Agenda" withSeason={false}><AgendaBoard /></PageShell>
  else                           content = <HomeScreen alerts={alerts} />

  return (
    <Coque vue={vue} alerts={alerts} magasin={magasin} setMagasin={setMagasin}>
      <Suspense fallback={<LoadingState />}>{content}</Suspense>
    </Coque>
  )
}

export default function App() {
  return (
    <Connexion>
      <SeasonProvider>
        <MagasinProvider>
          <Root />
        </MagasinProvider>
      </SeasonProvider>
    </Connexion>
  )
}

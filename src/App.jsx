import { lazy, Suspense } from 'react'
import HomeScreen       from './home/HomeScreen'
import { LoadingState } from './components/shared'
import Connexion from './components/Connexion'
import { useCompte } from './context/CompteContext'
import { useAlerts }    from './home/useAlerts'
import { SeasonProvider } from './context/SeasonContext'
import { MagasinProvider, useMagasin } from './context/MagasinContext'
import Coque, { VueClients } from './shell/Coque'
import { useVue, aller } from './shell/navigation'
import { PageShell } from './shell/EnTete'
import './App.css'
import './styles/charte.css'
import './styles/pont.css'

// Chaque écran n'est chargé qu'au moment où on l'ouvre (ouverture de l'outil plus rapide, surtout sur téléphone).
// Après une mise en ligne, les fichiers de la version précédente n'existent plus sur le site : un appareil resté ouvert
// qui ouvre un écran pas encore chargé recharge la page une fois (au plus toutes les 30 s) au lieu d'afficher une page blanche.
function ecran(charger) {
  return lazy(() => charger().catch(err => {
    let dernier = 0
    try { dernier = Number(sessionStorage.getItem('rechargement_version')) || 0 } catch { /* stockage indisponible */ }
    if (Date.now() - dernier > 30000) {
      try { sessionStorage.setItem('rechargement_version', String(Date.now())) } catch { /* stockage indisponible */ }
      location.reload()
      return new Promise(() => {})
    }
    throw err
  }))
}
const Cahier          = ecran(() => import('./cahier/Cahier'))
const Achats          = ecran(() => import('./tabs/Achats'))
const PlanReglement   = ecran(() => import('./reglement/Plan'))
const Parametres      = ecran(() => import('./tabs/Parametres'))
const Repertoire      = ecran(() => import('./repertoire/Repertoire'))
const Commandes       = ecran(() => import('./commandes/Commandes'))
const Paie            = ecran(() => import('./paie/Paie'))
const Planning        = ecran(() => import('./planning/Planning'))
const SavDefectueux   = ecran(() => import('./savdef/SavDefectueux'))
const Factures        = ecran(() => import('./factures/Factures'))
const Reassort        = ecran(() => import('./reassort/Reassort'))
const AgendaBoard     = ecran(() => import('./agenda/AgendaBoard'))

// Écrans réservés aux comptes Direction (la base refuse de toute façon les écritures sensibles aux comptes magasin)
const DIRECTION_VIEWS = new Set(['reglement', 'parametres', 'achats'])

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
  else if (vue === 'repertoire') content = <Repertoire />
  else if (vue === 'reglement')  content = <PageShell title="Plan de règlement"><PlanReglement /></PageShell>
  else if (vue === 'parametres') content = <PageShell title="Réglages"><Parametres /></PageShell>
  else if (vue === 'factures')   content = <PageShell title="Factures" withSeason={false}><Factures /></PageShell>
  else if (vue === 'planning')   content = <Planning />
  else if (vue === 'sav' || vue === 'defectueux') content = <SavDefectueux vue={vue} />
  else if (vue === 'reassort')   content = <Reassort />
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

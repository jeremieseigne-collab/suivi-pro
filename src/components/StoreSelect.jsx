import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import Icone from './ui/Icone'
import { useVariantes } from '../shell/essai'
import PanneauEssai from '../shell/PanneauEssai'
import { POINTS_CONNEXION } from '../shell/pointsConnexion'
import './connexion.css'

// Écran « Dans quel magasin es-tu ? » quand aucun magasin n'est choisi sur l'appareil (Cahier, Réassorts, SAV & défectueux, Commandes).
// Même fonctionnement qu'avant : la liste vient des magasins enregistrés, toucher un magasin le choisit pour tout l'outil.
// theme = { accent, gradient, icon } : couleur et emoji propres à chaque outil (gardés si S1 « sans »).
const DEFAULT_THEME = {
  accent:   'var(--action)',
  gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  icon:     '🏪',
}
// Icône au trait de l'outil, d'après son emoji (S1 « avec »)
const ICONE_OUTIL = { '📥': 'entrees', '⭐': 'reassort', '🔧': 'sav', '🛍️': 'commande' }

export default function StoreSelect({ onSelect, description = '', theme = {} }) {
  const v = useVariantes(POINTS_CONNEXION)
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const t = { ...DEFAULT_THEME, ...theme }
  const uniforme = v.magasin_uniforme
  const icone = ICONE_OUTIL[t.icon] || 'magasin'

  return (
    <div className="choix-magasin-page" style={{ '--accent-outil': uniforme ? 'var(--action)' : t.accent }}>
      {uniforme
        ? <div className="pictogramme" style={{ background: 'var(--action-teinte)', color: 'var(--action-texte)' }}><Icone nom={icone} taille={28} /></div>
        : <div className="pictogramme" style={{ background: t.gradient, fontSize: 28 }} aria-hidden="true">{t.icon}</div>}
      <h1>Dans quel magasin es-tu ?</h1>
      {description && <p className="sous-titre">{description}</p>}

      <div className="liste-magasins">
        {(magasins || []).map(m => (
          <button key={m.id} className="bouton-magasin" onClick={() => onSelect(m)}>
            {uniforme
              ? <span className="pastille" style={{ background: 'var(--action-teinte)', color: 'var(--action-texte)' }}><Icone nom="magasin" taille={22} /></span>
              : <span className="pastille" style={{ background: t.gradient }} aria-hidden="true">{t.icon}</span>}
            <span>{m.nom}</span>
          </button>
        ))}
      </div>
      <PanneauEssai points={POINTS_CONNEXION} />
    </div>
  )
}

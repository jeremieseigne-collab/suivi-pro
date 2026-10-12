import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import Icone from './ui/Icone'
import './connexion.css'

// Écran « Dans quel magasin es-tu ? » quand aucun magasin n'est choisi sur l'appareil (Cahier, Réassorts, SAV & défectueux, Commandes).
// Même fonctionnement qu'avant : la liste vient des magasins enregistrés, toucher un magasin le choisit pour tout l'outil.
// theme.icon (emoji de l'outil, passé par chaque écran) sert seulement à choisir l'icône au trait (décision S1 : couleurs de la charte).
const ICONE_OUTIL = { '📥': 'entrees', '⭐': 'reassort', '🔧': 'sav', '🛍️': 'commande' }

export default function StoreSelect({ onSelect, description = '', theme = {} }) {
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const icone = ICONE_OUTIL[theme.icon] || 'magasin'

  return (
    <div className="choix-magasin-page">
      <div className="pictogramme" style={{ background: 'var(--action-teinte)', color: 'var(--action-texte)' }}><Icone nom={icone} taille={28} /></div>
      <h1>Dans quel magasin es-tu ?</h1>
      {description && <p className="sous-titre">{description}</p>}

      <div className="liste-magasins">
        {(magasins || []).map(m => (
          <button key={m.id} className="bouton-magasin" onClick={() => onSelect(m)}>
            <span className="pastille" style={{ background: 'var(--action-teinte)', color: 'var(--action-texte)' }}><Icone nom="magasin" taille={22} /></span>
            <span>{m.nom}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

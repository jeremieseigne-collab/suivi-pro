import { createPortal } from 'react-dom'

// Fenêtre de confirmation (au-dessus des autres fenêtres) : un titre, un texte, deux boutons.
// danger = bouton rouge (suppression, abandon d'une saisie). children = contenu en plus (liste, champ à taper) ;
// actif = false grise le bouton de confirmation (ex. tant que le nombre demandé n'est pas tapé).
// secondaire = { texte, onClick } : troisième choix (ex. « Seulement le SAV »), entre Annuler et Confirmer.
// Affichée à la racine de la page (portail) : toujours centrée au-dessus de tout l'écran, même ouverte depuis un panneau latéral.
export default function Confirmation({ titre, texte, confirmer = 'Confirmer', annuler = 'Annuler', danger = false, actif = true, secondaire, children, onConfirmer, onAnnuler }) {
  return createPortal(
    <div className="confirmation-fond" onClick={onAnnuler}>
      <div className="confirmation" role="alertdialog" aria-modal="true" aria-label={titre} onClick={e => e.stopPropagation()}>
        <h2>{titre}</h2>
        {texte && <p>{texte}</p>}
        {children}
        <div className="confirmation-boutons">
          <button className="btn" onClick={onAnnuler} autoFocus>{annuler}</button>
          {secondaire && <button className="btn" onClick={secondaire.onClick}>{secondaire.texte}</button>}
          <button className={`btn ${danger ? 'btn-danger-plein' : 'btn-prim'}`} disabled={!actif} onClick={onConfirmer}>{confirmer}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

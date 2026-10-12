// Fenêtre de confirmation (au-dessus des autres fenêtres) : un titre, un texte, deux boutons.
// danger = bouton rouge (suppression, abandon d'une saisie).
export default function Confirmation({ titre, texte, confirmer = 'Confirmer', annuler = 'Annuler', danger = false, onConfirmer, onAnnuler }) {
  return (
    <div className="confirmation-fond" onClick={onAnnuler}>
      <div className="confirmation" role="alertdialog" aria-modal="true" aria-label={titre} onClick={e => e.stopPropagation()}>
        <h2>{titre}</h2>
        {texte && <p>{texte}</p>}
        <div className="confirmation-boutons">
          <button className="btn" onClick={onAnnuler} autoFocus>{annuler}</button>
          <button className={`btn ${danger ? 'btn-danger-plein' : 'btn-prim'}`} onClick={onConfirmer}>{confirmer}</button>
        </div>
      </div>
    </div>
  )
}

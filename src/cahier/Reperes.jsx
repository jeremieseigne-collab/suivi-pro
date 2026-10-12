import { classeNumero, STATUT_CLASSE, libelleStatut } from './commun'

// Pastille du N° de commande, juste après le nom du modèle. Plusieurs N° (« 2, 3 ») → une pastille chacun.
export function Numero({ n, prefixe = true }) {
  if (!n) return null
  const liste = String(n).split(/\s*,\s*/).filter(Boolean)
  return liste.map(x => <span key={x} className={`num ${classeNumero(x)}`} style={{ marginLeft: 4 }}>{prefixe ? 'N° ' : ''}{x}</span>)
}

// Statut d'une entrée : point plein + mot (le point de couleur est réservé au statut)
export function Statut({ s }) {
  return <span className={`puce ${STATUT_CLASSE[s] || ''}`}>{s ? libelleStatut(s) : 'Sans statut'}</span>
}

// Message court en bas de l'écran, avec « Annuler » quand c'est possible
export function Toast({ toast, onFermer }) {
  if (!toast) return null
  return (
    <div className="toast-cahier" role="status">
      <span>{toast.texte}</span>
      {toast.annuler && <button onClick={() => { toast.annuler(); onFermer() }}>Annuler</button>}
    </div>
  )
}

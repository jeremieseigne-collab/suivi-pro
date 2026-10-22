import { useVariantes, choisirVariante } from './essai'

// Panneau d'essai local (invisible en ligne) : « Avec » / « Sans » pour chaque point à trancher
export default function PanneauEssai({ points }) {
  const v = useVariantes(points)
  if (!import.meta.env.DEV) return null
  return (
    <details className="panneau-variantes">
      <summary>Essai local — points à trancher (avec / sans)</summary>
      {points.map(p => (
        <div key={p.cle} className="ligne-variante">
          <span>{p.titre}</span>
          <div className="segment" role="group" aria-label={p.titre}>
            <button aria-pressed={v[p.cle]} onClick={() => choisirVariante(p.cle, 'avec')}>Avec</button>
            <button aria-pressed={!v[p.cle]} onClick={() => choisirVariante(p.cle, 'sans')}>Sans</button>
          </div>
        </div>
      ))}
    </details>
  )
}

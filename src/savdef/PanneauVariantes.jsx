import { POINTS, useVariantes, choisirVariante } from './variantes'

// Panneau d'essai local : choisir « avec » ou « sans » pour chaque point à trancher (invisible en ligne)
export function PanneauVariantes() {
  const v = useVariantes()
  if (!import.meta.env.DEV) return null
  return (
    <details className="panneau-variantes">
      <summary>Essai local — points à trancher (avec / sans)</summary>
      {POINTS.map(p => (
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

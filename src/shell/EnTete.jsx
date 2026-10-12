import { useState, useRef } from 'react'
import { useSeason } from '../context/SeasonContext'
import Icone from '../components/ui/Icone'

// ─── En-tête commun des pages : titre, actions, magasin, saison, onglets ───
// (plus de bouton retour : le menu reste toujours visible)

export function SeasonBadge() {
  // Choix et ajout de saison ici ; la suppression est dans Paramètres → Saisons (Direction, nom à retaper)
  const { season, setSeason, seasons, addSeason } = useSeason()
  const current       = seasons.find(s => s.id === season) || seasons[0]
  const [open,        setOpen]        = useState(false)
  const [adding,      setAdding]      = useState(false)
  const [newName,     setNewName]     = useState('')
  const inputRef = useRef(null)

  function openAdd(e) {
    e.stopPropagation()
    setAdding(true)
    setNewName('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function confirmAdd(e) {
    e?.preventDefault()
    const id = addSeason(newName)
    if (id) { setSeason(id); setOpen(false); setAdding(false) }
  }

  function close() { setOpen(false); setAdding(false) }
  const couleur = current?.color ?? 'var(--discret)'

  return (
    <div style={{ position: 'relative' }}>
      <button className="saison-btn" onClick={() => { setOpen(o => !o); setAdding(false) }} aria-expanded={open}
        style={{ color: couleur, background: `color-mix(in srgb, ${couleur} 14%, transparent)` }}>
        {current?.label ?? '—'} <Icone nom="bas" taille={14} />
      </button>

      {open && (
        <>
          <div className="voile" style={{ zIndex: 199 }} onClick={close} />
          <div className="saison-menu">
            {seasons.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button className="ligne" style={{ minHeight: 44, flex: 1 }} onClick={() => { setSeason(s.id); close() }}>
                  <span className="txt"><span className="t1" style={{ color: s.id === season ? s.color : 'var(--texte)', fontWeight: s.id === season ? 700 : 500 }}>{s.label}</span></span>
                  {s.id === season && <Icone nom="check" taille={18} style={{ color: s.color }} />}
                </button>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--trait)' }}>
              {!adding ? (
                <button className="ligne" style={{ minHeight: 44, color: 'var(--action-texte)' }} onClick={openAdd}>
                  <Icone nom="ajout" taille={18} /> <span className="txt" style={{ fontWeight: 600 }}>Nouvelle saison</span>
                </button>
              ) : (
                <form onSubmit={confirmAdd} style={{ padding: 10, display: 'flex', gap: 8 }}>
                  <input ref={inputRef} className="champ" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ex : Hiver 2027"
                    onKeyDown={e => e.key === 'Escape' && setAdding(false)} />
                  <button type="submit" className="btn btn-prim" disabled={!newName.trim()}>OK</button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// En-tête commun des pages : titre, actions, sélecteur de saison, onglets éventuels (plus de bouton retour : le menu reste visible)
export function PageShell({ title, withSeason = true, tabs = null, rightExtra = null, children }) {
  return (
    <div className="page-coque">
      <header className="entete-page">
        <h1 className="titre-page">{title}</h1>
        <div className="entete-actions">
          {rightExtra}
          {withSeason && <SeasonBadge />}
        </div>
      </header>
      {tabs && <div className="onglets-page"><div className="segment" role="group">{tabs}</div></div>}
      <main className="app-main">{children}</main>
    </div>
  )
}

// Bouton « magasin » de l'en-tête (revient au choix du magasin, comme aujourd'hui)
export function BoutonMagasin({ nom, onClick }) {
  return (
    <button className="chip" onClick={onClick} title="Changer de magasin">
      <Icone nom="magasin" taille={16} /> {nom} <Icone nom="bas" taille={14} />
    </button>
  )
}


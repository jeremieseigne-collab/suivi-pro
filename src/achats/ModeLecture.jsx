import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { ouvrirAvec } from '../shell/navigation'
import { DEFAULT_NB_CHEQUE, DEFAULT_DELAIS } from '../data/reglement'

// Mode de règlement d'une marque × magasin, en lecture seule dans la fiche d'achat (décision A1).
// Même règle que le Plan de règlement : c'est la marque pilote du groupe (plus petit n°) qui porte le mode.
export default function ModeLecture({ fournisseur, magasin }) {
  const d = useLiveQuery(async () => {
    const [fournisseurs, magasins, modes] = await Promise.all([db.fournisseurs.toArray(), db.magasins.toArray(), db.modesReglement.toArray()])
    return { fournisseurs, magasins, modes }
  }, [])
  if (!d) return null
  const f = d.fournisseurs.find(x => x.nom === fournisseur)
  const m = d.magasins.find(x => x.nom === magasin)
  let texte = 'non renseigné', groupe = null
  if (f && m) {
    const gk = ((f.groupe || '').trim()) || f.nom
    const pilote = d.fournisseurs.filter(x => (((x.groupe || '').trim()) || x.nom) === gk).sort((a, b) => a.id - b.id)[0]
    if (pilote && pilote.id !== f.id) groupe = { nom: gk, pilote: pilote.nom }
    const r = d.modes.find(x => x.fournisseurId === pilote?.id && x.magasinId === m.id)
    if (r?.modeReglement) {
      const c = r.condition || {}
      const detail = r.modeReglement === 'CHEQUE'
        ? `${parseInt(c.nb) || DEFAULT_NB_CHEQUE} chèques${parseInt(c.nb) ? '' : ' (par défaut)'}`
        : (Array.isArray(c.delais) && c.delais.length ? `${c.delais.join(' / ')} jours` : (DEFAULT_DELAIS[r.modeReglement] ? `${DEFAULT_DELAIS[r.modeReglement].join(' / ')} jours (par défaut)` : ''))
      texte = r.modeReglement + (detail ? ` · ${detail}` : '')
    }
  }
  return (
    <div style={{ padding: '6px 0', fontSize: 14 }}>
      <strong>{texte}</strong>
      {groupe && <div style={{ fontSize: 13, color: 'var(--texte)', marginTop: 4 }}>Réglé avec le groupe « {groupe.nom} » (marque pilote : {groupe.pilote})</div>}
      <button type="button" className="lien" style={{ paddingLeft: 0, marginTop: 2 }} onClick={() => ouvrirAvec('parametres', 'modes')}>Modifier dans Réglages → Modes de règlement</button>
    </div>
  )
}

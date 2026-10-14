import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { ouvrirAvec } from '../shell/navigation'
import { DEFAULT_NB_CHEQUE, DEFAULT_DELAIS } from '../data/reglement'

// Mode de règlement d'une marque × magasin, en lecture seule dans la fiche d'achat (décision A1).
// Même règle que le Plan de règlement : le mode est celui du fournisseur de la marque (plan C, étape 2 bis).
export default function ModeLecture({ fournisseur, magasin }) {
  const d = useLiveQuery(async () => {
    const [fournisseurs, magasins, frs, modes] = await Promise.all([db.fournisseurs.toArray(), db.magasins.toArray(), db.fournisseursReels.toArray(), db.reglementsFournisseurs.toArray()])
    return { fournisseurs, magasins, frs, modes }
  }, [])
  if (!d) return null
  const f = d.fournisseurs.find(x => x.nom === fournisseur)
  const m = d.magasins.find(x => x.nom === magasin)
  let texte = 'non renseigné', groupe = null
  if (f && m) {
    const fr = d.frs.find(x => x.id === f.fournisseurReelId)
    if (fr && fr.nom !== f.nom) groupe = { nom: fr.nom }
    const r = d.modes.find(x => x.fournisseurReelId === fr?.id && x.magasinId === m.id)
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
      {groupe && <div style={{ fontSize: 13, color: 'var(--texte)', marginTop: 4 }}>Réglé au fournisseur « {groupe.nom} »</div>}
      <button type="button" className="lien" style={{ paddingLeft: 0, marginTop: 2 }} onClick={() => ouvrirAvec('parametres', 'fournisseurs-marques')}>Modifier dans Réglages → Fournisseurs et marques</button>
    </div>
  )
}

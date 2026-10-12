import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { useMagasin } from '../context/MagasinContext'
import { useCompte } from '../context/CompteContext'
import { getSociete } from '../data/societes'
import { LoadingState } from '../components/shared'
import StoreSelect from '../components/StoreSelect'
import EntreeImportModal from '../components/EntreeImportModal'
import Icone from '../components/ui/Icone'
import { PageShell, BoutonMagasin } from '../shell/EnTete'
import { aller } from '../shell/navigation'
import ListeEntrees from './ListeEntrees'
import SaisieEntree from './SaisieEntree'
import FicheEntree from './FicheEntree'
import SuiviLivraisons from './SuiviLivraisons'
import { Toast } from './Reperes'
import './cahier.css'

// Cahier des entrées : onglet « Entrées » (ouvert par défaut) et « Suivi des livraisons »
export default function Cahier() {
  const { season } = useSeason()
  const { magasin: magasinCourant, setMagasin } = useMagasin()
  const { estDirection } = useCompte()
  const magasinAppareil = magasinCourant?.nom || ''
  const [onglet, setOnglet] = useState('entrees')
  const [saisie, setSaisie] = useState(null)          // null | { entree?: … } (absence d'entree = nouvelle entrée)
  const [ficheId, setFicheId] = useState(null)
  const [importer, setImporter] = useState(false)
  const [toast, setToast] = useState(null)
  const [enSelection, setEnSelection] = useState(false)  // le bouton « + Entrée » s'efface pendant une sélection
  const [pointeLocal, setPointeLocal] = useState({})  // affichage immédiat du pointage avant le retour temps réel

  // Entrées de la saison avec les noms (comme l'outil actuel)
  const entrees = useLiveQuery(async () => {
    const [lignes, magasins, fournisseurs] = await Promise.all([
      db.entrees.where('season').equals(season).toArray(),
      db.magasins.toArray(),
      db.fournisseurs.toArray(),
    ])
    const mag = Object.fromEntries(magasins.map(m => [m.id, m.nom])), four = Object.fromEntries(fournisseurs.map(f => [f.id, f.nom]))
    return lignes.map(e => ({ ...e, magasin: mag[e.magasinId] || '', marque: four[e.fournisseurId] || '', societe: getSociete(mag[e.magasinId] || '') }))
  }, [season])

  // Le message du bas disparaît seul après 5 s (ou la durée demandée, ex. 10 s après une suppression en lot)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.duree || 5000); return () => clearTimeout(t) }, [toast])

  const estPointe = useCallback(e => (e.id in pointeLocal ? pointeLocal[e.id] : !!e.pointe), [pointeLocal])
  async function pointer(ids, val) {
    if (!estDirection) return   // pointage réservé à la Direction (la base le refuse aussi)
    setPointeLocal(p => { const n = { ...p }; ids.forEach(id => { n[id] = val }); return n })
    let echecs = 0
    for (const id of ids) {
      try { await db.entrees.update(id, { pointe: val }) }
      catch { echecs++; setPointeLocal(p => { const n = { ...p }; delete n[id]; return n }) }
    }
    setToast(echecs ? { texte: `Pointage impossible pour ${echecs} entrée(s) : vérifiez la connexion.` }
      : { texte: `${ids.length > 1 ? ids.length + ' entrées ' : 'Entrée '}${val ? 'pointée' : 'dépointée'}${ids.length > 1 ? 's' : ''}`, annuler: () => pointer(ids, !val) })
  }

  if (!magasinAppareil) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#1d4ed8', border: '#93c5fd', shadow: 'rgba(29,78,216,0.18)', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '📥' }} />

  const fiche = ficheId && (entrees || []).find(e => e.id === ficheId)
  const nouvelle = () => { setFicheId(null); setSaisie({}) }

  return (
    <PageShell
      title="Cahier des entrées"
      rightExtra={<>
        <BoutonMagasin nom={magasinAppareil} onClick={() => setMagasin(null)} />
        {onglet === 'entrees' && <button className="btn btn-ghost seulement-grand" onClick={() => setImporter(true)}>Importer CSV</button>}
        {onglet === 'entrees' && <button className="btn btn-prim seulement-grand" onClick={nouvelle}><Icone nom="ajout" taille={20} />Nouvelle entrée</button>}
      </>}
      tabs={[['entrees', 'Entrées'], ['suivi', 'Suivi des livraisons']].map(([id, l]) => (
        <button key={id} aria-pressed={onglet === id} onClick={() => setOnglet(id)}>{l}</button>
      ))}
    >
      {onglet === 'entrees' && (entrees === undefined ? <LoadingState /> : (
        <ListeEntrees entrees={entrees} magasinAppareil={magasinAppareil} estDirection={estDirection} estPointe={estPointe}
          onPointer={pointer} onOuvrir={e => setFicheId(e.id)} onToast={setToast} onModeSelection={setEnSelection} />
      ))}
      {onglet === 'entrees' && !enSelection && <div className="seulement-petit" style={{ textAlign: 'center', marginTop: 24 }}><button className="btn btn-ghost" onClick={() => setImporter(true)}>Importer des entrées (CSV)</button></div>}
      {onglet === 'suivi' && <SuiviLivraisons magasinAppareil={magasinAppareil} />}

      {onglet === 'entrees' && !enSelection && <button className="btn btn-prim action-flottante" onClick={nouvelle}><Icone nom="ajout" taille={20} />Entrée</button>}

      {fiche && !saisie && (
        <FicheEntree entree={fiche} estDirection={estDirection} pointe={estPointe(fiche)} onPointer={v => pointer([fiche.id], v)}
          onModifier={() => setSaisie({ entree: fiche })} onFermer={() => setFicheId(null)} onToast={setToast} />
      )}
      {saisie && (
        <SaisieEntree key={saisie.entree?.id || 'nouvelle'} entree={saisie.entree} entrees={entrees || []} magasinAppareil={magasinAppareil}
          onFermer={() => { setSaisie(null); if (saisie.entree) setFicheId(null) }} onToast={setToast} />
      )}
      {importer && <EntreeImportModal onClose={() => setImporter(false)} onSaved={() => setImporter(false)} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}

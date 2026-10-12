import { useState, useEffect } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useMagasin } from '../context/MagasinContext'
import { getSociete } from '../data/societes'
import { LoadingState } from '../components/shared'
import StoreSelect from '../components/StoreSelect'
import Icone from '../components/ui/Icone'
import { PageShell, BoutonMagasin } from '../shell/EnTete'
import { aller, actionDemandee, effacerAction } from '../shell/navigation'
import { Toast } from '../cahier/Reperes'
import ListeSav from './ListeSav'
import ListeDefectueux from './ListeDefectueux'
import SaisieSav from './SaisieSav'
import SaisieDefectueux from './SaisieDefectueux'
import '../cahier/cahier.css'
import './savdef.css'

// SAV & défectueux : une seule app, deux onglets (U5). #/sav ouvre l'onglet SAV, #/defectueux l'onglet Défectueux.
export default function SavDefectueux({ vue }) {
  const onglet = vue === 'defectueux' ? 'def' : 'sav'
  const { magasin, setMagasin } = useMagasin()
  const [saisie, setSaisie] = useState(() => actionDemandee('nouveau') ? { type: onglet } : null)   // { type: 'sav' | 'def', ligne? }
  const [toast, setToast] = useState(null)
  useEffect(() => { effacerAction() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.duree || 5000); return () => clearTimeout(t) }, [toast])

  const data = useLiveQuery(async () => {
    const [savs, defs, magasins, fournisseurs] = await Promise.all([db.sav.toArray(), db.defectueux.toArray(), db.magasins.toArray(), db.fournisseurs.toArray()])
    const mag = Object.fromEntries(magasins.map(m => [m.id, m.nom])), four = Object.fromEntries(fournisseurs.map(f => [f.id, f]))
    const recents = (a, b) => b.id - a.id
    return {
      savs: savs.sort(recents).map(s => ({ ...s, magasinNom: mag[s.magasinId] || '—', marqueNom: four[s.fournisseurId]?.nom || '',
        fournisseurEmail: four[s.fournisseurId]?.email || '', fournisseurNumeroClient: four[s.fournisseurId]?.numeroClient || '' })),
      defs: defs.sort(recents).map(d => ({ ...d, magasin: mag[d.magasinId] || '—', marque: four[d.fournisseurId]?.nom || '—', societe: getSociete(mag[d.magasinId] || ''), fournisseurObj: four[d.fournisseurId] || null })),
    }
  }, [])

  if (!magasin) return <StoreSelect onSelect={m => setMagasin(m)} onHome={() => aller('home')}
    theme={{ accent: '#0891b2', border: '#67e8f9', shadow: 'rgba(8,145,178,0.18)', gradient: 'linear-gradient(135deg, #0891b2, #0e7490)', icon: '🔧' }} />

  const nouveau = () => setSaisie({ type: onglet })
  const libNouveau = onglet === 'sav' ? 'Nouveau dossier' : 'Nouveau défectueux'
  return (
    <PageShell title="SAV & défectueux" withSeason={false}
      rightExtra={<>
        <BoutonMagasin nom={magasin.nom} onClick={() => setMagasin(null)} />
        <button className="btn btn-prim seulement-grand" onClick={nouveau}><Icone nom="ajout" taille={20} />{libNouveau}</button>
      </>}
      tabs={[['sav', 'SAV'], ['def', 'Défectueux']].map(([id, l]) => <button key={id} aria-pressed={onglet === id} onClick={() => aller(id === 'sav' ? 'sav' : 'defectueux')}>{l}</button>)}>
      {data === undefined ? <LoadingState /> : onglet === 'sav'
        ? <ListeSav rows={data.savs.filter(r => r.magasinId === magasin.id)} magasinNom={magasin.nom} onModifier={r => setSaisie({ type: 'sav', ligne: r })} onToast={setToast} />
        : <ListeDefectueux rows={data.defs.filter(r => r.magasinId === magasin.id)} magasinNom={magasin.nom} onModifier={d => setSaisie({ type: 'def', ligne: d })} onToast={setToast} />}
      <div style={{ height: 72 }} className="seulement-petit" aria-hidden="true" />
      <button className="btn btn-prim action-flottante" onClick={nouveau}><Icone nom="ajout" taille={20} />{onglet === 'sav' ? 'Dossier' : 'Défectueux'}</button>
      {saisie?.type === 'sav' && <SaisieSav key={saisie.ligne?.id || 'n'} sav={saisie.ligne} magasinAppareil={magasin} onFermer={() => setSaisie(null)} onToast={setToast} />}
      {saisie?.type === 'def' && <SaisieDefectueux key={saisie.ligne?.id || 'n'} defect={saisie.ligne} magasinAppareil={magasin} onFermer={() => setSaisie(null)} onToast={setToast} />}
      <Toast toast={toast} onFermer={() => setToast(null)} />
    </PageShell>
  )
}

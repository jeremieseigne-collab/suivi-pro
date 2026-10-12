import { useState, useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { getSociete } from '../data/societes'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { buildDefectueuxMailUrl } from '../defectueux/mail'
import { ChoixSalarie, ChoixMarque, ChoixModele, ChoixPointure, EtapesMail } from './Champs'
import { STATUTS_DEF, aujourdhuiFr, prixUnitaire, infosModele, changerEtatDefectueux } from './regles'

// Création et modification d'un défectueux. Données identiques à l'outil actuel : à la création, une entrée « Retour » (−1)
// est ajoutée au Cahier (prix du modèle, ou prix tapé), puis on propose le mail au SAV de la marque.
export default function SaisieDefectueux({ defect, magasinAppareil, onFermer, onToast }) {
  const modif = !!defect?.id
  const { season } = useSeason()
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const [f, setF] = useState(() => ({
    magasinId: defect?.magasinId ?? magasinAppareil?.id ?? '', salarie: defect?.salarie ?? '', fournisseurId: defect?.fournisseurId ?? '',
    modele: defect?.modele ?? '', numero: defect?.numero ?? '', pointure: defect?.pointure ?? '', note: defect?.note ?? '', statut: defect?.statut ?? 'À traiter',
  }))
  const [prixManuel, setPrixManuel] = useState('')
  const [infos, setInfos] = useState({ tailles: [], typeKey: 'F', categorie: '', numero: '' })
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [etape, setEtape] = useState('saisie')
  const [cree, setCree] = useState(null)
  const [confirmFermer, setConfirmFermer] = useState(false)
  const [initial] = useState(() => JSON.stringify(f))
  const deja = useRef({})
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  const magasin = (magasins || []).find(m => m.id === Number(f.magasinId))
  const societe = getSociete(magasin?.nom || '')
  const fournisseur = (fournisseurs || []).find(x => x.id === Number(f.fournisseurId))
  const magNom = magasin?.nom
  const salariesMag = useMemo(() => (salaries || []).filter(s => !magNom || !s.magasin || s.magasin === magNom), [salaries, magNom])
  const modeles = useMemo(() => {
    const s = new Set(); Object.values(fournisseur?.modelesBySeason || {}).forEach(a => (a || []).forEach(m => s.add(m))); return [...s].sort()
  }, [fournisseur])

  useEffect(() => {
    let actif = true
    infosModele(f.fournisseurId, f.modele).then(r => {
      if (!actif) return
      setInfos(r)
      if (!modif && r.numero) setF(x => ({ ...x, numero: r.numero }))   // N° du modèle = le plus fréquent dans le Cahier (comme aujourd'hui)
    })
    return () => { actif = false }
  }, [f.fournisseurId, f.modele, modif])

  // Prix qui sera enregistré sur la ligne « Retour » : prix tapé, sinon prix du modèle ; 0 € → avertissement
  const clePrix = modif || !f.fournisseurId || !f.modele || !f.magasinId ? '' : `${f.fournisseurId}|${f.magasinId}|${season}|${f.modele}`
  const [prix0, setPrix0] = useState({ cle: '', u: null })
  const prixCalcule = clePrix && prix0.cle === clePrix ? prix0.u : null
  useEffect(() => {
    let actif = true
    if (clePrix) prixUnitaire(Number(f.fournisseurId), Number(f.magasinId), season, f.modele).then(u => { if (actif) setPrix0({ cle: clePrix, u }) })
    return () => { actif = false }
  }, [clePrix])  // eslint-disable-line react-hooks/exhaustive-deps
  const prixZero = prixCalcule === 0 && !(parseFloat(String(prixManuel).replace(',', '.')) > 0)

  async function ajouterModele(nom) {
    const ex = fournisseur?.modelesBySeason || {}, arr = ex[season] || []
    if (!arr.includes(nom)) await db.fournisseurs.update(fournisseur.id, { modelesBySeason: { ...ex, [season]: [...arr, nom] } })
  }
  const commencee = modif ? JSON.stringify(f) !== initial : !!(f.fournisseurId || f.note)
  const fermer = () => { if (etape === 'saisie' && commencee && !enCours) setConfirmFermer(true); else onFermer() }

  async function enregistrer() {
    if (!f.magasinId) return setErreur('Choisis le magasin.')
    if (!f.fournisseurId) return setErreur('Choisis la marque.')
    if (!f.modele) return setErreur('Choisis le modèle.')
    setEnCours(true); setErreur('')
    const magasinId = Number(f.magasinId), fournisseurId = Number(f.fournisseurId)
    try {
      if (modif) {
        await db.defectueux.update(defect.id, { magasinId, fournisseurId, salarie: f.salarie, modele: f.modele, numero: f.numero, pointure: f.pointure, note: f.note, statut: f.statut })
        if (f.statut === 'Mail envoyé') await changerEtatDefectueux(defect.id, 'Mail envoyé')   // comme aujourd'hui : propage au SAV lié
        onToast?.({ texte: 'Défectueux modifié' }); onFermer(); return
      }
      if (!deja.current.entreeId) {
        let unit = prixManuel ? parseFloat(prixManuel.replace(',', '.')) || 0 : 0
        if (!unit) unit = await prixUnitaire(fournisseurId, magasinId, season, f.modele)
        deja.current.entreeId = await db.entrees.add({
          statut: 'Retour', magasinId, fournisseurId, date: aujourdhuiFr(), modele: f.modele, numero: f.numero, categorie: infos.categorie || '', typeKey: infos.typeKey || 'F',
          total: -1, pht: unit > 0 ? -Math.round(unit * 100) / 100 : 0, sizes: f.pointure ? { [f.pointure]: -1 } : {}, season,
        })
      }
      const defId = deja.current.defId || await db.defectueux.add({
        magasinId, fournisseurId, salarie: f.salarie, modele: f.modele, numero: f.numero, pointure: f.pointure, note: f.note,
        statut: 'À traiter', season, entreeId: deja.current.entreeId,   // créé « À traiter » ; l'état se change dans la fiche
      })
      deja.current.defId = defId
      setEnCours(false); setCree({ defId, fournisseur, societe }); setEtape('mail')
    } catch (err) {
      setEnCours(false)
      setErreur('Enregistrement impossible : ' + (err.message || 'vérifie la connexion et réessaie.') + (deja.current.entreeId ? ' Réessaie : ce qui est déjà enregistré ne sera pas recréé.' : ''))
    }
  }

  function envoyer(email) {
    window.open(buildDefectueuxMailUrl({ modele: f.modele, pointure: f.pointure, note: f.note, salarie: f.salarie, societe: cree?.societe || '', email, numeroClient: cree?.fournisseur?.numeroClient }), '_blank')
    return db.defectueux.update(cree.defId, { statut: 'Mail envoyé' }).catch(() => {})
  }

  const titre = etape === 'mail' ? 'Défectueux enregistré' : modif ? 'Modifier le défectueux' : 'Nouveau défectueux'
  return (
    <>
      <div className="feuille-fond" onClick={fermer} />
      <div className="feuille saisie-sav" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        {etape === 'mail' ? (
          <EtapesMail texteEnregistre="Le défectueux est enregistré et l'entrée « Retour » est ajoutée au Cahier." fournisseur={cree?.fournisseur} onEnvoyer={envoyer} onTerminer={onFermer} />
        ) : (
          <>
            <div className="feuille-corps champs-sav">
              <div className="deux-champs">
                <label className="etiquette">Magasin
                  <select className="champ" value={f.magasinId} onChange={e => set('magasinId', e.target.value)}>
                    <option value="">Choisir</option>
                    {(magasins || []).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select></label>
                {modif && <label className="etiquette">État
                  <select className="champ" value={f.statut} onChange={e => set('statut', e.target.value)}>
                    {STATUTS_DEF.map(s => <option key={s}>{s}</option>)}
                  </select></label>}
              </div>
              {magasin && <div className="aide" style={{ margin: '10px 0 0' }}>Société concernée : <b style={{ color: 'var(--texte)' }}>{societe || '—'}</b></div>}
              <span className="etiquette">Salarié</span>
              <ChoixSalarie valeur={f.salarie} onChange={v => set('salarie', v)} salaries={salariesMag} />
              <span className="etiquette">Marque</span>
              <ChoixMarque fournisseurs={fournisseurs || []} valeurId={f.fournisseurId} onErreur={setErreur}
                onChoisir={id => setF(x => ({ ...x, fournisseurId: id, modele: x.fournisseurId === id ? x.modele : '', pointure: x.fournisseurId === id ? x.pointure : '' }))} />
              <span className="etiquette">Modèle</span>
              <ChoixModele key={'m' + f.fournisseurId} modeles={modeles} valeur={f.modele} desactive={!f.fournisseurId}
                onChoisir={m => setF(x => ({ ...x, modele: m, pointure: x.modele === m ? x.pointure : '' }))} onAjouter={ajouterModele} />
              <div className="deux-champs">
                <label className="etiquette">N°
                  <input className="champ" value={f.numero} onChange={e => set('numero', e.target.value)} placeholder="1, 2, 3…" inputMode="numeric" /></label>
                {!modif && <label className="etiquette">Prix unitaire HT (€, facultatif)
                  <input className="champ" inputMode="decimal" value={prixManuel} onChange={e => setPrixManuel(e.target.value)} placeholder="Vide = prix du modèle" /></label>}
              </div>
              {prixZero && <div className="encart att" style={{ marginTop: 12 }}>Prix à 0 € : aucun avoir n'apparaîtra dans le Plan de règlement. Saisis le prix si tu le connais.</div>}
              <span className="etiquette">Pointure</span>
              <ChoixPointure key={'p' + f.modele} tailles={infos.tailles} valeur={f.pointure} onChange={v => set('pointure', v)} libre={false} desactive={!f.modele} />
              <label className="etiquette">Note / problème
                <textarea className="champ" rows={3} value={f.note} onChange={e => set('note', e.target.value)} placeholder="Décris le défaut…" /></label>
              {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
            </div>
            <div className="feuille-pied"><span className="total" />
              <button className="btn btn-prim" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : modif ? 'Enregistrer' : 'Enregistrer le défectueux'}</button>
            </div>
          </>
        )}
      </div>
      {confirmFermer && (
        <Confirmation danger titre={modif ? 'Abandonner les modifications ?' : 'Abandonner ce défectueux ?'} texte={modif ? 'Les changements ne seront pas enregistrés.' : 'Le défectueux en cours de saisie ne sera pas enregistré.'}
          confirmer="Abandonner" annuler="Continuer la saisie" onAnnuler={() => setConfirmFermer(false)} onConfirmer={() => { setConfirmFermer(false); onFermer() }} />
      )}
    </>
  )
}

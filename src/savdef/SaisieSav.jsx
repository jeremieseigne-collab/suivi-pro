import { useState, useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import { getSociete } from '../data/societes'
import { fmtTel } from '../components/shared'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { buildSavRetourMailUrl } from '../sav/mail'
import { ChoixSalarie, ChoixMarque, ChoixModele, ChoixPointure, EtapesMail } from './Champs'
import { TYPES_SAV, avecMarque, aujourdhuiFr, prixUnitaire, infosModele, marquerMailSav } from './regles'
import { useVariantes } from './variantes'

// Création et modification d'un dossier SAV (retour client, mise à la forme, réparation).
// Données enregistrées identiques à l'outil actuel : à la création d'un retour ou d'une réparation, une entrée « Retour » (−1)
// et un défectueux « À traiter » sont créés et liés ; puis on propose le mail au SAV de la marque.
export default function SaisieSav({ sav, magasinAppareil, onFermer, onToast }) {
  const modif = !!sav?.id
  const { season } = useSeason()
  const variantes = useVariantes()
  const magasins = useLiveQuery(() => db.magasins.orderBy('nom').toArray(), [])
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])

  const [type, setType] = useState(sav?.type ?? 'retour')
  const [f, setF] = useState(() => ({
    magasinId: sav?.magasinId ?? magasinAppareil?.id ?? '', salarie: sav?.salarie ?? '',
    clientNom: sav?.clientNom ?? '', clientTel: fmtTel(sav?.clientTel ?? ''),
    fournisseurId: sav?.fournisseurId ?? '', modele: sav?.modele ?? '', pointure: sav?.pointure ?? '', marque: sav?.marque ?? '',
    probleme: sav?.probleme ?? '', note: sav?.note ?? '',
  }))
  const [facturation, setFacturation] = useState(sav?.facturation ?? 'offert')
  const [prix, setPrix] = useState(sav?.prixReparation ? String(sav.prixReparation) : '')
  const [infos, setInfos] = useState({ tailles: [], typeKey: 'F', categorie: '' })
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [etape, setEtape] = useState('saisie')   // 'saisie' | 'mail' | 'attente'
  const [cree, setCree] = useState(null)         // { savId, defectueuxId, fournisseur, societe }
  const [confirmFermer, setConfirmFermer] = useState(false)
  const [initial] = useState(() => JSON.stringify([type, f, facturation, prix]))
  const deja = useRef({})                        // enregistrement « en chaîne » : ce qui est déjà créé n'est pas recréé si on réessaie (I9)
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
    infosModele(f.fournisseurId, f.modele).then(r => { if (actif) setInfos(r) })
    return () => { actif = false }
  }, [f.fournisseurId, f.modele])

  async function ajouterModele(nom) {
    const ex = fournisseur?.modelesBySeason || {}, arr = ex[season] || []
    if (!arr.includes(nom)) await db.fournisseurs.update(fournisseur.id, { modelesBySeason: { ...ex, [season]: [...arr, nom] } })
  }

  const commencee = modif ? JSON.stringify([type, f, facturation, prix]) !== initial : !!(f.clientNom || f.modele || f.probleme || f.note || f.marque)
  const fermer = () => { if (etape === 'saisie' && commencee && !enCours) setConfirmFermer(true); else onFermer() }

  async function enregistrer() {
    if (!f.magasinId) return setErreur('Choisis le magasin.')
    if (!f.clientNom.trim()) return setErreur('Indique le nom du client.')
    if (avecMarque(type) && !f.fournisseurId) return setErreur('Choisis la marque.')
    if (avecMarque(type) && !f.modele) return setErreur('Choisis le modèle.')
    setEnCours(true); setErreur('')
    const magasinId = Number(f.magasinId), fournisseurId = avecMarque(type) ? Number(f.fournisseurId) : null
    const prixRep = type === 'reparation' && facturation === 'payant' ? parseFloat(String(prix).replace(',', '.')) || null : null
    try {
      if (modif) {
        await db.sav.update(sav.id, {
          magasinId, salarie: f.salarie, clientNom: f.clientNom, clientTel: f.clientTel, fournisseurId, modele: f.modele, pointure: f.pointure, marque: f.marque,
          probleme: f.probleme, note: f.note, statut: sav.statut, decision: sav.decision ?? '',
          facturation: type === 'reparation' ? facturation : null, prixReparation: prixRep, enCoursAt: type === 'forme' ? (sav.enCoursAt ?? null) : null,
        })
        onToast?.({ texte: 'Dossier modifié' }); onFermer(); return
      }
      let defectueuxId = null
      if (avecMarque(type)) {
        if (!deja.current.entreeId) {
          const unit = await prixUnitaire(fournisseurId, magasinId, season, f.modele)
          deja.current.entreeId = await db.entrees.add({
            statut: 'Retour', magasinId, fournisseurId, date: aujourdhuiFr(), modele: f.modele, numero: '', categorie: infos.categorie || '', typeKey: infos.typeKey || 'F',
            total: -1, pht: unit > 0 ? -Math.round(unit * 100) / 100 : 0, sizes: f.pointure ? { [f.pointure]: -1 } : {}, season,
          })
        }
        if (!deja.current.defectueuxId) {
          const note = `${type === 'retour' ? 'Retour client' : 'Réparation'} — ${f.clientNom}${f.clientTel ? ` (${f.clientTel})` : ''} : ${f.probleme}`
          deja.current.defectueuxId = await db.defectueux.add({ magasinId, fournisseurId, salarie: f.salarie, modele: f.modele, numero: '', pointure: f.pointure, note, statut: 'À traiter', season, entreeId: deja.current.entreeId })
        }
        defectueuxId = deja.current.defectueuxId
      }
      // Mise à la forme : une paire à la fois sur la machine ; sinon le dossier est créé en attente
      let attente = false
      if (type === 'forme') attente = (await db.sav.toArray()).some(s => s.type === 'forme' && s.magasinId === magasinId && s.statut !== 'Clôturé' && s.enCoursAt)
      const savId = deja.current.savId || await db.sav.add({
        type, magasinId, salarie: f.salarie, clientNom: f.clientNom, clientTel: f.clientTel, fournisseurId, modele: f.modele, pointure: f.pointure, marque: f.marque,
        probleme: f.probleme, note: f.note, statut: '', decision: '', defectueuxId, season,
        facturation: type === 'reparation' ? facturation : null, prixReparation: prixRep, enCoursAt: type === 'forme' && !attente ? new Date().toISOString() : null,
      })
      deja.current.savId = savId
      setEnCours(false)
      if (avecMarque(type)) { setCree({ savId, defectueuxId, fournisseur, societe }); setEtape('mail') }
      else if (attente) setEtape('attente')
      else { onToast?.({ texte: 'Dossier créé — minuteur de 48 h lancé' }); onFermer() }
    } catch (err) {
      setEnCours(false)
      setErreur('Enregistrement impossible : ' + (err.message || 'vérifie la connexion et réessaie.') + (deja.current.entreeId ? ' Réessaie : ce qui est déjà enregistré ne sera pas recréé.' : ''))
    }
  }

  const urlMail = email => buildSavRetourMailUrl({
    modele: f.modele, pointure: f.pointure, probleme: f.probleme, salarie: f.salarie, societe: cree?.societe || societe || '',
    email, numeroClient: (cree?.fournisseur || fournisseur)?.numeroClient,
  })
  function envoyer(email) {
    window.open(urlMail(email), '_blank')
    return marquerMailSav({ id: cree.savId, statut: '', defectueuxId: cree.defectueuxId }).catch(() => {})
  }

  const titre = etape === 'mail' ? 'Dossier SAV créé' : etape === 'attente' ? 'Machine occupée' : modif ? 'Modifier le dossier' : 'Nouveau dossier SAV'
  return (
    <>
      <div className="feuille-fond" onClick={fermer} />
      <div className="feuille saisie-sav" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>

        {etape === 'mail' ? (
          <EtapesMail texteEnregistre="Le dossier est enregistré, le défectueux est créé et l'entrée « Retour » est ajoutée au Cahier." fournisseur={cree?.fournisseur} onEnvoyer={envoyer} onTerminer={onFermer} />
        ) : etape === 'attente' ? (
          <>
            <div className="feuille-corps">
              <p style={{ marginTop: 0 }}>Une paire est déjà sur la <b>machine de mise à la forme</b>.</p>
              <p>Ce dossier est enregistré <b>en attente</b>. Touche « Terminer » sur la mise à la forme en cours pour libérer la machine : le minuteur de ce dossier démarrera alors tout seul.</p>
            </div>
            <div className="feuille-pied"><span className="total" /><button className="btn btn-prim" onClick={onFermer}>J'ai compris</button></div>
          </>
        ) : (
          <>
            <div className="feuille-corps champs-sav">
              {!modif && (
                <div className="segment segment-plein" role="group" aria-label="Type de dossier" style={{ marginBottom: 14 }}>
                  {TYPES_SAV.map(([v, l]) => <button key={v} aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>)}
                </div>
              )}

              {variantes.magasinSav ? (
                <label className="etiquette">Magasin
                  <select className="champ" value={f.magasinId} onChange={e => set('magasinId', e.target.value)}>
                    <option value="">Choisir</option>
                    {(magasins || []).map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select></label>
              ) : null}

              <span className="etiquette">Traité par</span>
              <ChoixSalarie valeur={f.salarie} onChange={v => set('salarie', v)} salaries={salariesMag} />

              <div className="deux-champs">
                <label className="etiquette">Nom du client
                  <input className="champ" value={f.clientNom} onChange={e => set('clientNom', e.target.value)} placeholder="Nom Prénom" /></label>
                <label className="etiquette">Téléphone
                  <input className="champ" value={f.clientTel} onChange={e => set('clientTel', fmtTel(e.target.value))} placeholder="06 12 34 56 78" inputMode="tel" /></label>
              </div>

              {type === 'reparation' && <>
                <span className="etiquette">Réparation</span>
                <div className="segment" role="group" aria-label="Facturation">
                  <button aria-pressed={facturation === 'offert'} onClick={() => setFacturation('offert')}>Offerte</button>
                  <button aria-pressed={facturation === 'payant'} onClick={() => setFacturation('payant')}>Payante</button>
                </div>
                {facturation === 'payant' && <label className="etiquette" style={{ marginTop: 10 }}>Prix de la réparation (€)
                  <input className="champ" inputMode="decimal" value={prix} onChange={e => setPrix(e.target.value)} placeholder="Ex. 25" /></label>}
              </>}

              {avecMarque(type) ? <>
                {magasin && <div className="aide" style={{ margin: '14px 0 0' }}>Société : <b style={{ color: 'var(--texte)' }}>{societe || '—'}</b></div>}
                <span className="etiquette">Marque</span>
                <ChoixMarque fournisseurs={fournisseurs || []} valeurId={f.fournisseurId} onErreur={setErreur}
                  onChoisir={id => setF(x => ({ ...x, fournisseurId: id, modele: x.fournisseurId === id ? x.modele : '', pointure: x.fournisseurId === id ? x.pointure : '' }))} />
                <span className="etiquette">Modèle</span>
                <ChoixModele key={'m' + f.fournisseurId} modeles={modeles} valeur={f.modele} desactive={!f.fournisseurId}
                  onChoisir={m => setF(x => ({ ...x, modele: m, pointure: x.modele === m ? x.pointure : '' }))} onAjouter={ajouterModele} />
                <span className="etiquette">Pointure</span>
                <ChoixPointure key={'p' + f.modele} tailles={infos.tailles} valeur={f.pointure} onChange={v => set('pointure', v)} desactive={!f.modele} />
                <label className="etiquette">{type === 'retour' ? 'Description du problème' : 'Note / problème'}
                  <textarea className="champ" rows={3} value={f.probleme} onChange={e => set('probleme', e.target.value)}
                    placeholder={type === 'retour' ? 'Décris le défaut ou le problème signalé par le client…' : 'Décris les réparations à faire…'} /></label>
              </> : <>
                <div className="trois-champs">
                  <label className="etiquette">Marque<input className="champ" value={f.marque} onChange={e => set('marque', e.target.value)} placeholder="Ex. Clarks" /></label>
                  <label className="etiquette">Modèle<input className="champ" value={f.modele} onChange={e => set('modele', e.target.value)} placeholder="Nom du modèle" /></label>
                  <label className="etiquette">Pointure<input className="champ" value={f.pointure} onChange={e => set('pointure', e.target.value)} placeholder="Ex. 42" inputMode="decimal" /></label>
                </div>
                <label className="etiquette">Note<textarea className="champ" rows={2} value={f.note} onChange={e => set('note', e.target.value)} placeholder="Informations complémentaires…" /></label>
              </>}
              {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
            </div>
            <div className="feuille-pied">
              {modif && avecMarque(type) && <button className="btn" onClick={() => window.open(urlMail(fournisseur?.email), '_blank')}><Icone nom="mail" taille={20} />Mail à la marque</button>}
              <span className="total" />
              <button className="btn btn-prim" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : modif ? 'Enregistrer' : 'Créer le dossier'}</button>
            </div>
          </>
        )}
      </div>
      {confirmFermer && (
        <Confirmation danger titre={modif ? 'Abandonner les modifications ?' : 'Abandonner ce dossier ?'} texte={modif ? 'Les changements faits sur ce dossier ne seront pas enregistrés.' : 'Le dossier en cours de saisie ne sera pas enregistré.'}
          confirmer="Abandonner" annuler="Continuer la saisie" onAnnuler={() => setConfirmFermer(false)} onConfirmer={() => { setConfirmFermer(false); onFermer() }} />
      )}
    </>
  )
}

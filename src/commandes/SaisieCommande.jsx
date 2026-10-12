import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { fmtTel } from '../components/shared'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { ChoixSalarie } from '../savdef/Champs'
import { PROVENANCES, STATUTS, CLASSE_PROVENANCE, memeMagasin } from './constants'

// Date du jour en heure française (l'outil actuel la calculait en heure anglaise : la veille entre minuit et 2 h)
const aujourdhuiIso = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const cleSalarie = mag => `commandes_dernier_salarie::${mag}`

// Création et modification d'une commande client. Mêmes champs et mêmes données que l'outil actuel ;
// le dernier salarié est mémorisé sur l'appareil (U6).
export default function SaisieCommande({ commande, magasinCmd, magasinNom, onFermer, onToast }) {
  const modif = !!commande?.id
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])   // suggestions de marques (texte libre gardé)
  const [f, setF] = useState(() => ({
    magasin: commande?.magasin || magasinCmd, date: commande?.date || aujourdhuiIso(),
    salarie: commande?.salarie || (() => { try { return localStorage.getItem(cleSalarie(magasinCmd)) || '' } catch { return '' } })(),
    provenance: commande?.provenance || '', marque: commande?.marque || '', modele: commande?.modele || '', reference: commande?.reference || '',
    pointure: commande?.pointure || '', clientNom: commande?.clientNom || '', clientPrenom: commande?.clientPrenom || '',
    telephone: fmtTel(commande?.telephone || ''), note: commande?.note || '', statut: commande?.statut || 'À commander',
  }))
  const [initial] = useState(() => JSON.stringify(f))
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [confirmFermer, setConfirmFermer] = useState(false)
  const set = (k, val) => setF(x => ({ ...x, [k]: val }))
  const salariesMag = useMemo(() => (salaries || []).filter(s => !s.magasin || memeMagasin(s.magasin, magasinNom)), [salaries, magasinNom])

  const commencee = JSON.stringify(f) !== initial
  const fermer = () => { if (commencee && !enCours) setConfirmFermer(true); else onFermer() }

  async function enregistrer() {
    if (!f.salarie) return setErreur('Indique qui passe la commande.')
    setEnCours(true); setErreur('')
    try {
      if (modif) await db.commandes.update(commande.id, f)
      else await db.commandes.add(f)
      try { localStorage.setItem(cleSalarie(magasinCmd), f.salarie) } catch { /* ignore */ }
      onToast?.({ texte: modif ? 'Commande modifiée' : 'Commande créée' }); onFermer()
    } catch (err) { setEnCours(false); setErreur("Enregistrement impossible : " + (err.message || 'vérifie la connexion et réessaie.')) }
  }

  const titre = modif ? 'Modifier la commande' : 'Nouvelle commande'
  return (
    <>
      <div className="feuille-fond" onClick={fermer} />
      <div className="feuille saisie-sav" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <span className="etiquette" style={{ marginTop: 0 }}>Salarié</span>
          <ChoixSalarie valeur={f.salarie} onChange={val => set('salarie', val)} salaries={salariesMag} />

          <div className="deux-champs">
            <label className="etiquette">Date
              <input className="champ" type="date" value={f.date} onChange={e => set('date', e.target.value)} /></label>
            <label className="etiquette">État
              <select className="champ" value={f.statut} onChange={e => set('statut', e.target.value)}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select></label>
          </div>

          <span className="etiquette">Provenance</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {PROVENANCES.map(p => <button key={p} type="button" className={`chip ${CLASSE_PROVENANCE[p] || ''}`} aria-pressed={f.provenance === p} onClick={() => set('provenance', f.provenance === p ? '' : p)}>{p}</button>)}
          </div>

          <div className="deux-champs">
            <label className="etiquette">Nom du client<input className="champ" value={f.clientNom} onChange={e => set('clientNom', e.target.value)} /></label>
            <label className="etiquette">Prénom du client<input className="champ" value={f.clientPrenom} onChange={e => set('clientPrenom', e.target.value)} /></label>
          </div>
          <label className="etiquette">Téléphone portable
            <input className="champ" value={f.telephone} onChange={e => set('telephone', fmtTel(e.target.value))} inputMode="tel" placeholder="06 12 34 56 78" /></label>

          <div className="deux-champs">
            <label className="etiquette">Marque
              <input className="champ" value={f.marque} onChange={e => set('marque', e.target.value)} list="marques-repertoire" autoComplete="off" />
              <datalist id="marques-repertoire">{(fournisseurs || []).map(x => <option key={x.id} value={x.nom} />)}</datalist></label>
            <label className="etiquette">Modèle<input className="champ" value={f.modele} onChange={e => set('modele', e.target.value)} /></label>
          </div>
          <div className="deux-champs">
            <label className="etiquette">Référence N°<input className="champ" value={f.reference} onChange={e => set('reference', e.target.value)} /></label>
            <label className="etiquette">Pointure<input className="champ" value={f.pointure} onChange={e => set('pointure', e.target.value)} /></label>
          </div>
          <label className="etiquette">Note<textarea className="champ" rows={3} value={f.note} onChange={e => set('note', e.target.value)} /></label>
          {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
        </div>
        <div className="feuille-pied"><span className="total" />
          <button className="btn btn-prim" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : modif ? 'Enregistrer' : 'Créer la commande'}</button>
        </div>
      </div>
      {confirmFermer && (
        <Confirmation danger titre={modif ? 'Abandonner les modifications ?' : 'Abandonner cette commande ?'} texte={modif ? 'Les changements ne seront pas enregistrés.' : 'La commande en cours de saisie ne sera pas enregistrée.'}
          confirmer="Abandonner" annuler="Continuer la saisie" onAnnuler={() => setConfirmFermer(false)} onConfirmer={() => { setConfirmFermer(false); onFermer() }} />
      )}
    </>
  )
}

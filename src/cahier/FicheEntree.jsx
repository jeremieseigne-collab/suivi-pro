import { useState, useEffect } from 'react'
import { db } from '../db'
import { SIZE_TYPES } from '../data/sizes'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Numero, Statut } from './Reperes'
import { STATUTS, fmtEur, pluriel, libelleJour } from './commun'
import { prixRetour, ORIGINE_PRIX, effetPlanRetour } from '../savdef/regles'

// Fiche d'une entrée (fenêtre au centre sur ordinateur, plein écran sur téléphone) :
// statut en un toucher, pointures, pointage (Direction), modifier, supprimer.
// Retour (Direction seulement, 13/10) : corriger le prix, avec l'effet sur le Plan de règlement, confirmation et « Annuler ».
export default function FicheEntree({ entree: e, estDirection, pointe, onPointer, onModifier, onFermer, onToast }) {
  const [erreur, setErreur] = useState('')
  const [confirmSuppr, setConfirmSuppr] = useState(false)
  const grille = SIZE_TYPES[e.typeKey]?.sizes || []
  const tailles = Object.entries(e.sizes || {}).filter(([, q]) => Number(q))
  tailles.sort(([a], [b]) => (grille.indexOf(a) + 1 || 999) - (grille.indexOf(b) + 1 || 999))

  async function changerStatut(s) {
    if (s === (e.statut || '')) return
    const avant = e.statut || ''
    try {
      await db.entrees.update(e.id, { statut: s })
      onToast({ texte: `Statut : ${s ? s.replace('Imp. Etiquettes', 'Imp. étiquettes') : 'Aucun'}`, annuler: () => db.entrees.update(e.id, { statut: avant }) })
    } catch (err) { setErreur('Changement impossible : ' + (err.message || err)) }
  }
  // ── Prix d'un retour (Direction) ──
  const estRetour = e.statut === 'Retour'
  const [lies, setLies] = useState(null)          // { defStatut, deduit, propose }
  const [prixTape, setPrixTape] = useState(null)  // null = formulaire fermé
  const [confirmPrix, setConfirmPrix] = useState(false)
  useEffect(() => {
    if (!estDirection || !estRetour) return
    let actif = true
    ;(async () => {
      const [d, p, propose] = await Promise.all([
        db.defectueux.where('entreeId').equals(e.id).first(),
        db.reglementPaye.where('cle').equals(`avoir|${e.id}`).first(),
        prixRetour(e.fournisseurId, e.magasinId, e.season, e.modele),
      ])
      if (actif) setLies({ defStatut: d?.statut || '', deduit: !!p, propose })
    })()
    return () => { actif = false }
  }, [estDirection, estRetour, e.id, e.fournisseurId, e.magasinId, e.season, e.modele])
  const nbPaires = Number(e.total) || -1
  const unitTape = prixTape == null ? 0 : parseFloat(String(prixTape).replace(',', '.')) || 0
  const nouveauPht = Math.round(unitTape * nbPaires * 100) / 100
  const libSaison = s => (s || '').replace('ETE_', 'Été ').replace('HIVER_', 'Hiver ')
  function ouvrirPrix() {
    const actuel = e.pht && e.total ? Math.abs(e.pht / e.total) : 0
    const u = actuel || lies?.propose?.unit || 0
    setPrixTape(u ? String(Math.round(u * 100) / 100).replace('.', ',') : '')
  }
  async function enregistrerPrix() {
    setConfirmPrix(false)
    const avant = e.pht || 0
    try {
      await db.entrees.update(e.id, { pht: nouveauPht })
      setPrixTape(null)
      onToast({ texte: `Prix du retour : ${fmtEur(nouveauPht)}`, annuler: () => db.entrees.update(e.id, { pht: avant }) })
    } catch (err) { setErreur('Correction impossible : ' + (err.message || err)) }
  }

  async function supprimer() {
    setConfirmSuppr(false)
    try { await db.entrees.delete(e.id); onToast({ texte: 'Entrée supprimée' }); onFermer() }
    catch (err) { setErreur('Suppression impossible : ' + (err.message || err)); setConfirmSuppr(false) }
  }

  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={`Entrée ${e.marque}`}>
        <div className="feuille-entete"><h2>{e.marque}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <div style={{ fontWeight: 600, fontSize: 16 }}>{e.modele || 'Sans modèle'}<Numero n={e.numero} /></div>
          <div className="resume-saisie" style={{ marginTop: 6 }}>
            <span>{libelleJour(e.date)} <b>{e.date}</b></span>
            <span><b>{pluriel(e.total || 0, 'paire')}</b></span>
            <span><b>{e.pht ? fmtEur(e.pht) : 'prix non renseigné'}</b></span>
          </div>
          <div className="resume-saisie" style={{ marginTop: 0 }}>
            <span>Catégorie <b>{e.categorie || '—'}</b></span>
            <span>Magasin <b>{e.magasin}</b></span>
            {estDirection && pointe && <span><b style={{ color: 'var(--ok)' }}>Pointée</b></span>}
          </div>

          <span className="etiquette" style={{ marginTop: 16 }}>Statut</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {STATUTS.map(s => <button key={s || 'aucun'} className="chip" aria-pressed={(e.statut || '') === s} onClick={() => changerStatut(s)}>{s ? <Statut s={s} /> : 'Aucun'}</button>)}
          </div>

          <span className="etiquette" style={{ marginTop: 16 }}>Pointures ({SIZE_TYPES[e.typeKey]?.label || e.typeKey || '—'})</span>
          {tailles.length ? (
            <div className="pointures">
              {tailles.map(([t, q]) => <div key={t} className={`pt plein${q < 0 || e.statut === 'Retour' ? ' retour' : ''}`} style={{ minHeight: 52, cursor: 'default' }}>{t}<span className="qte">{q}</span></div>)}
            </div>
          ) : <div className="vide" style={{ padding: 12 }}>Aucune pointure détaillée.</div>}

          {estDirection && estRetour && lies && (
            <>
              <span className="etiquette" style={{ marginTop: 16 }}>Prix du retour</span>
              <div className="carte" style={{ background: 'var(--carte-2)' }}>
                <div><b>{e.pht ? fmtEur(e.pht) : '0,00 €'}</b> pour {pluriel(Math.abs(nbPaires), 'paire')}</div>
                <div className="aide" style={{ marginTop: 4 }}>{effetPlanRetour(lies.defStatut, e.pht, lies.deduit)}</div>
                {prixTape == null ? (
                  <button className="btn" style={{ marginTop: 10 }} onClick={ouvrirPrix}>Corriger le prix</button>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <label className="etiquette" htmlFor="prix-retour">Prix unitaire HT (€)</label>
                    <input id="prix-retour" className="champ" inputMode="decimal" value={prixTape} onChange={x => setPrixTape(x.target.value)} autoFocus />
                    {lies.propose?.unit > 0 && <div className="aide" style={{ marginTop: 4 }}>Proposé : {fmtEur(lies.propose.unit)} ({ORIGINE_PRIX[lies.propose.source]}{lies.propose.source !== 'aucun' ? ' · ' + libSaison(lies.propose.saison) : ''})</div>}
                    <div style={{ marginTop: 8 }}>Nouveau montant : <b>{fmtEur(nouveauPht)}</b></div>
                    <div className="aide" style={{ marginTop: 4 }}>{effetPlanRetour(lies.defStatut, nouveauPht, lies.deduit)}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button className="btn" onClick={() => setPrixTape(null)}>Annuler</button>
                      <button className="btn btn-prim" disabled={!unitTape || nouveauPht === (e.pht || 0)} onClick={() => setConfirmPrix(true)}>Enregistrer le prix</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {estDirection && <button className="btn" onClick={() => onPointer(!pointe)}><Icone nom="check" taille={18} />{pointe ? 'Dépointer' : 'Pointer'}</button>}
            <button className="btn" onClick={onModifier}>Modifier</button>
            <button className="btn btn-danger" onClick={() => setConfirmSuppr(true)}>Supprimer</button>
          </div>
        </div>
      </div>
      {confirmPrix && (
        <Confirmation titre="Corriger le prix de ce retour ?"
          texte={`${e.marque} · ${e.modele || 'sans modèle'} du ${e.date} : ${fmtEur(e.pht || 0)} → ${fmtEur(nouveauPht)}. ${effetPlanRetour(lies?.defStatut, nouveauPht, lies?.deduit)}`}
          confirmer="Enregistrer le prix" onAnnuler={() => setConfirmPrix(false)} onConfirmer={enregistrerPrix} />
      )}
      {confirmSuppr && (
        <Confirmation danger titre="Supprimer cette entrée ?"
          texte={`${e.marque} · ${e.modele || 'sans modèle'} · ${pluriel(e.total || 0, 'paire')} du ${e.date}. Cette suppression est définitive.`}
          confirmer="Supprimer" onAnnuler={() => setConfirmSuppr(false)} onConfirmer={supprimer} />
      )}
    </>
  )
}

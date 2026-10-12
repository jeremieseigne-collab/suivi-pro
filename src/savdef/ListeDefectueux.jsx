import { useState, useMemo } from 'react'
import { db } from '../db'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Numero } from '../cahier/Reperes'
import { buildDefectueuxMailUrl } from '../defectueux/mail'
import { STATUTS_DEF, DEF_TERMINES, DEF_FIN, CLASSE_DEF, fmtDate, changerEtatDefectueux, cloturerSav } from './regles'
import { useVariantes } from './variantes'

const EtatDef = ({ s }) => <span className={`etat-mot ${CLASSE_DEF[s] || ''}`}>{s || '—'}</span>

// Fiche d'un défectueux : état en un toucher (avec « Annuler »), mail au SAV de la marque, modifier, supprimer
function FicheDefectueux({ d, avecMagSoc, onChangerEtat, onMail, onModifier, onSupprimer, onFermer }) {
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={`Défectueux ${d.marque}`}>
        <div className="feuille-entete"><h2>{d.marque}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          <div style={{ fontWeight: 600, fontSize: 16 }}>{d.modele || 'Sans modèle'}<Numero n={d.numero} /></div>
          <div className="resume-saisie" style={{ marginTop: 6 }}>
            <span>Pointure <b>{d.pointure || '—'}</b></span><span>Le <b>{fmtDate(d.createdAt)}</b></span><span>Salarié <b>{d.salarie || '—'}</b></span>
            {avecMagSoc && <><span>Magasin <b>{d.magasin}</b></span><span>Société <b>{d.societe || '—'}</b></span></>}
          </div>
          {d.note && <><span className="etiquette" style={{ marginTop: 16 }}>Note / problème</span><div className="carte" style={{ background: 'var(--carte-2)', whiteSpace: 'pre-wrap' }}>{d.note}</div></>}
          <span className="etiquette" style={{ marginTop: 16 }}>État</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {STATUTS_DEF.map(s => <button key={s} className="chip" aria-pressed={d.statut === s} onClick={() => onChangerEtat(d, s)}>{s}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <button className="btn" onClick={() => onMail(d)}><Icone nom="mail" taille={20} />Mail au SAV de la marque</button>
            <button className="btn" onClick={() => onModifier(d)}>Modifier</button>
            <button className="btn btn-danger" onClick={() => onSupprimer(d)}>Supprimer</button>
          </div>
        </div>
      </div>
    </>
  )
}

// Onglet Défectueux : recherche, filtre par état, une ligne par défectueux du magasin
export default function ListeDefectueux({ rows, magasinNom, onModifier, onToast }) {
  const { magSoc } = useVariantes()
  const [rech, setRech] = useState('')
  const [etat, setEtat] = useState('')
  const [ficheId, setFicheId] = useState(null)
  const [aSupprimer, setASupprimer] = useState(null)
  const [aRouvrir, setARouvrir] = useState(null)
  const [aussiSav, setAussiSav] = useState(null)    // { d, statut, sav } : proposer de clôturer aussi le dossier SAV lié (U5)

  const filtres = useMemo(() => rows.filter(r => {
    if (etat && r.statut !== etat) return false
    if (!rech) return true
    return [r.marque, r.modele, r.numero, r.pointure, r.salarie, r.societe, r.note].map(v => (v || '').toLowerCase()).join(' ').includes(rech.toLowerCase())
  }), [rows, etat, rech])
  const enCours = rows.filter(r => !DEF_TERMINES.includes(r.statut)).length
  const fiche = ficheId && rows.find(r => r.id === ficheId)

  async function appliquer(d, statut, sav) {
    const avant = d.statut, savAvant = sav?.statut
    try {
      await changerEtatDefectueux(d.id, statut)
      if (sav) await cloturerSav(sav)
      onToast({ texte: sav ? `État « ${statut} » · dossier SAV clôturé` : `État « ${statut} »`,
        annuler: async () => { await db.defectueux.update(d.id, { statut: avant }); if (sav) await db.sav.update(sav.id, { statut: savAvant || '' }) } })
    } catch (e) { onToast({ texte: 'Changement impossible : ' + (e.message || 'vérifie la connexion.') }) }
  }
  async function changerEtat(d, statut) {
    if (statut === d.statut) return
    setAussiSav(null)
    if (DEF_FIN.includes(statut)) {
      const sav = await db.sav.where('defectueuxId').equals(d.id).first().catch(() => null)
      if (sav && sav.statut !== 'Clôturé') { setAussiSav({ d, statut, sav }); return }
    }
    appliquer(d, statut, null)
  }
  function mail(d) {
    window.open(buildDefectueuxMailUrl({ modele: d.modele, pointure: d.pointure, note: d.note, salarie: d.salarie, societe: d.societe, email: d.fournisseurObj?.email, numeroClient: d.fournisseurObj?.numeroClient }), '_blank')
    if (d.statut === 'À traiter') changerEtatDefectueux(d.id, 'Mail envoyé').catch(() => {})
  }
  function modifier(d) { setFicheId(null); if (DEF_TERMINES.includes(d.statut)) setARouvrir(d); else onModifier(d) }
  async function supprimer() {
    const d = aSupprimer; setASupprimer(null); setFicheId(null)
    try { await db.defectueux.delete(d.id); onToast({ texte: 'Défectueux supprimé' }) } catch (e) { onToast({ texte: 'Suppression impossible : ' + e.message }) }
  }

  return (
    <div>
      <div className="recherche"><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="Marque, modèle, N°, salarié…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher" /></div>
      <div className="chips" style={{ marginTop: 10 }}>
        <button className="chip" aria-pressed={!etat} onClick={() => setEtat('')}>Tous les états</button>
        {STATUTS_DEF.map(s => <button key={s} className="chip" aria-pressed={etat === s} onClick={() => setEtat(s)}>{s}</button>)}
      </div>
      <div className="sous-info">{magasinNom} · {rows.length} défectueux · {enCours} en cours</div>
      {!filtres.length ? <div className="vide">{rows.length ? 'Aucun défectueux ne correspond.' : 'Aucun défectueux — touche « Nouveau défectueux ».'}</div> : (
        <div className="liste" style={{ marginTop: 10 }}>
          {filtres.map(d => (
            <button key={d.id} className={`ligne ligne-def${DEF_TERMINES.includes(d.statut) ? ' faible termine' : ''}`} onClick={() => setFicheId(d.id)}>
              <span className="txt">
                <span className="t1">{d.marque} <span>· {d.modele || 'sans modèle'}</span><Numero n={d.numero} />{d.pointure && <span> · {d.pointure}</span>}</span>
                <span className="t2">{[fmtDate(d.createdAt), d.salarie, magSoc ? d.magasin : null, magSoc ? d.societe : null].filter(Boolean).join(' · ')}</span>
                {d.note && <span className="t2 note-def">{d.note}</span>}
              </span>
              <EtatDef s={d.statut} />
            </button>
          ))}
        </div>
      )}
      {fiche && <FicheDefectueux d={fiche} avecMagSoc onChangerEtat={changerEtat} onMail={mail} onModifier={modifier} onSupprimer={setASupprimer} onFermer={() => setFicheId(null)} />}
      {aussiSav && (
        <Confirmation titre={`Passer à « ${aussiSav.statut} »`} confirmer="Clôturer le SAV aussi" annuler="Annuler"
          texte={`Le dossier SAV lié (${aussiSav.sav.clientNom || 'client'}) n'est pas clôturé. Le clôturer aussi ?`}
          secondaire={{ texte: 'Seulement le défectueux', onClick: () => { const x = aussiSav; setAussiSav(null); appliquer(x.d, x.statut, null) } }}
          onAnnuler={() => setAussiSav(null)} onConfirmer={() => { const x = aussiSav; setAussiSav(null); appliquer(x.d, x.statut, x.sav) }} />
      )}
      {aRouvrir && <Confirmation titre="Modifier un défectueux terminé ?" texte="Ce défectueux est clôturé ou refusé. Tu veux vraiment le modifier ?" confirmer="Modifier" onAnnuler={() => setARouvrir(null)} onConfirmer={() => { const d = aRouvrir; setARouvrir(null); onModifier(d) }} />}
      {aSupprimer && <Confirmation danger titre="Supprimer ce défectueux ?" confirmer="Supprimer" onAnnuler={() => setASupprimer(null)} onConfirmer={supprimer}
        texte={`${aSupprimer.marque} · ${aSupprimer.modele || 'sans modèle'}. Cette suppression est définitive. L'entrée « Retour » du Cahier reste (à supprimer à part si besoin).`} />}
    </div>
  )
}

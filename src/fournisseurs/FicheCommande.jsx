import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import Icone from '../components/ui/Icone'
import { fmtEur } from '../components/shared'
import { SIZE_TYPES } from '../data/sizes'
import { receptionsDe, journalDe, supprimerCommande, messageErreur } from './donnees'
import Confirmation from '../components/ui/Confirmation'
import { libelleSaison } from './csvPolaris'
import { Jauge, StatutCommande } from './commun'
import { fmtJour, enRetard } from './outils'

const ACTIONS = { import: 'Importée', reimport: 'Réimportée', annulation: 'Reliquat annulé', retablissement: 'Reliquat rétabli', suppression: 'Supprimée' }
const quand = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }

// Ordre des tailles : celui des grilles connues, sinon numérique puis alphabétique
const TOUTES_TAILLES = Object.values(SIZE_TYPES).flatMap(t => t.sizes || [])
const rangTaille = t => { const i = TOUTES_TAILLES.indexOf(t); const n = parseFloat(t); return i >= 0 ? i : Number.isFinite(n) ? 1000 + n : 5000 }

// Un modèle-coloris de la commande : totaux, puis grille des tailles en le touchant
function Modele({ m, estDirection }) {
  const [ouvert, setOuvert] = useState(false)
  const p = m.commande > 0 ? Math.round(m.recu / m.commande * 100) : (m.recu > 0 ? 100 : 0)
  return (
    <div>
      <button className={`ligne cf-modele${m.recu === 0 ? ' faible' : ''}`} aria-expanded={ouvert} onClick={() => setOuvert(o => !o)} style={{ minHeight: 56 }}>
        <span className="txt">
          <span className="t1">{m.libelle || m.code}{m.hors && <span className="etat-mot att" style={{ marginLeft: 6 }}>hors commande</span>}</span>
          <span className="t2">{m.code}{m.couleur ? ' · ' + m.couleur : ''}{estDirection && m.prix != null ? ' · ' + fmtEur(m.prix) : ''}</span>
          <span className="ligne-jauge"><Jauge p={p} hauteur={5} /><span className="t2" style={{ margin: 0 }}>{m.recu} / {m.commande} reçue{m.recu > 1 ? 's' : ''}{m.reste ? ` · reste ${m.reste}` : ''}{m.annule ? ` · ${m.annule} annulée${m.annule > 1 ? 's' : ''}` : ''}{m.surplus ? ` · ${m.surplus} en plus` : ''}</span></span>
        </span>
        <Icone nom={ouvert ? 'bas' : 'chevron'} taille={18} style={{ color: 'var(--discret)' }} />
      </button>
      {ouvert && (
        <div style={{ padding: '4px 16px 14px 16px' }}>
          <div className="pointures" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))' }}>
            {m.tailles.map(t => (
              <div key={t.taille} className={`pt-suivi ${t.qte_commandee > 0 ? (t.reste === 0 ? 'ok' : t.qte_recue > 0 ? 'part' : 'zero') : 'part'}`} title={t.hors_commande ? 'hors commande' : undefined}>
                {t.taille || '—'}<small>{t.qte_recue} / {t.qte_commandee}{t.qte_annulee ? ` (−${t.qte_annulee})` : ''}</small>
              </div>
            ))}
          </div>
          <div className="aide" style={{ marginTop: 8 }}>Reçu / commandé par taille (entre parenthèses : annulé) — vert : complet, bleu : partiel, gris : rien reçu</div>
        </div>
      )}
    </div>
  )
}

export default function FicheCommande({ commande: c, lignes: toutesLignes, famille = '', marque, magasinNom, estDirection, cote, onFermer, onReimporter, onSupprimee }) {
  const receptions = useLiveQuery(() => receptionsDe(c.id), [c.id])
  const journal = useLiveQuery(() => journalDe(c.id), [c.id])
  const [voirJournal, setVoirJournal] = useState(false)
  const [aSupprimer, setASupprimer] = useState(false)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState('')
  const lignes = useMemo(() => famille ? toutesLignes.filter(l => l.famille === famille) : toutesLignes, [toutesLignes, famille])
  async function supprimer() {
    setASupprimer(false); setErreur('')
    try { await supprimerCommande(c.id, motif); onSupprimee?.(c) } catch (e) { setErreur(messageErreur(e)) }
  }

  // Lignes regroupées par modèle-coloris, dans l'ordre du fichier
  const modeles = useMemo(() => {
    const g = new Map()
    for (const l of [...lignes].sort((a, b) => a.ordre - b.ordre || a.id - b.id)) {
      const k = l.code_modele + '|' + l.couleur
      if (!g.has(k)) g.set(k, { cle: k, code: l.code_modele, couleur: l.couleur, libelle: l.libelle, prix: l.prix_achat, tailles: [], commande: 0, recu: 0, reste: 0, annule: 0, surplus: 0, hors: false })
      const m = g.get(k)
      m.tailles.push(l); m.commande += l.qte_commandee; m.recu += l.qte_recue; m.reste += l.reste; m.annule += l.qte_annulee; m.surplus += l.surplus; m.hors ||= l.hors_commande
      if (Number(l.prix_achat) !== Number(m.prix)) m.prix = null   // prix différents selon la taille : pas de prix unique affiché
    }
    for (const m of g.values()) m.tailles.sort((a, b) => rangTaille(a.taille) - rangTaille(b.taille))
    return [...g.values()]
  }, [lignes])

  const p = c.qte_commandee > 0 ? Math.round(c.qte_recue / c.qte_commandee * 100) : 0
  const contenu = (
    <>
      <div className="resume-saisie" style={{ marginTop: 0 }}>
        <span><StatutCommande c={c} /></span>
        <span>{c.type === 'reassort' ? 'Réassort' : 'Commande de saison'} · <b>{libelleSaison(c.season)}</b></span>
        {(c.numeros_bc || []).length > 0 && <span>N° BC <b>{c.numeros_bc.join(', ')}</b></span>}
        {c.date_commande && <span>Commandée le <b>{fmtJour(c.date_commande)}</b></span>}
        {c.livraison_prevue && <span className={enRetard(c) ? 'etat-mot att' : ''}>Livraison prévue <b>{fmtJour(c.livraison_prevue)}</b>{enRetard(c) ? ' · dépassée' : ''}</span>}
      </div>
      <div className="carte" style={{ marginTop: 12 }}>
        <Jauge p={p} hauteur={8} />
        <div className="aide" style={{ marginTop: 6 }}>
          <b>{c.qte_recue}</b> paire{c.qte_recue > 1 ? 's' : ''} reçue{c.qte_recue > 1 ? 's' : ''} sur <b>{c.qte_commandee}</b> commandée{c.qte_commandee > 1 ? 's' : ''}
          {c.reste ? <> · reste <b>{c.reste}</b></> : null}{c.qte_annulee ? <> · {c.qte_annulee} annulée{c.qte_annulee > 1 ? 's' : ''}</> : null}
          {estDirection && <> · montant net <b>{fmtEur(c.montant_net)}</b></>}
        </div>
      </div>
      {estDirection && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn" onClick={() => onReimporter(c)}><Icone nom="reassort" taille={18} />Réimporter</button>
        <button className="btn btn-danger" disabled={receptions === undefined || receptions.length > 0} onClick={() => { setMotif(''); setASupprimer(true) }}
          title={receptions?.length ? 'Des réceptions sont rattachées : passe par « Annuler le reliquat »' : undefined}><Icone nom="corbeille" taille={18} />Supprimer la commande</button>
      </div>}
      {estDirection && receptions?.length > 0 && <div className="aide" style={{ marginTop: 6 }}>Suppression impossible : {receptions.length} réception{receptions.length > 1 ? 's sont rattachées' : ' est rattachée'}. Pour ne plus attendre le reste, passe par « Annuler le reliquat ».</div>}
      {erreur && <div className="encart err" style={{ marginTop: 10 }}>{erreur}</div>}
      {famille && <div className="encart neutre" style={{ marginTop: 12 }}>Famille « {famille} » : {modeles.length} modèle{modeles.length > 1 ? 's' : ''} affiché{modeles.length > 1 ? 's' : ''} (totaux ci-dessus : toute la commande).</div>}

      <h3 className="groupe-titre">Modèles · {modeles.length}</h3>
      <div className="liste bloc-marque">{modeles.map(m => <Modele key={m.cle} m={m} estDirection={estDirection} />)}</div>

      <h3 className="groupe-titre">Réceptions{receptions ? ` · ${receptions.length}` : ''}</h3>
      {receptions === undefined ? <div className="aide">Chargement…</div> : !receptions.length ? <div className="aide" style={{ padding: '0 4px' }}>Aucune réception pour l’instant.</div> : (
        <div className="liste">
          {receptions.map(e => (
            <div key={e.id} className="ligne" style={{ minHeight: 48, cursor: 'default' }}>
              <span className="txt"><span className="t1" style={{ fontWeight: 500 }}>{e.date} · {e.modele}</span>
                <span className="t2">{e.total} paire{e.total > 1 ? 's' : ''}{estDirection ? ' · ' + fmtEur(e.pht) : ''}{e.pointe ? ' · pointée' : ''}</span></span>
            </div>
          ))}
        </div>
      )}

      <h3 className="groupe-titre"><button className="lien" onClick={() => setVoirJournal(v => !v)} aria-expanded={voirJournal}>Journal{journal ? ` · ${journal.length}` : ''} {voirJournal ? '▾' : '▸'}</button></h3>
      {voirJournal && (journal || []).map(j => (
        <div key={j.id} className="aide" style={{ padding: '4px 4px' }}>
          <b>{ACTIONS[j.action] || j.action}</b> le {quand(j.le)}{j.par_email ? ` par ${j.par_email}` : ''}{j.motif ? ` — ${j.motif}` : ''}
          {j.action === 'import' && j.detail?.paires != null ? ` (${j.detail.lignes} lignes, ${j.detail.paires} paires${j.detail.fichier ? ', ' + j.detail.fichier : ''})` : ''}
        </div>
      ))}
    </>
  )

  const confirmation = aSupprimer && (
    <Confirmation danger titre="Supprimer cette commande ?" confirmer="Supprimer" onAnnuler={() => setASupprimer(false)} onConfirmer={supprimer}
      texte={`${marque} · ${magasinNom} · ${c.qte_commandee} paires${(c.numeros_bc || []).length ? ' · BC ' + c.numeros_bc.join(', ') : ''}. La commande disparaît ; la suppression reste notée au journal.`}>
      <label className="etiquette">Motif (facultatif)<input className="champ" value={motif} onChange={e => setMotif(e.target.value)} placeholder="ex. importée en double" /></label>
    </Confirmation>
  )
  const titre = `${marque} · ${magasinNom}`
  if (cote) return (
    <aside className="carte cf-cote" aria-label={titre}>
      <div className="feuille-entete" style={{ padding: 0, marginBottom: 10 }}><h2>{titre}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
      {contenu}
      {confirmation}
    </aside>
  )
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">{contenu}</div>
      </div>
      {confirmation}
    </>
  )
}

import { useState } from 'react'
import { db } from '../db'
import { useSeason } from '../context/SeasonContext'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Statut } from './Reperes'
import { STATUTS, CATEGORIES, libelleStatut, pluriel, aujourdhuiFr, frVersIso, isoVersFr, csvEntrees, telechargerCsv } from './commun'

// Feuille du bas (au centre sur ordinateur) et ligne de menu, communes aux actions groupées
function Feuille({ titre, onFermer, children }) {
  return (
    <>
      <div className="feuille-fond" style={{ zIndex: 960 }} onClick={onFermer} />
      <div className="feuille bas lot" style={{ zIndex: 961 }} role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">{children}</div>
      </div>
    </>
  )
}
function Ligne({ onClick, children, classe = '', aide }) {
  return (
    <button className={`ligne ${classe}`} style={{ minHeight: 52 }} onClick={onClick}>
      <span className="txt"><span className="t1" style={{ fontWeight: 500, color: 'inherit' }}>{children}</span>{aide && <div className="t2">{aide}</div>}</span>
    </button>
  )
}

// Barre de la sélection multiple (en bas de l'écran) : seules les actions courantes y restent
// (nombre, Changer le statut, Pointer pour la Direction, Tout sélectionner, Annuler) ; les autres sont dans « Plus ».
// Chaque modification demande une confirmation rappelant le nombre d'entrées, puis propose « Annuler » dans le message.
export default function ActionsSelection({ sel, entrees, filtrees, estDirection, estPointe, onPointer, onToast, onToutSelectionner, onFin }) {
  const { season, seasons } = useSeason()
  const [feuille, setFeuille] = useState(null)      // null | 'statut' | 'plus' | 'date' | 'categorie' | 'magasin' | 'saison'
  const [modif, setModif]     = useState(null)      // modification à confirmer : { champ, valeur, titre, texte, message }
  const [dateIso, setDateIso] = useState(() => frVersIso(aujourdhuiFr()))
  const [magasins, setMagasins] = useState(null)
  const [suppr, setSuppr]     = useState(null)      // confirmation de suppression : { lignes, bloquees, lies }
  const [tape, setTape]       = useState('')        // nombre à retaper au-delà de 5 entrées

  const n = sel.size
  const choisies = () => entrees.filter(e => sel.has(e.id))
  const toutSelectionne = filtrees.length > 0 && filtrees.every(e => sel.has(e.id))
  const entreesN = pluriel(n, 'entrée')

  // ── Modifications groupées (statut, date, catégorie, magasin, saison), avec « Annuler » qui remet les valeurs d'avant ──
  async function modifierLot(champ, valeur, message, ids) {
    const toutes = choisies().filter(e => !ids || ids.includes(e.id)); if (!toutes.length) return
    // Plan C, étape 3 : une réception rattachée à une commande garde sa date, son magasin et sa saison (corrigée une par une)
    const gardees = ['date', 'magasinId', 'season'].includes(champ) ? toutes.filter(e => e.commandeId) : []
    const lignes = toutes.filter(e => !gardees.includes(e))
    if (!lignes.length) { setFeuille(null); setModif(null); onToast({ texte: `${pluriel(gardees.length, 'réception')} rattachée${gardees.length > 1 ? 's' : ''} à une commande : à corriger une par une (« Modifier »).` }); onFin(); return }
    const avant = lignes.map(e => [e.id, e[champ] ?? ''])
    setFeuille(null); setModif(null)
    let echecs = 0
    for (const e of lignes) { try { await db.entrees.update(e.id, { [champ]: valeur }) } catch { echecs++ } }
    onToast(echecs ? { texte: `${lignes.length - echecs} entrée(s) modifiée(s), ${echecs} en échec : vérifie la connexion.` }
      : { texte: `${message} — ${pluriel(lignes.length, 'entrée')}${gardees.length ? ` (${pluriel(gardees.length, 'réception')} rattachée${gardees.length > 1 ? 's' : ''} à une commande laissée${gardees.length > 1 ? 's' : ''} telle${gardees.length > 1 ? 's' : ''} quelle${gardees.length > 1 ? 's' : ''})` : ''}`,
          annuler: async () => { for (const [id, v] of avant) { try { await db.entrees.update(id, { [champ]: v }) } catch { /* ignore */ } } } })
    onFin()
  }
  // Protection des avoirs (13/10) : les lignes « Retour » portent les avoirs du Plan de règlement.
  // - la confirmation annonce combien de retours sont concernés (statut, date, magasin, saison les retirent ou les déplacent) ;
  // - compte magasin : les retours liés à un défectueux sont exclus des changements groupés de statut et de date.
  const avertRetours = (nb, verbe) => nb ? `Dont ${pluriel(nb, 'retour')} : cela ${verbe} ${pluriel(nb, 'avoir')} du Plan de règlement.` : ''
  async function demander(champ, valeur, titre, texte, message, direct = false) {
    setFeuille(null)
    const lignes = choisies()
    let exclues = []
    if (!estDirection && (champ === 'statut' || champ === 'date')) {
      const retours = lignes.filter(e => e.statut === 'Retour')
      if (retours.length) {
        const lies = new Set((await db.defectueux.toArray().catch(() => [])).map(d => d.entreeId).filter(Boolean))
        exclues = retours.filter(e => lies.has(e.id))
      }
    }
    const gardees = lignes.filter(e => !exclues.includes(e))
    const touchePlan = champ === 'date' || champ === 'magasinId' || champ === 'season' || (champ === 'statut' && valeur !== 'Retour')
    const nbRetours = touchePlan ? gardees.filter(e => e.statut === 'Retour' && e[champ] !== valeur).length : 0
    const exclu = exclues.length ? `${pluriel(exclues.length, 'retour')} lié${exclues.length > 1 ? 's' : ''} à un défectueux ne ${exclues.length > 1 ? 'seront' : 'sera'} pas modifié${exclues.length > 1 ? 's' : ''} : seule la Direction peut changer ${exclues.length > 1 ? 'leur' : 'sa'} ${champ === 'date' ? 'date' : 'statut'}.` : ''
    if (!gardees.length) { setModif({ impossible: true, titre: 'Modification impossible', texte: exclu }); return }
    if (direct && !exclu && !nbRetours) { modifierLot(champ, valeur, message); return }   // statut sans retour : un toucher, comme avant
    setModif({ champ, valeur, titre: gardees.length !== lignes.length ? titre.replace(entreesN, pluriel(gardees.length, 'entrée')) : titre, texte, message, ids: gardees.map(e => e.id),
      avert: [exclu, avertRetours(nbRetours, champ === 'statut' ? 'retirera' : 'déplacera')].filter(Boolean) })
  }

  async function ouvrirMagasins() {
    setFeuille('magasin')
    if (!magasins) { try { setMagasins((await db.magasins.toArray()).sort((a, b) => a.nom.localeCompare(b.nom))) } catch { setMagasins([]) } }
  }

  // ── Copier un récapitulatif (marque, modèle, paires), regroupé par modèle ──
  async function copierRecap() {
    setFeuille(null)
    const groupes = new Map()
    for (const e of choisies()) {
      const k = `${e.marque}\u0000${e.modele || ''}\u0000${e.statut === 'Retour' ? 'r' : ''}`
      const g = groupes.get(k) || { marque: e.marque, modele: e.modele || 'sans modèle', retour: e.statut === 'Retour', paires: 0 }
      g.paires += Number(e.total) || 0; groupes.set(k, g)
    }
    const lignes = [...groupes.values()].sort((a, b) => a.marque.localeCompare(b.marque) || a.modele.localeCompare(b.modele))
    const total = lignes.reduce((t, g) => t + g.paires, 0)
    const texte = [`Récapitulatif : ${entreesN} · ${pluriel(total, 'paire')}`, '',
      ...lignes.map(g => `${g.marque} · ${g.modele} : ${pluriel(g.paires, 'paire')}${g.retour ? ' (retour)' : ''}`)].join('\n')
    try { await navigator.clipboard.writeText(texte) }
    catch {
      const t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select()
      try { document.execCommand('copy') } catch { /* ignore */ } t.remove()
    }
    onToast({ texte: `Récapitulatif copié (${entreesN}) : colle-le dans un mail ou un message` })
  }

  // ── Exporter la sélection en CSV (Direction) : une ligne par entrée, lisible dans Excel ──
  function exporterCsv() {
    setFeuille(null)
    telechargerCsv(csvEntrees(choisies(), estPointe), `entrees-${season}-${frVersIso(aujourdhuiFr())}.csv`)
    onToast({ texte: `Export CSV téléchargé (${entreesN})` })
  }

  // ── Suppression en lot. Protections : détail, nombre à retaper au-delà de 5 entrées,
  // entrées pointées exclues pour un compte magasin, « Annuler » pendant 10 s (remet les lignes avec leur numéro d'origine) ──
  async function preparerSuppression() {
    setFeuille(null)
    const lignesSel = choisies()
    const bloquees = estDirection ? [] : lignesSel.filter(e => estPointe(e))
    const lignes = lignesSel.filter(e => !bloquees.includes(e))
    let lies = 0
    try { const ids = new Set(lignes.map(e => e.id)); lies = (await db.defectueux.toArray()).filter(d => ids.has(d.entreeId)).length } catch { /* simple information */ }
    setTape(''); setSuppr({ lignes, bloquees, lies })
  }
  async function supprimerSel() {
    const { lignes } = suppr; setSuppr(null)
    const faites = []
    for (const e of lignes) { try { await db.entrees.delete(e.id); faites.push(e) } catch { /* compté en échec */ } }
    const echecs = lignes.length - faites.length
    // Copie exacte des lignes supprimées (sans les noms ajoutés pour l'affichage), pour pouvoir les remettre
    // (champs d'affichage ajoutés par Cahier.jsx : noms, société, famille et repères de commande du plan C — absents de la table)
    const copies = faites.map(e => { const brut = { ...e }; for (const k of ['magasin', 'marque', 'societe', 'famille', 'commandeBc', 'horsCommande']) delete brut[k]; return brut })
    const remettre = async () => {
      let ko = 0
      for (const c of copies) { try { await db.entrees.put(c) } catch { ko++ } }
      onToast(ko ? { texte: `${ko} entrée(s) n'ont pas pu être remises : vérifie la connexion.` } : { texte: `${pluriel(copies.length, 'entrée')} remise${copies.length > 1 ? 's' : ''}` })
    }
    onToast(echecs ? { texte: `${pluriel(faites.length, 'entrée')} supprimée(s), ${echecs} en échec : vérifie la connexion.`, annuler: faites.length ? remettre : undefined, duree: 10000 }
      : { texte: `${pluriel(faites.length, 'entrée')} supprimée${faites.length > 1 ? 's' : ''}`, annuler: remettre, duree: 10000 })
    onFin()
  }

  const nomSaison = id => seasons.find(s => s.id === id)?.label || id

  return (
    <>
      <div className="barre-selection" role="toolbar" aria-label="Actions sur la sélection">
        <b className="compte-selection" aria-label={n ? `${n} ${n > 1 ? 'sélectionnées' : 'sélectionnée'}` : 'Aucune entrée sélectionnée'}>{n ? <>{n}<span className="long"> {n > 1 ? 'sélectionnées' : 'sélectionnée'}</span></> : <span className="long">Touche les lignes à sélectionner</span>}{!n && <span className="court">0</span>}</b>
        <div className="actions-selection">
          <button className="btn btn-prim" disabled={!n} onClick={() => setFeuille('statut')}><span className="long">Changer le statut</span><span className="court">Statut</span></button>
          {estDirection && <button className="btn" disabled={!n} onClick={() => { onPointer([...sel], true); onFin() }}>Pointer</button>}
          <button className="btn" onClick={onToutSelectionner}>{toutSelectionne ? <><span className="long">Tout désélectionner</span><span className="court">Aucune</span></> : <><span className="long">Tout sélectionner ({filtrees.length})</span><span className="court">Tout</span></>}</button>
          <button className="btn" disabled={!n} onClick={() => setFeuille('plus')} aria-label="Plus d'actions">Plus<span className="icone-plus"><Icone nom="bas" taille={16} /></span></button>
        </div>
        <button className="btn btn-ghost annuler-selection long-flex" onClick={onFin}>Annuler</button>
        <button className="icone-btn annuler-selection court-flex" onClick={onFin} aria-label="Annuler la sélection"><Icone nom="fermer" /></button>
      </div>

      {feuille === 'statut' && (
        <Feuille onFermer={() => setFeuille(null)} titre={`Statut de ${entreesN}`}>
          <div className="liste" style={{ background: 'var(--carte-2)' }}>
            {STATUTS.map(st => (
              <button key={st || 'aucun'} className="ligne" style={{ minHeight: 52 }} onClick={() => demander('statut', st, `Changer le statut de ${entreesN} ?`, `Nouveau statut : ${libelleStatut(st)}.`, `Statut « ${libelleStatut(st)} » appliqué`, true)}>
                <span className="txt">{st ? <Statut s={st} /> : <span className="t1" style={{ fontWeight: 500 }}>Aucun (vider le statut)</span>}</span>
              </button>
            ))}
          </div>
        </Feuille>
      )}

      {feuille === 'plus' && (
        <Feuille onFermer={() => setFeuille(null)} titre={`Actions sur ${entreesN}`}>
          <div className="liste" style={{ background: 'var(--carte-2)' }}>
            <Ligne onClick={() => setFeuille('date')}>Changer la date</Ligne>
            <Ligne onClick={() => setFeuille('categorie')}>Changer la catégorie</Ligne>
            <Ligne onClick={copierRecap} aide="Marque, modèle et paires, à coller dans un mail ou un message">Copier le récapitulatif</Ligne>
          </div>
          {estDirection && <>
            <span className="etiquette" style={{ marginTop: 16 }}>Direction</span>
            <div className="liste" style={{ background: 'var(--carte-2)' }}>
              <Ligne onClick={() => { setFeuille(null); onPointer([...sel], false); onFin() }}>Dépointer</Ligne>
              <Ligne onClick={ouvrirMagasins}>Changer le magasin</Ligne>
              <Ligne onClick={() => setFeuille('saison')}>Changer de saison</Ligne>
              <Ligne onClick={exporterCsv} aide="Fichier lisible dans Excel, une ligne par entrée">Exporter en CSV</Ligne>
            </div>
          </>}
          <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 24 }}>
            <Ligne classe="ligne-danger" onClick={preparerSuppression}>Supprimer {entreesN}</Ligne>
          </div>
        </Feuille>
      )}

      {feuille === 'date' && (
        <Feuille onFermer={() => setFeuille(null)} titre={`Date de ${entreesN}`}>
          <label className="etiquette">Nouvelle date
            <input className="champ" type="date" value={dateIso} onChange={e => setDateIso(e.target.value)} /></label>
          <button className="btn btn-prim" style={{ marginTop: 16, width: '100%' }} disabled={!dateIso}
            onClick={() => { const fr = isoVersFr(dateIso); demander('date', fr, `Changer la date de ${entreesN} ?`, `Nouvelle date : ${fr}.`, `Date changée pour le ${fr}`) }}>Continuer</button>
        </Feuille>
      )}

      {feuille === 'categorie' && (
        <Feuille onFermer={() => setFeuille(null)} titre={`Catégorie de ${entreesN}`}>
          <div className="liste" style={{ background: 'var(--carte-2)' }}>
            {CATEGORIES.map(c => <Ligne key={c} onClick={() => demander('categorie', c, `Changer la catégorie de ${entreesN} ?`, `Nouvelle catégorie : ${c}. La grille de pointures de chaque entrée ne change pas.`, `Catégorie « ${c} » appliquée`)}>{c}</Ligne>)}
          </div>
        </Feuille>
      )}

      {feuille === 'magasin' && (
        <Feuille onFermer={() => setFeuille(null)} titre={`Magasin de ${entreesN}`}>
          {!magasins ? <div className="vide" style={{ padding: 16 }}>Chargement…</div> : (
            <div className="liste" style={{ background: 'var(--carte-2)' }}>
              {magasins.map(m => <Ligne key={m.id} onClick={() => demander('magasinId', m.id, `Changer le magasin de ${entreesN} ?`, `Nouveau magasin : ${m.nom}. Les paires seront comptées dans ce magasin (suivi des livraisons, plan de règlement).`, `Magasin « ${m.nom} » appliqué`)}>{m.nom}</Ligne>)}
            </div>
          )}
        </Feuille>
      )}

      {feuille === 'saison' && (
        <Feuille onFermer={() => setFeuille(null)} titre={`Saison de ${entreesN}`}>
          <div className="liste" style={{ background: 'var(--carte-2)' }}>
            {seasons.filter(s => s.id !== season).map(s => <Ligne key={s.id} onClick={() => demander('season', s.id, `Changer la saison de ${entreesN} ?`, `${entreesN} passeront dans la saison ${s.label} et disparaîtront de la liste de la saison ${nomSaison(season)}.`, `Déplacées dans la saison ${s.label}`)}>{s.label}</Ligne>)}
            {seasons.length < 2 && <div className="vide" style={{ padding: 16 }}>Aucune autre saison.</div>}
          </div>
        </Feuille>
      )}

      {modif && (modif.impossible
        ? <Confirmation titre={modif.titre} texte={modif.texte} confirmer="Compris" annuler="Fermer" onConfirmer={() => setModif(null)} onAnnuler={() => setModif(null)} />
        : <Confirmation titre={modif.titre} texte={modif.texte} confirmer="Appliquer" onAnnuler={() => setModif(null)}
            onConfirmer={() => modifierLot(modif.champ, modif.valeur, modif.message, modif.ids)}>
            {modif.avert?.map(a => <div key={a} className="encart att" style={{ marginBottom: 12 }}>{a}</div>)}
          </Confirmation>)}

      {suppr && (() => {
        const nb = suppr.lignes.length, paires = suppr.lignes.reduce((t, e) => t + (Number(e.total) || 0), 0)
        const aTaper = nb > 5
        const bloq = suppr.bloquees.length ? `${pluriel(suppr.bloquees.length, 'entrée')} déjà pointée${suppr.bloquees.length > 1 ? 's' : ''} par la Direction ne ${suppr.bloquees.length > 1 ? 'seront' : 'sera'} pas supprimée${suppr.bloquees.length > 1 ? 's' : ''}. ` : ''
        if (!nb) return <Confirmation titre="Suppression impossible" texte={`${bloq}Seule la Direction peut supprimer une entrée pointée.`} confirmer="Compris" annuler="Fermer" onConfirmer={() => setSuppr(null)} onAnnuler={() => setSuppr(null)} />
        return (
          <Confirmation danger titre={`Supprimer ${pluriel(nb, 'entrée')} ?`} confirmer="Supprimer" actif={!aTaper || tape.trim() === String(nb)}
            texte={`${pluriel(nb, 'entrée')} · ${pluriel(paires, 'paire')} au total. ${bloq}`} onAnnuler={() => setSuppr(null)} onConfirmer={supprimerSel}>
            {suppr.lignes.some(e => e.statut === 'Retour') && <div className="encart att" style={{ marginBottom: 12 }}>{avertRetours(suppr.lignes.filter(e => e.statut === 'Retour').length, 'retirera')}</div>}
            <ul className="liste-resume">
              {suppr.lignes.slice(0, 5).map(e => <li key={e.id}><span>{e.marque} · {e.modele || 'sans modèle'}</span><span>{e.date} · {e.total || 0} p.</span></li>)}
              {nb > 5 && <li><span>… et {pluriel(nb - 5, 'autre entrée')}</span><span /></li>}
            </ul>
            {suppr.lies > 0 && <div className="encart att" style={{ marginBottom: 14 }}>{suppr.lies > 1 ? `${suppr.lies} défectueux sont liés` : 'Un défectueux est lié'} à ces entrées : {suppr.lies > 1 ? 'ils resteront' : 'il restera'} dans la Gestion des défectueux.</div>}
            {aTaper && <label className="champ-confirmer" style={{ display: 'block' }}>
              <span className="etiquette">Pour confirmer, tape le nombre d'entrées : <b>{nb}</b></span>
              <input className="champ" inputMode="numeric" autoFocus value={tape} onChange={ev => setTape(ev.target.value)} aria-label="Nombre d'entrées à supprimer" />
            </label>}
          </Confirmation>
        )
      })()}
    </>
  )
}

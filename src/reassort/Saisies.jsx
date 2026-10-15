import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import { supabase } from '../lib/supabase'
import { useSeason } from '../context/SeasonContext'
import { SIZE_TYPES, DEFAULT_GRID_BY_MARQUE } from '../data/sizes'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { ChoixMarque, ChoixModele, ChoixSalarie } from '../savdef/Champs'
import { memeMagasin } from '../commandes/constants'
import { CATEGORIES, CAT_TO_KEY, ETAPES_CHOIX, sortSizes, cleanStock, resteParPointure, todayFr, etatPointure } from './constants'

const KEY_TO_CAT = Object.fromEntries(Object.entries(CAT_TO_KEY).map(([c, k]) => [k, c]))
const num = v => parseInt(v) || 0

// Fenêtre commune (plein écran sur téléphone, au centre sur ordinateur)
function Feuille({ titre, onFermer, pied, children }) {
  return (
    <>
      <div className="feuille-fond" onClick={onFermer} />
      <div className="feuille saisie-sav" role="dialog" aria-label={titre}>
        <div className="feuille-entete"><h2>{titre}</h2><button className="icone-btn" onClick={onFermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">{children}</div>
        {pied && <div className="feuille-pied">{pied}</div>}
      </div>
    </>
  )
}

// Grille des pointures : toucher une pointure la suit / ne la suit plus ; une pointure suivie montre son stock (rupture en rouge)
export function GrillePointures({ tailles, suivies, stock, cible = 1, onBasculer, onStock, enCommande = {} }) {
  return (
    <div className="grille-stock">
      {tailles.map(s => {
        const suivie = suivies.includes(s)
        const etat = suivie ? etatPointure({ stock: Object.fromEntries(Object.entries(stock).map(([k, v]) => [k, num(v)])), cible }, s, enCommande) : null
        return (
          <div key={s} className={`case-stock ${etat || 'non-suivie'}`}>
            <button type="button" onClick={() => onBasculer?.(s)} disabled={!onBasculer} title={onBasculer ? (suivie ? 'Ne plus suivre cette pointure' : 'Suivre cette pointure') : undefined}>{s}</button>
            {suivie && onStock && <input type="number" min="0" inputMode="numeric" value={stock[s] ?? '0'} onFocus={e => e.target.select()} onChange={e => onStock(s, e.target.value)} aria-label={`Stock ${s}`} />}
            {suivie && !onStock && <b>{num(stock[s])}{enCommande[s] ? <small> +{enCommande[s]}</small> : null}</b>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Fiche d'un top modèle (création / modification), mêmes champs et même pré-remplissage que l'outil actuel ───
export function SaisieTop({ top, magasinId, onFermer, onToast }) {
  const modif = !!top?.id
  const { season } = useSeason()
  const fournisseurs = useLiveQuery(() => db.fournisseurs.orderBy('nom').toArray(), [])
  const [f, setF] = useState({ fournisseurId: top?.fournisseurId || '', modele: top?.modele ?? '', numero: top?.numero ?? '', categorie: top?.categorie ?? '', typeKey: top?.typeKey ?? 'F', cible: top?.cible ?? 1, note: top?.note ?? '' })
  const [suivies, setSuivies] = useState(top?.pointures ?? [])
  const [stock, setStock] = useState(() => Object.fromEntries(Object.entries(top?.stock || {}).map(([k, v]) => [k, String(v)])))
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [initial] = useState(() => JSON.stringify([f, suivies, stock]))
  const [confirmFermer, setConfirmFermer] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const fournisseur = (fournisseurs || []).find(x => x.id === Number(f.fournisseurId))
  const modeles = useMemo(() => { const s = new Set(); Object.values(fournisseur?.modelesBySeason || {}).forEach(a => (a || []).forEach(m => s.add(m))); return [...s].sort() }, [fournisseur])

  // Pré-remplissage à la sélection d'un modèle (création) : grille, pointures, N°, catégorie
  useEffect(() => {
    if (modif || !f.fournisseurId || !f.modele) return
    let actif = true
    const fId = Number(f.fournisseurId)
    Promise.all([
      db.parametres.where({ fournisseurId: fId, magasinId }).filter(p => p.season === season).first(),
      db.entrees.where('fournisseurId').equals(fId).and(e => e.modele === f.modele && e.statut !== 'Retour').toArray(),
    ]).then(([param, lignes]) => {
      if (!actif) return
      const miennes = lignes.filter(e => e.magasinId === magasinId), src = miennes.length ? miennes : lignes, dern = src[src.length - 1]
      const tk = param?.modelesTypes?.[f.modele] || dern?.typeKey || DEFAULT_GRID_BY_MARQUE[(fournisseur?.nom || '').toLowerCase()] || f.typeKey
      let ps = Object.keys(param?.modelesSizes?.[f.modele] || {})
      if (!ps.length) { const s = new Set(); src.forEach(e => Object.entries(e.sizes || {}).forEach(([k, v]) => { if (v > 0) s.add(k) })); ps = [...s] }
      const grille = SIZE_TYPES[tk]?.sizes || []
      setSuivies(sortSizes(ps.filter(p => grille.includes(p))))
      setF(x => ({ ...x, typeKey: tk, numero: dern?.numero || x.numero, categorie: dern?.categorie || x.categorie || KEY_TO_CAT[tk] || '' }))
    })
    return () => { actif = false }
  }, [f.fournisseurId, f.modele]) // eslint-disable-line react-hooks/exhaustive-deps

  async function ajouterModele(nom) {
    const ex = fournisseur?.modelesBySeason || {}, arr = ex[season] || []
    if (!arr.includes(nom)) await db.fournisseurs.update(fournisseur.id, { modelesBySeason: { ...ex, [season]: [...arr, nom] } })
  }
  const grille = SIZE_TYPES[f.typeKey]?.sizes || []
  const cible = Math.max(1, num(f.cible))
  const commencee = JSON.stringify([f, suivies, stock]) !== initial
  const fermer = () => { if (commencee && !enCours) setConfirmFermer(true); else onFermer() }

  async function enregistrer() {
    if (!f.fournisseurId) return setErreur('Choisis la marque.')
    if (!f.modele) return setErreur('Choisis le modèle.')
    if (!suivies.length) return setErreur('Choisis au moins une pointure à suivre.')
    setEnCours(true); setErreur('')
    try {
      const propre = cleanStock(stock, suivies)
      const change = JSON.stringify(propre) !== JSON.stringify(top?.stock || {})
      const donnees = { fournisseurId: Number(f.fournisseurId), modele: f.modele, numero: f.numero, categorie: f.categorie, typeKey: f.typeKey, cible, note: f.note, pointures: suivies, stock: propre, ...(change ? { stockAt: new Date().toISOString() } : {}) }
      if (modif) await db.topModeles.update(top.id, donnees)
      else await db.topModeles.add({ ...donnees, magasinId, season })
      onToast?.({ texte: modif ? 'Fiche modifiée' : 'Top modèle ajouté' }); onFermer()
    } catch (err) { setEnCours(false); setErreur('Enregistrement impossible : ' + (err.message || 'vérifie la connexion et réessaie.')) }
  }

  return (
    <>
      <Feuille titre={modif ? 'Modifier la fiche' : 'Nouveau top modèle'} onFermer={fermer}
        pied={<><span className="total" /><button className="btn btn-prim" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : modif ? 'Enregistrer' : 'Ajouter le top modèle'}</button></>}>
        <span className="etiquette" style={{ marginTop: 0 }}>Marque</span>
        <ChoixMarque fournisseurs={fournisseurs || []} valeurId={f.fournisseurId} onErreur={setErreur} onChoisir={id => setF(x => ({ ...x, fournisseurId: id, modele: x.fournisseurId === id ? x.modele : '' }))} />
        <span className="etiquette">Modèle</span>
        <ChoixModele key={'m' + f.fournisseurId} modeles={modeles} valeur={f.modele} desactive={!f.fournisseurId} onChoisir={m => set('modele', m)} onAjouter={ajouterModele} />
        <div className="deux-champs">
          <label className="etiquette">N°<input className="champ" value={f.numero} onChange={e => set('numero', e.target.value)} placeholder="Référence" inputMode="numeric" /></label>
          <label className="etiquette" title="En dessous de ce stock, la pointure est en rupture">Stock mini par pointure<input className="champ" type="number" min="1" value={f.cible} onChange={e => set('cible', e.target.value)} /></label>
        </div>
        <span className="etiquette">Catégorie</span>
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.filter(Boolean).map(c => <button key={c} type="button" className="chip" aria-pressed={f.categorie === c} onClick={() => setF(x => ({ ...x, categorie: x.categorie === c ? '' : c, typeKey: x.categorie === c ? x.typeKey : (CAT_TO_KEY[c] ?? x.typeKey) }))}>{c}</button>)}
        </div>
        <label className="etiquette">Grille de pointures
          <select className="champ" value={f.typeKey} onChange={e => { set('typeKey', e.target.value); setSuivies([]) }}>
            {Object.entries(SIZE_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select></label>
        <span className="etiquette">Pointures suivies et stock actuel <span className="aide">— touche une pointure pour la suivre</span></span>
        <GrillePointures tailles={grille} suivies={suivies} stock={stock} cible={cible}
          onBasculer={s => setSuivies(p => p.includes(s) ? p.filter(x => x !== s) : sortSizes([...p, s]))} onStock={(s, v) => setStock(x => ({ ...x, [s]: v }))} />
        <label className="etiquette">Note<textarea className="champ" rows={2} value={f.note} onChange={e => set('note', e.target.value)} /></label>
        {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
      </Feuille>
      {confirmFermer && <Confirmation danger titre="Abandonner la saisie ?" texte="Les changements ne seront pas enregistrés." confirmer="Abandonner" annuler="Continuer la saisie" onAnnuler={() => setConfirmFermer(false)} onConfirmer={() => { setConfirmFermer(false); onFermer() }} />}
    </>
  )
}

// ─── Saisie rapide du stock (pointures suivies) ───
export function SaisieStock({ top, onFermer, onToast }) {
  const [stock, setStock] = useState(() => Object.fromEntries(Object.entries(top.stock || {}).map(([k, v]) => [k, String(v)])))
  const [enCours, setEnCours] = useState(false)
  async function enregistrer() {
    setEnCours(true)
    const avant = { stock: top.stock || {}, stockAt: top.stockAt || null }
    try { await db.topModeles.update(top.id, { stock: cleanStock(stock, top.pointures || []), stockAt: new Date().toISOString() }); onToast?.({ texte: 'Stock enregistré', annuler: () => db.topModeles.update(top.id, avant) }); onFermer() }
    catch (e) { setEnCours(false); onToast?.({ texte: 'Enregistrement impossible : ' + e.message }) }
  }
  return (
    <Feuille titre={`Stock — ${top.modele}`} onFermer={onFermer} pied={<><span className="total" /><button className="btn btn-prim" onClick={enregistrer} disabled={enCours}>Enregistrer le stock</button></>}>
      <p style={{ marginTop: 0 }}>Combien de paires reste-t-il en magasin, par pointure ?</p>
      <GrillePointures tailles={top.pointures || []} suivies={top.pointures || []} stock={stock} cible={top.cible || 1} onStock={(s, v) => setStock(x => ({ ...x, [s]: v }))} />
    </Feuille>
  )
}

// ─── Nouveau réassort / modification (quantités proposées = stock mini − stock − déjà en commande) ───
export function SaisieReassort({ top, reassort, proposition = {}, enCommande = {}, magasinNom, onFermer, onToast, suivie = false, avecPrix = true }) {
  const modif = !!reassort?.id
  const { season } = useSeason()
  const salaries = useLiveQuery(() => db.salaries.orderBy('nom').toArray(), [])
  const init = modif ? reassort.sizes : proposition
  const [qtes, setQtes] = useState(() => Object.fromEntries((top.pointures || []).map(s => [s, init?.[s] ? String(init[s]) : ''])))
  const [etape, setEtape] = useState('À réassortir')
  const [par, setPar] = useState(reassort?.par ?? '')
  const [note, setNote] = useState(reassort?.note ?? '')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [confirmSuppr, setConfirmSuppr] = useState(false)
  const [prix, setPrix] = useState(reassort?.prixUnitaire ? String(reassort.prixUnitaire).replace('.', ',') : '')
  // Saison suivie par commandes (étape 6) : prix repris du même modèle-coloris dans la commande de saison (null = pas trouvé)
  const prixCommande = useLiveQuery(async () => {
    if (!suivie) return null
    const [code, ...reste] = String(top.modele || '').split(','), couleur = reste.join(',').trim()
    const { data } = await supabase.rpc('prix_article_reassort', { p_fournisseur: top.fournisseurId, p_magasin: top.magasinId, p_season: top.season || season, p_code: code.trim(), p_couleur: couleur, p_taille: (top.pointures || [])[0] || '' })
    return data != null ? Number(data) : null
  }, [suivie, top.id])
  const total = Object.values(qtes).reduce((t, v) => t + num(v), 0)
  const salariesMag = (salaries || []).filter(s => !s.magasin || memeMagasin(s.magasin, magasinNom))
  // Déjà en commande, sans compter ce réassort-ci (en modification)
  const autres = { ...enCommande }
  if (modif) Object.entries(reassort.sizes || {}).forEach(([s, q]) => { autres[s] = Math.max(0, (autres[s] || 0) - (q - (reassort.recu?.[s] || 0))) })

  async function enregistrer() {
    if (!total) return setErreur('Saisis au moins une quantité.')
    setEnCours(true); setErreur('')
    try {
      const sizes = {}; Object.entries(qtes).forEach(([s, v]) => { if (num(v) > 0) sizes[s] = num(v) })
      const prixUnitaire = suivie && avecPrix && prixCommande == null ? (parseFloat(String(prix).replace(',', '.')) || null) : (reassort?.prixUnitaire ?? null)
      if (modif) await db.reassorts.update(reassort.id, { sizes, par, note, ...(suivie ? { prixUnitaire } : {}) })
      else await db.reassorts.add({ topId: top.id, magasinId: top.magasinId, fournisseurId: top.fournisseurId, modele: top.modele, season: top.season || season, statut: etape, sizes, recu: {}, receptions: [], par, note, etapes: { [etape]: new Date().toISOString() }, ...(suivie ? { prixUnitaire } : {}) })
      onToast?.({ texte: modif ? 'Réassort modifié' : `Réassort lancé : ${total} paire${total > 1 ? 's' : ''}` }); onFermer()
    } catch (e) { setEnCours(false); setErreur('Enregistrement impossible : ' + (e.message || 'vérifie la connexion et réessaie.')) }
  }
  async function supprimer() {
    setConfirmSuppr(false)
    try { await db.reassorts.delete(reassort.id); onToast?.({ texte: 'Réassort supprimé' }); onFermer() } catch (e) { setErreur('Suppression impossible : ' + e.message) }
  }
  return (
    <>
      <Feuille titre={`${modif ? 'Modifier le réassort' : 'Nouveau réassort'} — ${top.modele}`} onFermer={onFermer}
        pied={<>{modif && <button className="btn btn-danger" onClick={() => setConfirmSuppr(true)}>Supprimer</button>}<span className="total"><b>{total} paire{total > 1 ? 's' : ''}</b></span>
          <button className="btn btn-prim" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : modif ? 'Enregistrer' : 'Lancer le réassort'}</button></>}>
        <span className="etiquette" style={{ marginTop: 0 }}>Quantités à commander {!modif && <span className="aide">— proposées : stock mini − stock − déjà en commande</span>}</span>
        <div className="grille-stock">
          {(top.pointures || []).map(s => {
            const e = etatPointure(top, s, autres)
            return (
              <div key={s} className={`case-stock ${e}`}>
                <button type="button" disabled>{s}</button>
                <input type="number" min="0" inputMode="numeric" value={qtes[s] ?? ''} onFocus={ev => ev.target.select()} onChange={ev => setQtes(x => ({ ...x, [s]: ev.target.value }))} aria-label={`Quantité ${s}`} />
                <small>stock {top.stock?.[s] ?? 0}{autres[s] ? ` +${autres[s]}` : ''}</small>
              </div>
            )
          })}
        </div>
        {!modif && <>
          <span className="etiquette">Étape</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>{ETAPES_CHOIX.map(x => <button key={x} type="button" className="chip" aria-pressed={etape === x} onClick={() => setEtape(x)}>{x}</button>)}</div>
        </>}
        {suivie && (prixCommande != null
          ? <div className="aide" style={{ marginTop: 12 }}>Prix repris de la commande de saison : <b>{prixCommande.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</b> la paire.</div>
          : prixCommande === null && avecPrix && <>
            {!(parseFloat(String(prix).replace(',', '.')) > 0) && <div className="encart att" style={{ marginTop: 12 }}>Ce modèle n’est pas dans la commande de saison : sans prix, la réception sera à 0 € dans le Cahier et le Plan de règlement.</div>}
            <label className="etiquette">Prix unitaire HT (€, facultatif)<input className="champ" inputMode="decimal" value={prix} onChange={e => setPrix(e.target.value)} placeholder="Ex. 42,50" /></label>
          </>)}
        {suivie && <div className="aide" style={{ marginTop: 8 }}>Dès qu’il est demandé, le réassort devient une commande de réassort (Commandes fournisseurs) ; sa réception passe par la saisie commune.</div>}
        <span className="etiquette">Demandé par</span>
        <ChoixSalarie valeur={par} onChange={setPar} salaries={salariesMag} />
        <label className="etiquette">Note<textarea className="champ" rows={2} value={note} onChange={e => setNote(e.target.value)} /></label>
        {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
      </Feuille>
      {confirmSuppr && <Confirmation danger titre="Supprimer ce réassort ?" texte="Les entrées déjà créées dans le Cahier par ses réceptions restent." confirmer="Supprimer" onAnnuler={() => setConfirmSuppr(false)} onConfirmer={supprimer} />}
    </>
  )
}

// ─── Réception (totale ou partielle) : crée l'entrée « Réassort » dans le Cahier (mêmes règles que l'outil actuel) ───
export function SaisieReception({ top, reassort, magasinNom, onFermer, onToast }) {
  const reste = resteParPointure(reassort)
  const tailles = sortSizes(Object.keys(reste))
  const [qtes, setQtes] = useState(() => Object.fromEntries(tailles.map(s => [s, String(reste[s])])))
  const [majStock, setMajStock] = useState(true)
  const [prixManuel, setPrixManuel] = useState('')
  const [unitCalc, setUnitCalc] = useState(null)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [fait, setFait] = useState(null)
  const total = Object.values(qtes).reduce((t, x) => t + num(x), 0)
  useEffect(() => {
    let actif = true
    db.parametres.where({ fournisseurId: reassort.fournisseurId, magasinId: reassort.magasinId }).filter(p => p.season === reassort.season).first()
      .then(p => { if (!actif) return; const q = p?.modeles?.[reassort.modele], px = p?.prixModeles?.[reassort.modele]; setUnitCalc(q > 0 && px > 0 ? px / q : 0) })
    return () => { actif = false }
  }, [reassort.fournisseurId, reassort.magasinId, reassort.season, reassort.modele])
  const tape = parseFloat(String(prixManuel).replace(',', '.')) || 0

  async function valider() {
    if (!total) return setErreur('Aucune quantité reçue.')
    setEnCours(true); setErreur('')
    try {
      const recuNow = {}; Object.entries(qtes).forEach(([s, x]) => { if (num(x) > 0) recuNow[s] = num(x) })
      // Prix : prix du modèle (achats), sinon le prix tapé quand le prix du modèle manque, sinon 0 € (pas de repli sur le prix moyen, comme le Cahier)
      const unit = unitCalc > 0 ? unitCalc : (tape > 0 ? tape : 0)
      const pht = Math.round(unit * total * 100) / 100
      const entreeId = await db.entrees.add({ statut: 'Réassort', magasinId: reassort.magasinId, fournisseurId: reassort.fournisseurId, date: todayFr(), modele: reassort.modele,
        numero: top?.numero || '', categorie: top?.categorie || '', typeKey: top?.typeKey || 'F', total, pht, sizes: recuNow, season: reassort.season })
      const recu = { ...(reassort.recu || {}) }; Object.entries(recuNow).forEach(([s, n]) => { recu[s] = (recu[s] || 0) + n })
      const complet = Object.entries(reassort.sizes || {}).every(([s, n]) => (recu[s] || 0) >= n)
      const now = new Date().toISOString(), etapes = { ...(reassort.etapes || {}) }
      if (!etapes['En route']) etapes['En route'] = now
      if (complet) etapes['Reçu'] = now
      await db.reassorts.update(reassort.id, { recu, etapes, statut: complet ? 'Reçu' : 'En route', receptions: [...(reassort.receptions || []), { date: now, sizes: recuNow, entreeId }] })
      if (majStock && top?.id) {
        const stock = { ...(top.stock || {}) }; Object.entries(recuNow).forEach(([s, n]) => { stock[s] = (Number(stock[s]) || 0) + n })
        await db.topModeles.update(top.id, { stock, stockAt: now })
      }
      setFait({ total, partiel: !complet, sansPrix: !unit })
    } catch (e) { setEnCours(false); setErreur('Réception impossible : ' + (e.message || 'vérifie la connexion et réessaie.')) }
  }

  if (fait) return (
    <Feuille titre="Réassort reçu" onFermer={onFermer} pied={<><span className="total" /><button className="btn btn-prim" onClick={() => { onToast?.({ texte: `${fait.total} paire${fait.total > 1 ? 's' : ''} ajoutée${fait.total > 1 ? 's' : ''} au Cahier` }); onFermer() }}>Terminer</button></>}>
      <div className="encart neutre"><Icone nom="check" taille={20} /><span><b>{fait.total}</b> paire{fait.total > 1 ? 's' : ''} ajoutée{fait.total > 1 ? 's' : ''} au Cahier des entrées de {magasinNom}.</span></div>
      {fait.partiel && <div className="encart att" style={{ marginTop: 10 }}>Réception partielle : le reste est toujours « En route ».</div>}
      {fait.sansPrix && <div className="encart att" style={{ marginTop: 10 }}>Pas de prix pour ce modèle : l'entrée est à 0 €.</div>}
    </Feuille>
  )
  return (
    <Feuille titre={`Réception — ${reassort.modele}`} onFermer={onFermer}
      pied={<><span className="total"><b>{total} paire{total > 1 ? 's' : ''}</b></span><button className="btn btn-prim" onClick={valider} disabled={enCours}>{enCours ? 'Enregistrement…' : 'Valider la réception'}</button></>}>
      <p style={{ marginTop: 0 }}>Quantités reçues (le reste attendu est proposé). Elles seront ajoutées au <b>Cahier des entrées</b>.</p>
      <div className="grille-stock">
        {tailles.map(s => (
          <div key={s} className="case-stock ok">
            <button type="button" disabled>{s}</button>
            <input type="number" min="0" inputMode="numeric" value={qtes[s] ?? ''} onFocus={e => e.target.select()} onChange={e => setQtes(x => ({ ...x, [s]: e.target.value }))} aria-label={`Reçu ${s}`} />
            <small>attendu {reste[s]}</small>
          </div>
        ))}
      </div>
      <label className="case-a-cocher"><input type="checkbox" checked={majStock} onChange={e => setMajStock(e.target.checked)} /> Ajouter ces paires au stock du top modèle</label>
      {unitCalc === 0 && <>
        {!(tape > 0) && <div className="encart att" style={{ marginTop: 12 }}>Prix à 0 € : l'entrée sera à 0 € dans le Cahier et le Plan de règlement. Saisis le prix si tu le connais.</div>}
        <label className="etiquette">Prix unitaire HT (€, facultatif)<input className="champ" inputMode="decimal" value={prixManuel} onChange={e => setPrixManuel(e.target.value)} placeholder="Ex. 42,50" /></label>
      </>}
      {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
    </Feuille>
  )
}

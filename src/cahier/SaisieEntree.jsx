import { useState, useEffect, useMemo, useRef } from 'react'
import { db } from '../db'
import { useParams } from '../hooks/useParams'
import { useSeason } from '../context/SeasonContext'
import { SIZE_TYPES, DEFAULT_GRID_BY_MARQUE } from '../data/sizes'
import { getClipboard, setClipboard } from '../data/clipboard'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Numero, Statut } from './Reperes'
import { prixRetour, ORIGINE_PRIX, MENTION_ESTIME } from '../savdef/regles'
import { STATUTS, CATEGORIES, CAT_TO_KEY, CAT_DE_GRILLE, libelleStatut, aujourdhuiFr, frVersIso, isoVersFr, classeNumero, fmtEur, pluriel, nomPropre, formeComparaison, marquesSemblables } from './commun'

// Quantités par pointure { [pointure]: nombre } ; gardées par pointure (et non par position) pour ne rien perdre
// quand on change de grille. Les quantités peuvent être négatives (retours créés par le SAV / les défectueux).
function versCarte(sizes) { const m = {}; for (const [s, v] of Object.entries(sizes || {})) if (Number(v)) m[s] = Number(v); return m }
const memesTailles = (a, b) => { const ka = Object.keys(a).filter(k => a[k]), kb = Object.keys(b).filter(k => b[k]); return ka.length === kb.length && ka.every(k => Number(a[k]) === Number(b[k])) }
const listeTailles = sz => Object.entries(sz).map(([t, q]) => Math.abs(q) > 1 ? `${t} ×${Math.abs(q)}` : t).join(', ')

/**
 * Saisie (création) ou correction (modification) d'une entrée.
 * - entree : l'entrée à corriger (modification) ; absente = nouvelle entrée
 * - entrees : entrées de la saison (avec noms de magasin/marque) — rappel, doublons, déjà reçu
 * Les données enregistrées sont exactement celles de l'outil actuel (Retour saisi au Cahier : statut « Retour », quantités positives).
 */
export default function SaisieEntree({ entree, entrees, magasinAppareil, retourInitial = false, onFermer, onToast }) {
  const modif = !!entree
  const { season } = useSeason()
  const { params } = useParams()
  const [f, setF] = useState(() => modif ? {
    retour: entree.statut === 'Retour', statut: entree.statut || '', magasin: entree.magasin || '', date: entree.date || aujourdhuiFr(),
    marque: entree.marque || '', modele: entree.modele || '', numero: entree.numero || '', categorie: entree.categorie || '', typeKey: entree.typeKey || 'F',
  } : { retour: retourInitial, statut: retourInitial ? 'Retour' : '', magasin: magasinAppareil || '', date: aujourdhuiFr(), marque: '', modele: '', numero: '', categorie: '', typeKey: 'F' })
  const [tailles, setTailles]   = useState(() => modif ? versCarte(entree.sizes) : {})
  const [retirer, setRetirer]   = useState(false)                 // mode « − » : toucher une pointure retire une paire
  const [panneau, setPanneau]   = useState(modif ? null : 'marque') // 'marque' | 'modele' | 'details' | null
  const [rechMarque, setRechMarque] = useState('')
  const [rechModele, setRechModele] = useState('')
  const [catAuto, setCatAuto]   = useState(false)
  const [paramRow, setParamRow] = useState(null)
  const [erreur, setErreur]     = useState('')
  const [enCours, setEnCours]   = useState(false)
  const [confirmDoublon, setConfirmDoublon] = useState(false)
  const [confirmSuppr, setConfirmSuppr] = useState(false)
  const [presse, setPresse]     = useState(() => getClipboard())
  const [confirmFermer, setConfirmFermer] = useState(false)
  const [creationMarque, setCreationMarque] = useState(false)
  const [confirmMarque, setConfirmMarque] = useState(false)
  const [initial] = useState(() => JSON.stringify([f, tailles]))
  const saisieClavier = useRef('')   // chiffres tapés au clavier sur une pointure

  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setConfirmDoublon(false) }
  const grille = SIZE_TYPES[f.typeKey]?.sizes ?? []
  const horsGrille = Object.entries(tailles).filter(([s, v]) => v && !grille.includes(s))
  const total = grille.reduce((t, s) => t + (Number(tailles[s]) || 0), 0)

  // Ligne d'achats (paramètres) magasin × marque × saison : quantités, prix et pointures attendues par modèle
  useEffect(() => {
    let annule = false
    ;(async () => {
      if (!f.magasin || !f.marque) { if (!annule) setParamRow(null); return }
      const mag  = await db.magasins.where('nom').equals(f.magasin).first()
      const four = await db.fournisseurs.where('nom').equals(f.marque).first()
      if (annule) return
      if (!mag || !four) { setParamRow(null); return }
      const p = await db.parametres.where('fournisseurId').equals(four.id).and(x => x.magasinId === mag.id && x.season === season).first()
      if (!annule) setParamRow(p || null)
    })()
    return () => { annule = true }
  }, [f.magasin, f.marque, season])

  // Déjà reçu (hors retours) par modèle et par pointure, pour ce magasin et cette marque
  const recu = useMemo(() => {
    const r = {}
    for (const e of entrees || []) {
      if (e.statut === 'Retour' || e.magasin !== f.magasin || e.marque !== f.marque || (modif && e.id === entree.id)) continue
      const m = (r[e.modele] ||= { tailles: {}, numero: '', categorie: '', id: 0 })
      for (const [t, q] of Object.entries(e.sizes || {})) m.tailles[t] = (m.tailles[t] || 0) + (Number(q) || 0)
      if ((e.id || 0) > m.id) { m.id = e.id || 0; if (e.numero) m.numero = e.numero; if (e.categorie) m.categorie = e.categorie }
    }
    return r
  }, [entrees, f.magasin, f.marque, modif, entree])
  const attenduModele = paramRow?.modelesSizes?.[f.modele] || {}
  const resteTaille = t => Math.max(0, (Number(attenduModele[t]) || 0) - (recu[f.modele]?.tailles[t] || 0))

  // Prix : prix du modèle (paramètres) ÷ quantité commandée. En correction, si le modèle n'a pas de prix,
  // on garde le prix unitaire d'origine (une correction ne remet jamais le PHT à 0).
  const prixModele = useMemo(() => {
    const q = paramRow?.modeles?.[f.modele], px = paramRow?.prixModeles?.[f.modele]
    return q > 0 && px > 0 ? px / q : 0
  }, [paramRow, f.modele])
  const memeArticle = modif && f.marque === (entree.marque || '') && f.modele === (entree.modele || '')
  const prixOrigine = memeArticle && entree.total && entree.pht ? Math.abs(entree.pht / entree.total) : 0
  // Nouveau retour sans prix du modèle dans la saison active : même recherche que les retours du SAV et des défectueux
  // (prix du modèle d'une autre saison, sinon prix moyen de la marque, sinon 0 €) — ajout du 13/10
  const cleRetour = f.retour && !modif && f.modele && f.marque && f.magasin && !prixModele ? `${f.marque}|${f.magasin}|${season}|${f.modele}` : ''
  const [prixAuto, setPrixAuto] = useState({ cle: '', r: null })
  useEffect(() => {
    let actif = true
    if (cleRetour) (async () => {
      const mag = await db.magasins.where('nom').equals(f.magasin).first(), four = await db.fournisseurs.where('nom').equals(f.marque).first()
      const r = mag && four ? await prixRetour(four.id, mag.id, season, f.modele) : { unit: 0, source: 'aucun' }
      if (actif) setPrixAuto({ cle: cleRetour, r })
    })()
    return () => { actif = false }
  }, [cleRetour])  // eslint-disable-line react-hooks/exhaustive-deps
  const retourAuto = cleRetour && prixAuto.cle === cleRetour ? prixAuto.r : null
  const prixUnitaire = prixModele || prixOrigine || (retourAuto?.unit || 0)
  const pht = prixUnitaire > 0 && total !== 0 ? Math.round(prixUnitaire * total * 100) / 100 : 0

  // ── Choix de la marque et du modèle ──
  const marques = (params?.fournisseurs || []).filter(m => !rechMarque || m.toLowerCase().includes(rechMarque.toLowerCase()))
  const suggestions = params?.modelesByMarque?.[f.marque] || []
  const modelesVisibles = suggestions.filter(m => !rechModele || m.toLowerCase().includes(rechModele.toLowerCase()))
  function choisirMarque(m) {
    const g = DEFAULT_GRID_BY_MARQUE[m.trim().toLowerCase()]
    setF(x => ({ ...x, marque: m, modele: '', ...(g ? { typeKey: g } : {}) }))
    setRechMarque(''); setPanneau('modele'); setConfirmDoublon(false)
  }
  // Pré-remplit avec le reste à recevoir (sauf en retour), la grille du modèle, le dernier N° et la dernière catégorie
  function choisirModele(m) {
    const nom = m.trim(); if (!nom) return
    const gKey = paramRow?.modelesTypes?.[nom] || f.typeKey
    const dernier = recu[nom]
    const cat = dernier?.categorie || CAT_DE_GRILLE[gKey] || ''
    setF(x => ({ ...x, modele: nom, typeKey: gKey, numero: dernier?.numero || x.numero, categorie: cat }))
    setCatAuto(!!cat)
    if (!f.retour && !modif) {
      const att = paramRow?.modelesSizes?.[nom] || {}
      const q = {}
      for (const t of SIZE_TYPES[gKey]?.sizes || []) { const r = (Number(att[t]) || 0) - (dernier?.tailles[t] || 0); if (r > 0) q[t] = r }
      setTailles(q)
    }
    setRechModele(''); setPanneau(null); setConfirmDoublon(false)
  }
  function choisirCategorie(c) {
    // Toucher la catégorie déjà choisie la garde (pas de décochage involontaire)
    setF(x => x.categorie === c ? x : ({ ...x, categorie: c, typeKey: CAT_TO_KEY[c] ?? x.typeKey }))
    setCatAuto(false)
  }

  // ── Pointures : toucher = + 1 (ou − 1) ; au clavier : chiffres, ← →, Retour arrière ──
  function changerTaille(t, n) { setTailles(x => { const y = { ...x }; if (n) y[t] = n; else delete y[t]; return y }); setConfirmDoublon(false) }
  function toucher(t) { const q = Number(tailles[t]) || 0; changerTaille(t, retirer ? Math.max(0, q - 1) : q + 1); saisieClavier.current = '' }
  function clavier(e, t, i) {
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); saisieClavier.current = (saisieClavier.current + e.key).slice(-3); changerTaille(t, parseInt(saisieClavier.current) || 0) }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); saisieClavier.current = ''; changerTaille(t, 0) }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); saisieClavier.current = ''
      document.querySelector(`[data-pointure-index="${i + (e.key === 'ArrowRight' ? 1 : -1)}"]`)?.focus()
    }
  }
  function toutLeReste() { const q = {}; for (const t of grille) { const r = resteTaille(t); if (r > 0) q[t] = r } setTailles(q); setConfirmDoublon(false) }
  function copier() { const d = { typeKey: f.typeKey, quantities: grille.map(t => tailles[t] ? String(tailles[t]) : '') }; setClipboard(d); setPresse(d); onToast?.({ texte: 'Grille copiée' }) }
  function coller() {
    const cb = getClipboard(); if (!cb) return
    const q = {}; (SIZE_TYPES[cb.typeKey]?.sizes || []).forEach((t, i) => { const n = parseInt(cb.quantities[i]); if (n) q[t] = n })
    setF(x => ({ ...x, typeKey: cb.typeKey })); setTailles(q); setConfirmDoublon(false)
  }

  // ── Doublons : même magasin, même jour, même marque, même modèle, même N° ; « identique » si mêmes pointures ──
  const jour = (entrees || []).filter(e => e.magasin === f.magasin && e.date === f.date && (!modif || e.id !== entree.id))
  const memes = f.modele ? jour.filter(e => e.marque === f.marque && e.modele === f.modele && (e.numero || '') === (f.numero || '')) : []
  const tailleSaisie = Object.fromEntries(grille.filter(t => tailles[t]).map(t => [t, tailles[t]]))
  const identique = Object.keys(tailleSaisie).length ? memes.find(e => memesTailles(e.sizes || {}, tailleSaisie)) : null
  const derniersDuJour = modif ? [] : (entrees || []).filter(e => e.magasin === f.magasin && e.date === aujourdhuiFr()).sort((a, b) => (b.id || 0) - (a.id || 0))

  async function enregistrer() {
    if (!f.magasin) { setErreur('Choisis le magasin.'); return }
    if (!f.marque)  { setErreur('Choisis la marque.'); return }
    if (total === 0) { setErreur('Aucune quantité saisie : touche les pointures reçues.'); return }
    if (horsGrille.length) { setErreur(`Pointure(s) ${horsGrille.map(([s]) => s).join(', ')} absente(s) de la grille ${SIZE_TYPES[f.typeKey]?.label} : reviens à la grille d'origine ou retire-les.`); return }
    if (identique && !confirmDoublon) { setConfirmDoublon(true); return }   // 2ᵉ toucher pour confirmer une entrée identique
    setEnCours(true); setErreur('')
    try {
      const mag  = await db.magasins.where('nom').equals(f.magasin).first()
      const four = await db.fournisseurs.where('nom').equals(f.marque).first()
      if (!mag)  { setErreur('Magasin introuvable dans la base.'); return }
      if (!four) { setErreur('Marque introuvable dans la base.'); return }
      const sizes = {}
      for (const t of grille) { const v = Number(tailles[t]) || 0; if (v !== 0) sizes[t] = v }
      const donnees = {
        statut: f.retour ? 'Retour' : f.statut, magasinId: mag.id, fournisseurId: four.id, date: f.date,
        modele: f.modele, numero: f.numero, categorie: f.categorie, typeKey: f.typeKey, total, pht, sizes,
      }
      if (modif) {
        await db.entrees.update(entree.id, donnees)
        onToast?.({ texte: 'Modifications enregistrées' })
        onFermer()
      } else {
        const id = await db.entrees.add({ ...donnees, season })
        setClipboard({ typeKey: f.typeKey, quantities: grille.map(t => tailles[t] ? String(tailles[t]) : '') }); setPresse(getClipboard())
        onToast?.({ texte: `Enregistrée : ${f.marque} · ${f.modele || 'sans modèle'}, ${pluriel(total, 'paire')}`, annuler: () => db.entrees.delete(id) })
        // Carton suivant : on garde magasin, date, marque, N°, grille, statut et le mode réception/retour
        setF(x => ({ ...x, modele: '', categorie: '' })); setTailles({}); setCatAuto(false); setConfirmDoublon(false); setPanneau('modele')
      }
    } catch (err) {
      setErreur('Enregistrement impossible : ' + (err.message || 'vérifie la connexion et réessaie.'))
    } finally {
      setEnCours(false)
    }
  }

  async function supprimer() {
    setConfirmSuppr(false)
    setEnCours(true)
    try { await db.entrees.delete(entree.id); onToast?.({ texte: 'Entrée supprimée' }); onFermer() }
    catch (err) { setErreur('Suppression impossible : ' + (err.message || err)); setConfirmSuppr(false) }
    finally { setEnCours(false) }
  }

  const statutsSaisie = STATUTS.filter(s => s !== 'Retour')
  const commencee = modif ? JSON.stringify([f, tailles]) !== initial : (!!f.modele || Object.values(tailles).some(Boolean))
  const fermer = () => { if (commencee && !enCours) setConfirmFermer(true); else onFermer() }

  // Créer une marque absente de la liste, sans quitter la saisie (comme depuis le SAV ou les défectueux).
  // Garde-fous contre les doublons : même nom à la casse, aux accents, aux espaces ou à la ponctuation près → c'est la marque existante ;
  // nom proche (1 ou 2 lettres d'écart) → « Vouliez-vous dire … ? » d'abord ; puis confirmation avec le nom exact enregistré.
  const nomNouveau = nomPropre(rechMarque)
  const toutesMarques = params?.fournisseurs || []
  const marqueExistante = nomNouveau ? toutesMarques.find(m => formeComparaison(m) === formeComparaison(nomNouveau)) : null
  const semblables = marqueExistante ? [] : marquesSemblables(nomNouveau, toutesMarques).filter(m => !marques.includes(m))
  const procheDe = marquesSemblables(nomNouveau, toutesMarques)   // rappel dans la confirmation
  async function creerMarque() {
    setConfirmMarque(false)
    if (!nomNouveau || creationMarque) return
    setCreationMarque(true); setErreur('')
    try {
      // Revérifie sur la liste à jour (une marque a pu être créée entre-temps sur un autre appareil)
      const deja = (await db.fournisseurs.toArray()).find(m => formeComparaison(m.nom) === formeComparaison(nomNouveau))
      if (deja) { choisirMarque(deja.nom); onToast?.({ texte: `La marque « ${deja.nom} » existait déjà : elle est choisie` }); return }
      await db.fournisseurs.add({ nom: nomNouveau, modelesBySeason: {} })
      choisirMarque(nomNouveau)
      onToast?.({ texte: `Marque « ${nomNouveau} » créée` })
    } catch (err) {
      setErreur('Création de la marque impossible : ' + (err.message || 'vérifie la connexion et réessaie.'))
    } finally {
      setCreationMarque(false)
    }
  }

  return (
    <>
      <div className="feuille-fond" onClick={fermer} />
      <div className="feuille saisie-entree" role="dialog" aria-label={modif ? "Modifier l'entrée" : 'Nouvelle entrée'}>
        <div className="feuille-entete">
          <h2>{modif ? "Modifier l'entrée" : 'Nouvelle entrée'}</h2>
          <button className="icone-btn" onClick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button>
        </div>
        <div className="feuille-corps">
          {!modif && (
            <div className="segment" role="group" aria-label="Type d'entrée" style={{ marginBottom: 14 }}>
              <button aria-pressed={!f.retour} onClick={() => set('retour', false)}>Réception</button>
              <button aria-pressed={f.retour} onClick={() => { set('retour', true); setTailles({}) }}>Retour</button>
            </div>
          )}
          {f.retour && <div className="encart att" style={{ marginBottom: 14 }}>Retour : enregistré avec le statut « Retour ». Il n'est pas compté dans le reçu.</div>}

          {derniersDuJour.length > 0 && (
            <details className="rappel" open>
              <summary>Déjà enregistré aujourd'hui ({derniersDuJour.length})</summary>
              <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 8 }}>
                {derniersDuJour.slice(0, 3).map(e => (
                  <div key={e.id} className="ligne" style={{ minHeight: 44, padding: '6px 12px' }}>
                    <span className="txt"><span className="t1" style={{ fontSize: 14 }}>{e.marque} <span>· {e.modele || 'sans modèle'}</span><Numero n={e.numero} /></span>
                      <div className="t2">{pluriel(e.total || 0, 'paire')}{e.statut ? ' · ' + libelleStatut(e.statut) : ''}</div></span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Marque */}
          <span className="etiquette">Marque</span>
          {panneau === 'marque' ? (
            <div className="choix-liste">
              <input className="champ" autoFocus placeholder="Rechercher ou créer une marque" value={rechMarque} onChange={e => setRechMarque(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { if (marques.length === 1) choisirMarque(marques[0]); else if (marqueExistante) choisirMarque(marqueExistante); else if (nomNouveau && !semblables.length && !marques.length) setConfirmMarque(true) } }} />
              <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 8, maxHeight: 280, overflowY: 'auto' }}>
                {marques.map(m => (
                  <button key={m} className="ligne" style={{ minHeight: 48 }} onClick={() => choisirMarque(m)}>
                    <span className="txt"><span className="t1">{m}</span></span>{m === f.marque && <Icone nom="check" taille={18} style={{ color: 'var(--action-texte)' }} />}
                  </button>
                ))}
                {marqueExistante && !marques.includes(marqueExistante) && (
                  <button className="ligne" style={{ minHeight: 48 }} onClick={() => choisirMarque(marqueExistante)}>
                    <span className="txt"><span className="t1">{marqueExistante}</span><div className="t2">Marque déjà enregistrée sous ce nom</div></span>
                  </button>
                )}
                {semblables.length > 0 && <>
                  <div className="etiquette" style={{ padding: '10px 14px 4px', margin: 0 }}>Tu voulais dire… ?</div>
                  {semblables.map(m => (
                    <button key={'s-' + m} className="ligne" style={{ minHeight: 48 }} onClick={() => choisirMarque(m)}>
                      <span className="txt"><span className="t1">{m}</span><div className="t2">Marque existante au nom proche</div></span>
                    </button>
                  ))}
                </>}
                {nomNouveau && !marqueExistante && (
                  <button className="ligne" style={{ minHeight: 52, color: 'var(--action-texte)' }} onClick={() => setConfirmMarque(true)} disabled={creationMarque}>
                    <Icone nom="ajout" taille={18} /><span className="txt"><span className="t1" style={{ color: 'inherit' }}>{creationMarque ? 'Création…' : `${semblables.length || marques.length ? 'Non, créer' : 'Créer'} la marque « ${nomNouveau} »`}</span>
                      <div className="t2">Marque absente de la liste : elle sera ajoutée pour tous les magasins</div></span>
                  </button>
                )}
                {!marques.length && !nomNouveau && <div className="vide" style={{ padding: 16 }}>Aucune marque enregistrée.</div>}
              </div>
            </div>
          ) : (
            <button className="champ valeur" onClick={() => setPanneau('marque')}><b>{f.marque || 'Choisir la marque'}</b><Icone nom="bas" taille={18} style={{ color: 'var(--discret)' }} /></button>
          )}

          {/* Modèle */}
          {f.marque && (
            <>
              <span className="etiquette" style={{ marginTop: 14 }}>Modèle</span>
              {panneau === 'modele' ? (
                <div className="choix-liste">
                  <input className="champ" placeholder="Rechercher ou saisir un modèle" value={rechModele} onChange={e => setRechModele(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && rechModele.trim()) choisirModele(rechModele) }} />
                  <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {modelesVisibles.map(m => {
                      const att = paramRow?.modelesSizes?.[m]; const totAtt = att ? Object.values(att).reduce((t, v) => t + (Number(v) || 0), 0) : 0
                      const totRecu = Object.values(recu[m]?.tailles || {}).reduce((t, v) => t + v, 0)
                      const g = paramRow?.modelesTypes?.[m]
                      return (
                        <button key={m} className="ligne" style={{ minHeight: 56 }} onClick={() => choisirModele(m)}>
                          <span className="txt"><span className="t1">{m}<Numero n={recu[m]?.numero} /></span>
                            <div className="t2">{[g && SIZE_TYPES[g]?.label, totAtt ? `reste à recevoir ${Math.max(0, totAtt - totRecu)} / ${totAtt}` : ''].filter(Boolean).join(' · ') || 'modèle de la saison'}</div></span>
                          <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
                        </button>
                      )
                    })}
                    {rechModele.trim() && !suggestions.some(m => m.toLowerCase() === rechModele.trim().toLowerCase()) && (
                      <button className="ligne" style={{ minHeight: 52, color: 'var(--action-texte)' }} onClick={() => choisirModele(rechModele)}>
                        <Icone nom="ajout" taille={18} /><span className="txt"><span className="t1" style={{ color: 'inherit' }}>Utiliser « {rechModele.trim()} »</span><div className="t2">Modèle qui n'est pas dans la liste de la saison</div></span>
                      </button>
                    )}
                    {!modelesVisibles.length && !rechModele.trim() && <div className="vide" style={{ padding: 16 }}>Aucun modèle enregistré pour cette marque : tape le modèle reçu.</div>}
                  </div>
                </div>
              ) : (
                <button className="champ valeur" onClick={() => { setPanneau('modele'); setRechModele('') }}>
                  <span><b>{f.modele || 'Choisir le modèle'}</b><Numero n={f.numero} /></span><span className="lien" style={{ minHeight: 0 }}>Changer</span>
                </button>
              )}
            </>
          )}

          {/* Magasin, date, N°, grille */}
          <div className="resume-saisie">
            <span>Magasin <b>{f.magasin || '—'}</b></span>
            <span>Date <b>{f.date === aujourdhuiFr() ? "aujourd'hui" : f.date}</b></span>
            <span>N° {f.numero ? <span className={`num ${classeNumero(f.numero)}`}>{f.numero}</span> : <b>—</b>}</span>
            <span>Grille <b>{SIZE_TYPES[f.typeKey]?.label}</b></span>
            <button className="lien" onClick={() => setPanneau(panneau === 'details' ? null : 'details')}>{panneau === 'details' ? 'Fermer' : 'Modifier'}</button>
          </div>
          {panneau === 'details' && (
            <div className="details-saisie">
              <label className="etiquette">Magasin
                <select className="champ" value={f.magasin} onChange={e => set('magasin', e.target.value)}>
                  <option value="">— Choisir —</option>{(params?.magasins || []).map(m => <option key={m}>{m}</option>)}
                </select></label>
              <label className="etiquette">Date
                <input className="champ" type="date" value={frVersIso(f.date)} onChange={e => set('date', isoVersFr(e.target.value))} /></label>
              <label className="etiquette">N°
                <input className="champ" value={f.numero} onChange={e => set('numero', e.target.value)} placeholder="Référence" inputMode="numeric" /></label>
              <span className="etiquette">Grille</span>
              <div className="chips" style={{ flexWrap: 'wrap' }}>
                {Object.entries(SIZE_TYPES).map(([k, d]) => <button key={k} className="chip" aria-pressed={f.typeKey === k} onClick={() => set('typeKey', k)}>{d.label}</button>)}
              </div>
            </div>
          )}

          {/* Catégorie et statut : pré-remplis si possible, toujours visibles et modifiables */}
          <span className="etiquette" style={{ marginTop: 14 }}>Catégorie {catAuto && f.categorie ? <span className="aide">— pré-remplie, touche pour changer</span> : !f.categorie ? <span className="aide att">— à choisir</span> : null}</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => <button key={c} className="chip" aria-pressed={f.categorie === c} onClick={() => choisirCategorie(c)}>{c}</button>)}
          </div>
          {!f.retour && (
            <>
              <span className="etiquette" style={{ marginTop: 14 }}>Statut</span>
              <div className="chips" style={{ flexWrap: 'wrap' }}>
                {statutsSaisie.map(s => <button key={s || 'aucun'} className="chip" aria-pressed={f.statut === s} onClick={() => set('statut', s)}>{s ? <Statut s={s} /> : 'Aucun'}</button>)}
              </div>
            </>
          )}
          {modif && f.retour && <div style={{ marginTop: 14 }}><span className="etiquette">Statut</span><Statut s="Retour" /></div>}

          {/* Pointures */}
          <div className="entete-pointures">
            <span className="etiquette" style={{ margin: 0 }}>Touche une pointure pour {retirer ? 'retirer' : 'ajouter'} une paire</span>
            <div className="segment" role="group" aria-label="Ajouter ou retirer">
              <button aria-pressed={!retirer} onClick={() => setRetirer(false)} aria-label="Ajouter">+</button>
              <button aria-pressed={retirer} onClick={() => setRetirer(true)} aria-label="Retirer">−</button>
            </div>
          </div>
          {horsGrille.length > 0 && (
            <div className="encart err" style={{ margin: '0 0 10px', flexDirection: 'column' }}>
              <span>La grille {SIZE_TYPES[f.typeKey]?.label} ne contient pas : {horsGrille.map(([s, v]) => `${s} (${v})`).join(', ')}.</span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {modif && f.typeKey !== (entree.typeKey || 'F') && <button className="btn" onClick={() => set('typeKey', entree.typeKey || 'F')}>Revenir à la grille {SIZE_TYPES[entree.typeKey || 'F']?.label}</button>}
                <button className="btn" onClick={() => setTailles(x => Object.fromEntries(Object.entries(x).filter(([s]) => grille.includes(s))))}>Retirer ces pointures</button>
              </span>
            </div>
          )}
          <div className="pointures">
            {grille.map((t, i) => {
              const q = Number(tailles[t]) || 0, r = !f.retour && f.modele ? resteTaille(t) : 0
              const info = f.retour || !f.modele || !Object.keys(attenduModele).length ? '' : r - q > 0 ? `reste ${r - q}` : q > r ? ((Number(attenduModele[t]) || 0) ? `+${q - r} en plus` : (q ? 'non attendu' : '')) : ''
              return (
                <button key={t} className={`pt${q ? ' plein' : ''}${f.retour ? ' retour' : ''}${q < 0 ? ' negatif' : ''}`} data-pointure-index={i}
                  onClick={() => toucher(t)} onKeyDown={e => clavier(e, t, i)} onBlur={() => { saisieClavier.current = '' }}
                  aria-label={`Pointure ${t}${q ? ', ' + q + ' paire(s)' : ''}`}>
                  {t}<small>{info || ' '}</small>{q !== 0 && <span className="qte">{q}</span>}
                </button>
              )
            })}
          </div>
          <div className="liens-pointures">
            {!f.retour && f.modele && Object.keys(attenduModele).length > 0 && <button className="lien" onClick={toutLeReste}>Tout le reste à recevoir</button>}
            {total !== 0 && <button className="lien" onClick={() => setTailles({})}>Vider</button>}
            <button className="lien" onClick={copier}>Copier la grille</button>
            <button className="lien" onClick={coller} disabled={!presse} style={{ opacity: presse ? 1 : .4 }}>Coller{presse ? ` (${SIZE_TYPES[presse.typeKey]?.label})` : ''}</button>
          </div>
          {erreur && <div className="encart err" style={{ marginTop: 14 }}>{erreur}</div>}
          {modif && (
            <div style={{ marginTop: 22 }}>
              <button className="btn btn-danger" onClick={() => setConfirmSuppr(true)} disabled={enCours}>Supprimer l'entrée</button>
            </div>
          )}
        </div>

        <div className="feuille-pied">
          {identique && (
            <div className="encart err" style={{ flexBasis: '100%', flexDirection: 'column', gap: 2 }}>
              <b>⚠️ Entrée identique déjà enregistrée ce jour</b>
              <span>{identique.marque} · {identique.modele} · N° {identique.numero || '—'} · mêmes pointures ({listeTailles(identique.sizes || {})}). Doublon ? Vérifie avant d'enregistrer.</span>
            </div>
          )}
          {!identique && memes.length > 0 && !modif && (
            <div className="encart neutre" style={{ flexBasis: '100%' }}>
              Déjà reçu ce jour pour ce modèle et ce N° : {pluriel(memes[0].total || 0, 'paire')} ({listeTailles(memes[0].sizes || {})}). Autre carton ? Tu peux continuer.
            </div>
          )}
          <div className="total">
            <b>{f.retour ? 'Retour : ' : ''}{pluriel(total, 'paire')}</b>
            {pht ? fmtEur(pht) + (prixModele ? '' : prixOrigine ? ' (prix d\'origine)' : retourAuto?.unit ? ` (${ORIGINE_PRIX[retourAuto.source]}${['modele-autre-saison', 'prix-moyen-saison-modele'].includes(retourAuto.source) ? ' : ' + retourAuto.saison.replace('ETE_', 'Été ').replace('HIVER_', 'Hiver ') : ''}${retourAuto.estime ? ' — ' + MENTION_ESTIME : ''})` : '') : f.modele ? 'Prix du modèle non renseigné (Paramètres → Marques)' : 'Choisis un modèle'}
          </div>
          <button className="btn btn-prim" onClick={enregistrer} disabled={enCours} style={identique ? { background: 'var(--err)' } : undefined}>
            {enCours ? 'Enregistrement…' : identique ? (confirmDoublon ? 'Confirmer : enregistrer quand même' : 'Enregistrer quand même…') : 'Enregistrer'}
          </button>
        </div>
      </div>
      {confirmFermer && (
        <Confirmation danger titre={modif ? 'Abandonner les modifications ?' : 'Abandonner cette saisie ?'}
          texte={modif ? 'Les changements faits sur cette entrée ne seront pas enregistrés.' : `La saisie en cours (${f.marque || 'marque'}${f.modele ? ' · ' + f.modele : ''}${total ? ', ' + pluriel(total, 'paire') : ''}) ne sera pas enregistrée.`}
          confirmer="Abandonner" annuler="Continuer la saisie" onAnnuler={() => setConfirmFermer(false)} onConfirmer={() => { setConfirmFermer(false); onFermer() }} />
      )}
      {confirmMarque && (
        <Confirmation titre="Créer cette marque ?"
          texte={<>La marque sera enregistrée exactement ainsi :<span className="nom-exact">{nomNouveau}</span>
            {procheDe.length > 0 ? <>Attention, des marques proches existent déjà : <b>{procheDe.join(', ')}</b>. Si c'est la même, choisis-la plutôt.<br /></> : null}
            Elle apparaîtra dans la liste des marques de tous les magasins.</>}
          confirmer="Créer la marque" annuler="Revenir" onAnnuler={() => setConfirmMarque(false)} onConfirmer={creerMarque} />
      )}
      {confirmSuppr && (
        <Confirmation danger titre="Supprimer cette entrée ?"
          texte={`${entree.marque} · ${entree.modele || 'sans modèle'} · ${pluriel(entree.total || 0, 'paire')} du ${entree.date}. Cette suppression est définitive.`}
          confirmer="Supprimer" onAnnuler={() => setConfirmSuppr(false)} onConfirmer={supprimer} />
      )}
    </>
  )
}

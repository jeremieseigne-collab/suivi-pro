import { useState, useMemo } from 'react'
import { useLiveQuery } from '../lib/useLiveQuery'
import { db } from '../db'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { useSeason } from '../context/SeasonContext'
import { SIZE_TYPES } from '../data/sizes'
import { aujourdhuiFr, frVersIso, isoVersFr, pluriel, formeComparaison, CATEGORIES, CAT_TO_KEY } from '../cahier/commun'
import { commandesDeSaison, lignesDe, enregistrerReception, corrigerReception, messageErreur } from './donnees'
import { nomModele, grilleDe, categorieDe, horsCommande } from './reception'
import { fmtJour } from './outils'
import '../cahier/cahier.css'
import './fournisseurs.css'

// Saisie d'une réception (plan C, étape 3) pour une saison suivie par commandes (Été 2027 et après) :
// 1. la commande (choisie d'office s'il n'y en a qu'une d'ouverte pour la marque), 2. le modèle-coloris,
// 3. les pointures, pré-remplies avec le reste à livrer ; plusieurs modèles par carton ; hors commande avec confirmation.
// Correction (entree fournie) : un seul article, réécrit par corriger_reception. La base calcule mouvements et PHT.
const ordreTaille = (grille, t) => { const i = grille.indexOf(t); const n = parseFloat(t); return i >= 0 ? i : 1000 + (Number.isFinite(n) ? n : 999) }

export default function SaisieReception({ entree, entrees, magasinAppareil, onFermer, onToast, onSansCommande, onRetour }) {
  const correction = !!entree
  const { season } = useSeason()
  const [etapeChoisie, setEtape] = useState(correction ? 'tailles' : 'commande')   // commande | article | tailles
  const [commandeId, setCommandeId] = useState(entree?.commandeId ?? null)
  const [rech, setRech] = useState('')
  const [articleChoisi, setArticle] = useState(null)  // { code, couleur, libelle, typeKey, numero, categorie, horsCommande }
  const [tailles, setTailles] = useState(() => correction ? Object.fromEntries(Object.entries(entree.sizes || {}).filter(([, q]) => Number(q) > 0)) : {})
  const [retirer, setRetirer] = useState(false)
  const [carton, setCarton] = useState([])            // articles prêts : { ...article, tailles }
  const [date, setDate] = useState(entree?.date || aujourdhuiFr())
  const [confirmHors, setConfirmHors] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [bilan, setBilan] = useState(null)            // après un enregistrement : { paires, reste }
  const [nouvelArticle, setNouvelArticle] = useState(null)   // hors commande : { code, couleur, categorie }

  const d = useLiveQuery(async () => {
    const [magasins, marques, commandes] = await Promise.all([db.magasins.toArray(), db.fournisseurs.toArray(), commandesDeSaison(season)])
    const mag = magasins.find(m => m.nom === magasinAppareil)
    return { mag, marques, commandes: commandes.filter(c => c.magasin_id === mag?.id) }
  }, [season, magasinAppareil])
  const ouvertes = useMemo(() => (d?.commandes || []).filter(c => c.reste > 0 || c.id === commandeId), [d, commandeId])
  // Une seule commande ouverte : choisie d'office
  const commandeEff = commandeId ?? (!correction && ouvertes.length === 1 ? ouvertes[0].id : null)
  const etape = etapeChoisie === 'commande' && commandeEff ? 'article' : etapeChoisie
  const lignes = useLiveQuery(() => (commandeEff ? lignesDe([commandeEff]) : Promise.resolve([])), [commandeEff])

  const commande = d?.commandes.find(c => c.id === commandeEff)
  const nomMarque = id => d?.marques.find(m => m.id === id)?.nom || '—'

  // Articles (modèle-coloris) de la commande, reste à livrer en tenant compte de ce qui est déjà dans le carton
  const articles = useMemo(() => {
    const g = new Map()
    for (const l of [...(lignes || [])].sort((a, b) => a.ordre - b.ordre || a.id - b.id)) {
      const k = l.code_modele + '|' + l.couleur
      if (!g.has(k)) g.set(k, { cle: k, code: l.code_modele, couleur: l.couleur, libelle: l.libelle, gencodes: [], lignes: [], reste: 0, commande: 0, recu: 0, typeKey: grilleDe(l) })
      const a = g.get(k); a.lignes.push(l); a.reste += l.reste; a.commande += l.qte_commandee; a.recu += l.qte_recue; if (l.gencode) a.gencodes.push(l.gencode)
    }
    return [...g.values()]
  }, [lignes])
  const dansCarton = cle => carton.find(x => x.cle === cle)

  // Correction : l'article de l'entrée (le reste affiché compte ce qu'elle a déjà apporté)
  const articleCorrige = useMemo(() => {
    if (!correction) return null
    const a = articles.find(x => nomModele(x.code, x.couleur) === entree.modele)
    return a ? { ...a, numero: entree.numero || a.lignes.find(l => l.numero)?.numero || '', categorie: entree.categorie || categorieDe(a.typeKey) } : null
  }, [correction, articles, entree])
  const [numeroCorrige, setNumeroCorrige] = useState(null)
  const article = articleChoisi || (articleCorrige && { ...articleCorrige, ...(numeroCorrige != null ? { numero: numeroCorrige } : {}) })
  const changerNumero = n => (articleChoisi ? setArticle(a => ({ ...a, numero: n })) : setNumeroCorrige(n))

  // N° et catégorie : ceux de la dernière entrée du même modèle (comme la saisie du Cahier)
  function derniere(modele) {
    let best = null
    for (const e of entrees || []) if (e.modele === modele && e.magasin === magasinAppareil && e.statut !== 'Retour' && (!best || e.id > best.id)) best = e
    return best
  }
  function choisirArticle(a) {
    // N° : celui mémorisé sur la ligne de commande, sinon celui de la dernière entrée du modèle (réassort, saisie antérieure)
    const nom = nomModele(a.code, a.couleur), der = derniere(nom), deja = dansCarton(a.cle)
    const numLigne = a.lignes.find(l => l.numero)?.numero
    setArticle({ ...a, numero: deja?.numero ?? numLigne ?? der?.numero ?? '', categorie: der?.categorie || categorieDe(a.typeKey) })
    if (deja) setTailles(deja.tailles)
    else setTailles(Object.fromEntries(a.lignes.filter(l => l.reste > 0).map(l => [l.taille, l.reste])))
    setRetirer(false); setRech(''); setEtape('tailles')
  }
  function articleHorsCommande() {
    const code = nouvelArticle.code.trim(), couleur = nouvelArticle.couleur.trim()
    if (!code) return
    const typeKey = CAT_TO_KEY[nouvelArticle.categorie] || 'F'
    const existant = articles.find(a => formeComparaison(a.code) === formeComparaison(code) && formeComparaison(a.couleur) === formeComparaison(couleur))
    if (existant) { setNouvelArticle(null); choisirArticle(existant); return }
    setArticle({ cle: code + '|' + couleur, code, couleur, libelle: '', lignes: [], reste: 0, typeKey, numero: '', categorie: nouvelArticle.categorie || categorieDe(typeKey), horsCommande: true })
    setTailles({}); setNouvelArticle(null); setEtape('tailles')
  }

  const grille = article ? (SIZE_TYPES[article.typeKey]?.sizes || []) : []
  const taillesAffichees = article ? [...new Set([...grille, ...article.lignes.map(l => l.taille), ...Object.keys(tailles)])].sort((a, b) => ordreTaille(grille, a) - ordreTaille(grille, b)) : []
  const ligneDe = t => article?.lignes.find(l => l.taille === t)
  // En correction, le reste affiché ajoute ce que cette réception avait apporté (elle sera réécrite)
  const resteAffiche = t => { const l = ligneDe(t); if (!l) return null; return l.reste + (correction ? Math.max(0, Number(entree.sizes?.[t]) || 0) : 0) }
  const total = Object.values(tailles).reduce((s, q) => s + (Number(q) || 0), 0)
  function toucher(t) { setTailles(x => { const q = Math.max(0, (Number(x[t]) || 0) + (retirer ? -1 : 1)); const n = { ...x }; if (q) n[t] = q; else delete n[t]; return n }) }
  const [autreTaille, setAutreTaille] = useState('')

  function versCarton() {
    if (!article || !total) return
    setCarton(c => [...c.filter(x => x.cle !== article.cle), { ...article, tailles }])
    setArticle(null); setTailles({}); setEtape('article')
  }
  const cartonFinal = () => (article && total ? [...carton.filter(x => x.cle !== article.cle), { ...article, tailles }] : carton)
  const pairesCarton = cartonFinal().reduce((s, a) => s + Object.values(a.tailles).reduce((t, q) => t + q, 0), 0)

  // Paires non attendues (absentes de la commande ou au-delà du reste), à confirmer avant l'enregistrement
  function nonAttendues(liste) {
    return liste.flatMap(a => {
      const lignes = correction ? a.lignes.map(l => ({ ...l, reste: resteAffiche(l.taille) })) : a.lignes
      return horsCommande(a.tailles, lignes).map(h => ({ ...h, article: nomModele(a.code, a.couleur) }))
    })
  }
  async function enregistrer(confirme = false) {
    const liste = cartonFinal()
    if (!liste.length || !commandeEff) return
    const hors = nonAttendues(liste)
    if (hors.length && !confirme) { setConfirmHors(hors); return }
    setConfirmHors(null); setEnvoi(true); setErreur('')
    const pourBase = a => ({ code_modele: a.code, couleur: a.couleur, tailles: a.tailles, libelle: a.libelle || '', marque: nomMarque(commande?.fournisseur_id),
      numero: a.numero || '', categorie: a.categorie || '', type_key: a.typeKey || 'F', confirme_hors_commande: confirme && hors.some(h => h.article === nomModele(a.code, a.couleur)) })
    try {
      if (correction) {
        await corrigerReception(entree.id, date, pourBase(liste[0]))
        onToast({ texte: `Réception corrigée : ${pluriel(pairesCarton, 'paire')}` }); onFermer(); return
      }
      const ids = await enregistrerReception(commandeEff, date, liste.map(pourBase))
      const reste = (await lignesDe([commandeEff])).reduce((s, l) => s + l.reste, 0)
      onToast({ texte: `Réception enregistrée : ${pluriel(pairesCarton, 'paire')}${liste.length > 1 ? ` (${liste.length} modèles)` : ''}`,
        annuler: async () => { for (const id of ids) await db.entrees.delete(id) } })
      setBilan({ paires: pairesCarton, reste })
      setCarton([]); setArticle(null); setTailles({}); setEtape('article')
    } catch (e) { setErreur(messageErreur(e)) }
    setEnvoi(false)
  }

  const dirty = carton.length > 0 || (article && total > 0 && !correction)
  const [confirmFermer, setConfirmFermer] = useState(false)
  const fermer = () => (dirty ? setConfirmFermer(true) : onFermer())
  const q = formeComparaison(rech)
  const visibles = articles.filter(a => !q || [a.code, a.couleur, a.libelle, ...a.gencodes].some(x => formeComparaison(x).includes(q)))
    .sort((a, b) => (b.reste > 0) - (a.reste > 0))

  let corps
  if (d === undefined) corps = <div className="aide">Chargement…</div>
  else if (!d.mag) corps = <div className="encart att">Choisis d’abord le magasin de cet appareil.</div>
  else if (etape === 'commande') corps = (
    <>
      <p className="aide" style={{ marginTop: 0 }}>Commandes de <b>{magasinAppareil}</b> encore à recevoir :</p>
      {!ouvertes.length ? <div className="vide" style={{ padding: 24 }}>Aucune commande à recevoir pour ce magasin.</div> : (
        <div className="liste">
          {ouvertes.map(c => (
            <button key={c.id} className="ligne cf-carte" onClick={() => { setCommandeId(c.id); setEtape('article') }}>
              <span className="txt"><span className="t1">{nomMarque(c.fournisseur_id)}{c.type === 'reassort' && <span className="etat-mot info" style={{ marginLeft: 6 }}>réassort</span>}</span>
                <span className="t2">{(c.numeros_bc || []).length ? 'BC ' + c.numeros_bc.join(', ') : 'Sans n° de BC'} · reste {pluriel(c.reste, 'paire')}{c.livraison_prevue ? ' · prévue le ' + fmtJour(c.livraison_prevue) : ''}</span></span>
              <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 14 }}>
        {onRetour && <button className="lien" onClick={onRetour}>Saisir un retour</button>}
        {onSansCommande && <button className="lien" onClick={onSansCommande}>Entrée sans commande</button>}
      </div>
    </>
  )
  else if (etape === 'article') corps = (
    <>
      <div className="encart neutre" style={{ alignItems: 'center' }}>
        <span style={{ flex: 1 }}><b>{nomMarque(commande?.fournisseur_id)}</b>{(commande?.numeros_bc || []).length ? ' · BC ' + commande.numeros_bc.join(', ') : ''} · reste {pluriel(commande?.reste || 0, 'paire')}</span>
        {!correction && ouvertes.length > 1 && <button className="lien" onClick={() => { setCommandeId(null); setCarton([]); setEtape('commande') }}>Changer</button>}
      </div>
      {bilan && <div className="encart" style={{ display: 'block', marginTop: 10, background: 'var(--ok-teinte)', color: 'var(--ok)' }}>Enregistrée : {pluriel(bilan.paires, 'paire')}. Reste à livrer pour cette commande : <b>{pluriel(bilan.reste, 'paire')}</b>.</div>}
      {carton.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <span className="etiquette" style={{ marginTop: 0 }}>Dans ce carton</span>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {carton.map(a => <button key={a.cle} className="chip" aria-pressed="true" onClick={() => { setArticle(a); setTailles(a.tailles); setEtape('tailles') }}>
              {nomModele(a.code, a.couleur)}{a.numero ? ` (N° ${a.numero})` : ''} · {Object.values(a.tailles).reduce((s, x) => s + x, 0)}</button>)}
          </div>
        </div>
      )}
      <div className="recherche" style={{ marginTop: 12 }}><Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="Code, modèle, couleur, gencode…" value={rech} onChange={e => setRech(e.target.value)} aria-label="Rechercher un modèle" /></div>
      <div className="liste">
        {visibles.map(a => (
          <button key={a.cle} className={`ligne cf-carte${a.reste === 0 ? ' faible' : ''}`} onClick={() => choisirArticle(a)}>
            <span className="txt"><span className="t1">{a.libelle || a.code}{dansCarton(a.cle) && <span className="etat-mot info" style={{ marginLeft: 6 }}>dans le carton</span>}</span>
              <span className="t2">{a.code}{a.couleur ? ' · ' + a.couleur : ''} · reste {a.reste} / {a.commande}</span></span>
            <Icone nom="chevron" taille={18} style={{ color: 'var(--discret)' }} />
          </button>
        ))}
        {!visibles.length && <div className="aide" style={{ padding: 12 }}>Aucun modèle ne correspond.</div>}
      </div>
      {!nouvelArticle ? <button className="lien" style={{ marginTop: 10 }} onClick={() => setNouvelArticle({ code: rech, couleur: '', categorie: 'Femme' })}>Article absent de la commande…</button> : (
        <div className="carte" style={{ marginTop: 10 }}>
          <span className="etiquette" style={{ marginTop: 0 }}>Article hors commande</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="champ" style={{ flex: '1 1 140px' }} placeholder="Code modèle" value={nouvelArticle.code} onChange={e => setNouvelArticle(x => ({ ...x, code: e.target.value }))} aria-label="Code modèle" />
            <input className="champ" style={{ flex: '1 1 120px' }} placeholder="Couleur" value={nouvelArticle.couleur} onChange={e => setNouvelArticle(x => ({ ...x, couleur: e.target.value }))} aria-label="Couleur" />
          </div>
          <div className="chips" style={{ marginTop: 8, flexWrap: 'wrap' }}>{CATEGORIES.map(c => <button key={c} className="chip" aria-pressed={nouvelArticle.categorie === c} onClick={() => setNouvelArticle(x => ({ ...x, categorie: c }))}>{c}</button>)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn" onClick={() => setNouvelArticle(null)}>Annuler</button><button className="btn btn-prim" disabled={!nouvelArticle.code.trim()} onClick={articleHorsCommande}>Continuer</button></div>
        </div>
      )}
    </>
  )
  else corps = article ? (
    <>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{article.libelle || article.code}{article.horsCommande && <span className="etat-mot att" style={{ marginLeft: 6 }}>hors commande</span>}</div>
      <div className="aide" style={{ marginTop: 2 }}>{article.code}{article.couleur ? ' · ' + article.couleur : ''} · {nomMarque(commande?.fournisseur_id)}</div>
      <label className="etiquette" style={{ marginTop: 10 }}>N° du modèle <span className="aide">(gardé pour les prochaines réceptions de ce modèle)</span>
        <input className="champ" style={{ width: 140 }} inputMode="numeric" value={article.numero || ''} onChange={e => changerNumero(e.target.value)} aria-label="N° du modèle" placeholder="ex. 12" /></label>
      <div className="segment" role="group" aria-label="Ajouter ou retirer" style={{ marginTop: 12 }}>
        <button aria-pressed={!retirer} onClick={() => setRetirer(false)}>+ Ajouter</button>
        <button aria-pressed={retirer} onClick={() => setRetirer(true)}>− Retirer</button>
      </div>
      <div className="pointures" style={{ marginTop: 12 }}>
        {taillesAffichees.map(t => {
          const n = Number(tailles[t]) || 0, r = resteAffiche(t)
          // Même repère que le Cahier : reste après ce carton, « en plus » au-delà, « non attendu » hors commande
          const info = r == null ? (n ? 'non attendu' : '') : r - n > 0 ? `reste ${r - n}` : n > r ? `+${n - r} en plus` : (r ? 'complet' : '')
          return (
            <button key={t} className={`pt${n ? ' plein' : ''}${n && (r == null || n > r) ? ' negatif' : ''}`} onClick={() => toucher(t)} aria-label={`Pointure ${t}${n ? `, ${n} paire${n > 1 ? 's' : ''}` : ''}`}>
              {t}<small>{info || ' '}</small>{n > 0 && <span className="qte">{n}</span>}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input className="champ" style={{ width: 130 }} placeholder="Autre pointure" value={autreTaille} onChange={e => setAutreTaille(e.target.value)} aria-label="Autre pointure" />
        <button className="btn" disabled={!autreTaille.trim()} onClick={() => { const t = autreTaille.trim().replace(',', '.'); setTailles(x => ({ ...x, [t]: (Number(x[t]) || 0) + 1 })); setAutreTaille('') }}>Ajouter</button>
      </div>
      <p className="aide">Pointures pré-remplies avec le reste à livrer ; touche une pointure pour ajouter une paire (« − Retirer » pour en enlever).</p>
      {!correction && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => { setArticle(null); setTailles({}); setEtape('article') }}>Retour aux modèles</button>
        <button className="btn" disabled={!total} onClick={versCarton}>Ajouter un autre modèle</button>
      </div>}
    </>
  ) : <div className="aide">Chargement…</div>

  return (
    <>
      <div className="feuille-fond" onClick={fermer} />
      <div className="feuille saisie-entree" role="dialog" aria-label={correction ? 'Corriger la réception' : 'Réception'}>
        <div className="feuille-entete"><h2>{correction ? 'Corriger la réception' : 'Réception'}</h2><button className="icone-btn" onClick={fermer} aria-label="Fermer"><Icone nom="fermer" /></button></div>
        <div className="feuille-corps">
          {corps}
          {erreur && <div className="encart err" style={{ marginTop: 12 }}>{erreur}</div>}
        </div>
        {(etape === 'tailles' || carton.length > 0) && (
          <div className="feuille-pied" style={{ flexWrap: 'wrap', gap: 10 }}>
            <label className="etiquette" style={{ margin: 0 }}>Date<input type="date" className="champ" style={{ width: 'auto' }} value={frVersIso(date)} onChange={e => setDate(isoVersFr(e.target.value))} /></label>
            <span className="total"><b>{pluriel(pairesCarton, 'paire')}</b></span>
            <button className="btn btn-prim" disabled={!pairesCarton || envoi} onClick={() => enregistrer()}>{envoi ? 'Enregistrement…' : correction ? 'Enregistrer la correction' : 'Enregistrer la réception'}</button>
          </div>
        )}
      </div>
      {confirmHors && (
        <Confirmation titre="Paires non attendues" confirmer="Enregistrer « hors commande »" onAnnuler={() => setConfirmHors(null)} onConfirmer={() => enregistrer(true)}
          texte="Ces paires ne sont pas dans la commande, ou dépassent le reste à livrer. Elles seront enregistrées avec la mention « hors commande », à régulariser par la Direction.">
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{confirmHors.map((h, i) => <li key={i}>{h.article} · {h.taille} : {pluriel(h.qte, 'paire')} ({h.raison})</li>)}</ul>
        </Confirmation>
      )}
      {confirmFermer && <Confirmation danger titre="Abandonner cette réception ?" texte="Les modèles du carton ne sont pas encore enregistrés." confirmer="Abandonner" annuler="Continuer la saisie"
        onAnnuler={() => setConfirmFermer(false)} onConfirmer={onFermer} />}
    </>
  )
}

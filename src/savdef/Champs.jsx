import { useState } from 'react'
import { db } from '../db'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { nomPropre, formeComparaison, marquesSemblables } from '../cahier/commun'
import { coordMarque, enregistrerEmailMagasin } from '../reassort/mail'
import { nbPaires, resumePaires } from './paires'

// Champs partagés des saisies SAV et défectueux (charte de la refonte)

// Salarié : un toucher sur son prénom (salariés du magasin) ; « Autre » pour taper un nom
export function ChoixSalarie({ valeur, onChange, salaries }) {
  const noms = salaries.map(s => s.nom)
  // « Autre » : choisi par l'utilisateur, ou nom absent de la liste (une fois la liste chargée)
  const [autre, setAutre] = useState(false)
  const libre = autre || (!!valeur && noms.length > 0 && !noms.includes(valeur))
  return (
    <>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {noms.map(n => <button key={n} type="button" className="chip" aria-pressed={!libre && valeur === n} onClick={() => { setAutre(false); onChange(valeur === n ? '' : n) }}>{n}</button>)}
        <button type="button" className="chip" aria-pressed={libre} onClick={() => { setAutre(!libre); onChange('') }}>Autre</button>
      </div>
      {libre && <input className="champ" style={{ marginTop: 8 }} autoFocus value={valeur} onChange={e => onChange(e.target.value)} placeholder="Nom et prénom" />}
    </>
  )
}

// Marque : recherche dans le répertoire ; création possible avec les garde-fous du Cahier
// (même nom écrit autrement → marque existante ; nom proche → « Tu voulais dire… ? » ; confirmation du nom exact)
export function ChoixMarque({ fournisseurs, valeurId, onChoisir, onErreur }) {
  const [ouvert, setOuvert] = useState(!valeurId)
  const [rech, setRech] = useState('')
  const [confirmer, setConfirmer] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const actuelle = fournisseurs.find(f => f.id === Number(valeurId))
  const noms = fournisseurs.map(f => f.nom)
  const q = rech.trim().toLowerCase()
  const trouvees = fournisseurs.filter(f => !q || f.nom.toLowerCase().includes(q))
  const nomNouveau = nomPropre(rech)
  const existante = nomNouveau ? fournisseurs.find(f => formeComparaison(f.nom) === formeComparaison(nomNouveau)) : null
  const semblables = existante ? [] : marquesSemblables(nomNouveau, noms).filter(n => !trouvees.some(f => f.nom === n))
  const choisir = f => { onChoisir(f.id, f.nom); setOuvert(false); setRech('') }

  async function creer() {
    setConfirmer(false); if (!nomNouveau || enCours) return
    setEnCours(true)
    try {
      const deja = (await db.fournisseurs.toArray()).find(f => formeComparaison(f.nom) === formeComparaison(nomNouveau))
      if (deja) { choisir(deja); return }
      const id = await db.fournisseurs.add({ nom: nomNouveau, modelesBySeason: {} })
      choisir({ id, nom: nomNouveau })
    } catch (err) { onErreur?.('Création de la marque impossible : ' + (err.message || 'vérifie la connexion et réessaie.')) }
    finally { setEnCours(false) }
  }

  if (!ouvert) return <button type="button" className="champ valeur" onClick={() => setOuvert(true)}><b>{actuelle?.nom || 'Choisir la marque'}</b><Icone nom="bas" taille={18} style={{ color: 'var(--discret)' }} /></button>
  return (
    <div className="choix-liste">
      <input className="champ" autoFocus placeholder="Rechercher ou créer une marque" value={rech} onChange={e => setRech(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (trouvees.length === 1) choisir(trouvees[0]); else if (existante) choisir(existante) } }} />
      <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
        {trouvees.slice(0, 80).map(f => (
          <button type="button" key={f.id} className="ligne" style={{ minHeight: 48 }} onClick={() => choisir(f)}>
            <span className="txt"><span className="t1">{f.nom}</span></span>{f.id === Number(valeurId) && <Icone nom="check" taille={18} style={{ color: 'var(--action-texte)' }} />}
          </button>
        ))}
        {existante && !trouvees.includes(existante) && (
          <button type="button" className="ligne" style={{ minHeight: 48 }} onClick={() => choisir(existante)}><span className="txt"><span className="t1">{existante.nom}</span><div className="t2">Marque déjà enregistrée sous ce nom</div></span></button>
        )}
        {semblables.length > 0 && <>
          <div className="etiquette" style={{ padding: '10px 14px 4px', margin: 0 }}>Tu voulais dire… ?</div>
          {semblables.map(n => { const f = fournisseurs.find(x => x.nom === n); return (
            <button type="button" key={'s' + f.id} className="ligne" style={{ minHeight: 48 }} onClick={() => choisir(f)}><span className="txt"><span className="t1">{n}</span><div className="t2">Marque existante au nom proche</div></span></button>
          ) })}
        </>}
        {nomNouveau && !existante && (
          <button type="button" className="ligne" style={{ minHeight: 52, color: 'var(--action-texte)' }} onClick={() => setConfirmer(true)} disabled={enCours}>
            <Icone nom="ajout" taille={18} /><span className="txt"><span className="t1" style={{ color: 'inherit' }}>{enCours ? 'Création…' : `${semblables.length || trouvees.length ? 'Non, créer' : 'Créer'} la marque « ${nomNouveau} »`}</span>
              <div className="t2">Marque absente de la liste : elle sera ajoutée pour tous les magasins</div></span>
          </button>
        )}
        {!trouvees.length && !nomNouveau && <div className="vide" style={{ padding: 16 }}>Aucune marque enregistrée.</div>}
      </div>
      {actuelle && <button type="button" className="lien" style={{ marginTop: 6 }} onClick={() => setOuvert(false)}>Garder {actuelle.nom}</button>}
      {confirmer && (
        <Confirmation titre="Créer cette marque ?" confirmer="Créer la marque" annuler="Revenir" onAnnuler={() => setConfirmer(false)} onConfirmer={creer}
          texte={<>La marque sera enregistrée exactement ainsi :<span className="nom-exact">{nomNouveau}</span>
            {marquesSemblables(nomNouveau, noms).length > 0 ? <>Attention, des marques proches existent déjà : <b>{marquesSemblables(nomNouveau, noms).join(', ')}</b>. Si c'est la même, choisis-la plutôt.<br /></> : null}
            Elle apparaîtra dans la liste des marques de tous les magasins.</>} />
      )}
    </div>
  )
}

// Modèle : modèles de la marque (toutes saisons) ; « Ajouter le modèle » l'enregistre pour la saison (comme aujourd'hui)
export function ChoixModele({ modeles, valeur, onChoisir, onAjouter, desactive }) {
  const [ouvert, setOuvert] = useState(!valeur)
  const [rech, setRech] = useState('')
  if (desactive) return <div className="champ valeur" style={{ color: 'var(--discret)' }}>Choisis d'abord la marque</div>
  if (!ouvert && valeur) return <button type="button" className="champ valeur" onClick={() => setOuvert(true)}><b>{valeur}</b><Icone nom="bas" taille={18} style={{ color: 'var(--discret)' }} /></button>
  const q = rech.trim().toLowerCase(), net = rech.trim()
  const vus = modeles.filter(m => !q || m.toLowerCase().includes(q))
  const choisir = m => { onChoisir(m); setOuvert(false); setRech('') }
  return (
    <div className="choix-liste">
      <input className="champ" autoFocus placeholder="Rechercher ou ajouter un modèle" value={rech} onChange={e => setRech(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (vus.length === 1) choisir(vus[0]) } }} />
      <div className="liste" style={{ background: 'var(--carte-2)', marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
        {vus.map(m => <button type="button" key={m} className="ligne" style={{ minHeight: 48 }} onClick={() => choisir(m)}><span className="txt"><span className="t1">{m}</span></span></button>)}
        {net && !modeles.some(m => m.toLowerCase() === q) && (
          <button type="button" className="ligne" style={{ minHeight: 52, color: 'var(--action-texte)' }} onClick={async () => { await onAjouter(net); choisir(net) }}>
            <Icone nom="ajout" taille={18} /><span className="txt"><span className="t1" style={{ color: 'inherit' }}>Ajouter le modèle « {net} »</span><div className="t2">Ajouté à la liste des modèles de la marque pour la saison</div></span>
          </button>
        )}
        {!vus.length && !net && <div className="vide" style={{ padding: 16 }}>Aucun modèle enregistré : tape le nom du modèle.</div>}
      </div>
      {valeur && <button type="button" className="lien" style={{ marginTop: 6 }} onClick={() => setOuvert(false)}>Garder {valeur}</button>}
    </div>
  )
}

// Pointure : pointures reçues du modèle (Cahier) ; « Autre » pour taper une pointure si libre est permis
export function ChoixPointure({ tailles, valeur, onChange, libre = true, desactive }) {
  const liste = valeur && !tailles.includes(valeur) && !libre ? [valeur, ...tailles] : tailles
  const [autre, setAutre] = useState(false)   // pointures reçues chargées après coup : « Autre » seulement si la pointure n'y est pas
  const saisie = libre && (autre || (!!valeur && tailles.length > 0 && !tailles.includes(valeur)))
  const setSaisie = setAutre
  if (desactive) return <div className="champ valeur" style={{ color: 'var(--discret)' }}>Choisis d'abord le modèle</div>
  return (
    <>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {liste.map(t => <button key={t} type="button" className="chip" aria-pressed={!saisie && valeur === t} onClick={() => { setSaisie(false); onChange(valeur === t ? '' : t) }}>{t}</button>)}
        {libre && <button type="button" className="chip" aria-pressed={saisie} onClick={() => { setSaisie(!saisie); onChange('') }}>Autre</button>}
      </div>
      {!liste.length && !libre && <div className="aide" style={{ marginTop: 4 }}>Aucune pointure reçue pour ce modèle.</div>}
      {saisie && <input className="champ" style={{ marginTop: 8 }} autoFocus inputMode="decimal" value={valeur} onChange={e => onChange(e.target.value)} placeholder="Ex. 42" />}
    </>
  )
}

// Paires (défectueux, retour client) : un toucher = une paire de plus dans la pointure ; « − » en retire une.
// valeur = { pointure: nombre de paires } ; « Autre pointure » pour taper une pointure si libre est permis
export function ChoixPaires({ tailles, valeur, onChange, libre = true, desactive }) {
  const [autre, setAutre] = useState('')
  const [saisie, setSaisie] = useState(false)
  if (desactive) return <div className="champ valeur" style={{ color: 'var(--discret)' }}>Choisis d'abord le modèle</div>
  const choisies = Object.keys(valeur).filter(p => valeur[p] > 0).sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b))
  const liste = [...tailles, ...choisies.filter(p => !tailles.includes(p))]
  const ajouter = (p, n = 1) => { const q = (valeur[p] || 0) + n; const v = { ...valeur }; if (q > 0) v[p] = q; else delete v[p]; onChange(v) }
  const n = nbPaires(valeur)
  function valider() {
    const p = autre.trim().replace(',', '.')
    if (p) ajouter(p)
    setAutre(''); setSaisie(false)
  }
  return (
    <>
      {liste.length > 0 && <div className="pointures">
        {liste.map(t => {
          const q = valeur[t] || 0
          return <button key={t} type="button" className={`pt retour${q ? ' plein' : ''}`} onClick={() => ajouter(t)} aria-label={`Pointure ${t}${q ? ', ' + q + ' paire(s)' : ''}`}>
            {t}<small> </small>{q > 0 && <span className="qte">{q}</span>}
          </button>
        })}
      </div>}
      {!liste.length && !libre && <div className="aide" style={{ marginTop: 4 }}>Aucune pointure reçue pour ce modèle.</div>}
      {saisie && <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input className="champ" autoFocus inputMode="decimal" value={autre} onChange={e => setAutre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') valider() }} placeholder="Ex. 42" />
        <button type="button" className="btn" onClick={valider}>Ajouter</button>
      </div>}
      <div className="liens-pointures">
        {choisies.map(p => <button key={p} type="button" className="lien" onClick={() => ajouter(p, -1)} aria-label={`Retirer une paire en ${p}`}>− {p}</button>)}
        {n > 0 && <button type="button" className="lien" onClick={() => onChange({})}>Vider</button>}
        {libre && !saisie && <button type="button" className="lien" onClick={() => setSaisie(true)}>Autre pointure</button>}
      </div>
      {n > 0 && <div className="aide" style={{ marginTop: 6 }}><b style={{ color: 'var(--texte)' }}>{n} paire{n > 1 ? 's' : ''}</b>{n > 1 ? ` : ${resumePaires(valeur)}` : ''}</div>}
    </>
  )
}

// Étapes après l'enregistrement : proposer le mail au SAV de la marque, puis enregistrer l'adresse tapée dans le répertoire
export function EtapesMail({ texteEnregistre, fournisseur, magasinId, onEnvoyer, onTerminer }) {
  const [email, setEmail] = useState('')
  const [etape, setEtape] = useState('mail')     // 'mail' | 'contact'
  const connu = coordMarque(fournisseur, magasinId, 'email')   // adresse du magasin, sinon de la marque
  if (etape === 'contact') return (
    <>
      <div className="feuille-corps">
        <p style={{ marginTop: 0 }}>Le mail est préparé pour <b>{email}</b>.</p>
        <p>Enregistrer cette adresse dans le Répertoire de <b>{fournisseur?.nom}</b>, pour ce magasin ?</p>
      </div>
      <div className="feuille-pied">
        <button className="btn" onClick={onTerminer}>Non, terminer</button>
        <button className="btn btn-prim" onClick={async () => { try { await db.fournisseurs.update(fournisseur.id, { coordsMagasin: enregistrerEmailMagasin(fournisseur, magasinId, email) }) } catch { /* ignore */ } onTerminer() }}>Enregistrer dans le répertoire</button>
      </div>
    </>
  )
  return (
    <>
      <div className="feuille-corps">
        <div className="encart neutre" style={{ marginBottom: 14 }}><Icone nom="check" taille={20} />{texteEnregistre}</div>
        <p style={{ margin: '0 0 8px' }}>Envoyer un mail au <b>SAV de {fournisseur?.nom}</b> ?</p>
        {connu ? <div className="aide">→ {connu}</div> : <>
          <div className="encart att" style={{ marginBottom: 8 }}>Aucune adresse SAV dans le répertoire pour cette marque.</div>
          <input className="champ" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Adresse mail du SAV de la marque" />
        </>}
      </div>
      <div className="feuille-pied">
        <button className="btn" onClick={onTerminer}>Non, terminer</button>
        <button className="btn btn-prim" disabled={!connu && !email.trim()} onClick={async () => { await onEnvoyer(connu || email.trim()); if (!connu) setEtape('contact'); else onTerminer() }}>
          <Icone nom="mail" taille={20} />Envoyer le mail
        </button>
      </div>
    </>
  )
}

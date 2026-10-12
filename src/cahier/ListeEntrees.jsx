import { useState, useMemo, useEffect } from 'react'
import { db } from '../db'
import { SOCIETES } from '../data/societes'
import Icone from '../components/ui/Icone'
import Confirmation from '../components/ui/Confirmation'
import { Numero, Statut } from './Reperes'
import { STATUTS, libelleStatut, cleDate, libelleJour, fmtEur, pluriel } from './commun'

const PAR_PAGE = 50
const FILTRES_VIDES = { societe: '', magasin: null, marque: '', categorie: '', statut: '', pointe: '' }   // magasin null = celui de l'appareil
const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b))

// Liste des entrées de la saison : recherche, filtres, regroupement par jour, sélection multiple, pointage (Direction)
export default function ListeEntrees({ entrees, magasinAppareil, estDirection, estPointe, onPointer, onOuvrir, onToast, onModeSelection }) {
  const [recherche, setRecherche] = useState('')
  const [rapide, setRapide]       = useState('toutes')   // toutes | apointer | retours
  const [filtres, setFiltres]     = useState(FILTRES_VIDES)
  const [feuilleFiltres, setFeuilleFiltres] = useState(false)
  const [nb, setNb]               = useState(PAR_PAGE)
  const [selection, setSelection] = useState(null)        // null = pas en mode sélection ; sinon Set d'ids
  const [choixStatut, setChoixStatut] = useState(false)    // feuille « Changer le statut »
  const [suppr, setSuppr] = useState(null)                  // confirmation de suppression en lot : { lignes, bloquees, lies }
  const [tape, setTape] = useState('')                      // nombre à retaper au-delà de 5 entrées
  useEffect(() => { onModeSelection?.(!!selection) }, [selection, onModeSelection])

  const magasinFiltre = filtres.magasin === null ? magasinAppareil : filtres.magasin   // '' = tous les magasins
  const plusieursMagasins = !magasinFiltre
  const f = filtres
  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return entrees.filter(e => {
      if (magasinFiltre && e.magasin !== magasinFiltre) return false
      if (f.societe && e.societe !== f.societe) return false
      if (f.marque && e.marque !== f.marque) return false
      if (f.categorie && e.categorie !== f.categorie) return false
      if (f.statut && (f.statut === 'aucun' ? e.statut : e.statut !== f.statut)) return false
      if (estDirection && f.pointe === 'oui' && !estPointe(e)) return false
      if (estDirection && f.pointe === 'non' && estPointe(e)) return false
      if (rapide === 'apointer' && estPointe(e)) return false
      if (rapide === 'retours' && e.statut !== 'Retour') return false
      if (q && !`${e.marque} ${e.modele || ''} ${e.numero || ''}`.toLowerCase().includes(q)) return false
      return true
    }).sort((a, b) => cleDate(b.date).localeCompare(cleDate(a.date)) || (b.id || 0) - (a.id || 0))
  }, [entrees, recherche, rapide, f, magasinFiltre, estDirection, estPointe])

  const nbFiltres = [f.societe, f.marque, f.categorie, f.statut, estDirection && f.pointe, filtres.magasin !== null].filter(Boolean).length
  const visibles = filtrees.slice(0, nb)
  const parJour = []
  for (const e of visibles) { const g = parJour[parJour.length - 1]; if (g && g.date === e.date) g.lignes.push(e); else parJour.push({ date: e.date, lignes: [e] }) }
  const aPointer = estDirection ? entrees.filter(e => (!magasinFiltre || e.magasin === magasinFiltre) && !estPointe(e)).length : 0

  const sel = selection || new Set()
  const basculerSel = id => setSelection(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toutSelectionne = filtrees.length > 0 && filtrees.every(e => sel.has(e.id))
  // Changement de statut groupé (comme l'outil actuel), avec « Annuler » qui remet les statuts d'avant
  async function appliquerStatut(statut) {
    const ids = [...sel]; if (!ids.length) return
    const avant = Object.fromEntries(entrees.filter(e => sel.has(e.id)).map(e => [e.id, e.statut || '']))
    setChoixStatut(false)
    let echecs = 0
    for (const id of ids) { try { await db.entrees.update(id, { statut }) } catch { echecs++ } }
    onToast(echecs ? { texte: `${ids.length - echecs} entrée(s) modifiée(s), ${echecs} en échec : vérifiez la connexion.` }
      : { texte: `Statut « ${libelleStatut(statut)} » appliqué à ${pluriel(ids.length, 'entrée')}`,
          annuler: async () => { for (const [id, st] of Object.entries(avant)) { try { await db.entrees.update(Number(id), { statut: st }) } catch { /* ignore */ } } } })
    setSelection(null)
  }
  function pointerSel(val) { onPointer([...sel], val); setSelection(null) }

  // Suppression en lot. Protections : confirmation avec le détail, nombre à retaper au-delà de 5 entrées,
  // entrées pointées exclues pour un compte magasin, « Annuler » pendant 10 s (remet les lignes avec leur numéro d'origine).
  async function preparerSuppression() {
    const choisies = entrees.filter(e => sel.has(e.id))
    const bloquees = estDirection ? [] : choisies.filter(e => estPointe(e))
    const lignes = choisies.filter(e => !bloquees.includes(e))
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
    const copies = faites.map(e => { const brut = { ...e }; delete brut.magasin; delete brut.marque; delete brut.societe; return brut })
    const remettre = async () => {
      let ko = 0
      for (const c of copies) { try { await db.entrees.put(c) } catch { ko++ } }
      onToast(ko ? { texte: `${ko} entrée(s) n'ont pas pu être remises : vérifiez la connexion.` } : { texte: `${pluriel(copies.length, 'entrée')} remise${copies.length > 1 ? 's' : ''}` })
    }
    onToast(echecs ? { texte: `${pluriel(faites.length, 'entrée')} supprimée(s), ${echecs} en échec : vérifiez la connexion.`, annuler: faites.length ? remettre : undefined, duree: 10000 }
      : { texte: `${pluriel(faites.length, 'entrée')} supprimée${faites.length > 1 ? 's' : ''}`, annuler: remettre, duree: 10000 })
    setSelection(null)
  }

  const opts = (cle) => uniq(entrees.map(e => e[cle]))
  const statutsPresents = STATUTS.filter(s => s && entrees.some(e => e.statut === s))

  return (
    <div>
      <div className="recherche">
        <Icone nom="cherche" taille={20} style={{ color: 'var(--discret)' }} />
        <input className="champ" placeholder="Marque, modèle ou N°" value={recherche} onChange={e => { setRecherche(e.target.value); setNb(PAR_PAGE) }} aria-label="Rechercher" />
      </div>
      <div className="barre-filtres">
        <div className="chips" style={{ flex: 1 }}>
          <button className="chip" aria-pressed={rapide === 'toutes'} onClick={() => setRapide('toutes')}>Toutes</button>
          {estDirection && <button className="chip" aria-pressed={rapide === 'apointer'} onClick={() => setRapide('apointer')}>À pointer <span style={{ opacity: .6 }}>{aPointer}</span></button>}
          <button className="chip" aria-pressed={rapide === 'retours'} onClick={() => setRapide('retours')}>Retours</button>
        </div>
        <button className="chip" aria-pressed={nbFiltres > 0} onClick={() => setFeuilleFiltres(true)}><Icone nom="filtre" taille={18} />Filtres{nbFiltres ? ` · ${nbFiltres}` : ''}</button>
        <button className="chip" aria-pressed={!!selection} onClick={() => setSelection(s => s ? null : new Set())}>{selection ? 'Terminer' : 'Sélectionner'}</button>
      </div>
      {magasinFiltre && <div className="sous-info">{magasinFiltre}{filtres.magasin === null ? ' · magasin de cet appareil' : ''} · {pluriel(filtrees.length, 'entrée')}</div>}
      {plusieursMagasins && <div className="sous-info">Tous les magasins · {pluriel(filtrees.length, 'entrée')}</div>}

      {!filtrees.length && (
        <div className="vide">{entrees.length ? <>Aucune entrée ne correspond.<br /><button className="lien" onClick={() => { setFiltres(FILTRES_VIDES); setRapide('toutes'); setRecherche('') }}>Tout afficher</button></> : 'Aucune entrée pour cette saison — touchez « Nouvelle entrée ».'}</div>
      )}

      {parJour.map(g => (
        <section key={g.date}>
          <h2 className="groupe-titre">{libelleJour(g.date)}</h2>
          <div className="liste">
            {g.lignes.map(e => {
              const pt = estDirection && estPointe(e)
              return (
                <div key={e.id} className={`ligne ligne-entree${pt ? ' faible' : ''}${sel.has(e.id) ? ' choisie' : ''}`}>
                  {selection && (
                    <button className="case" role="checkbox" aria-checked={sel.has(e.id)} aria-label="Sélectionner" onClick={() => basculerSel(e.id)}>
                      <span>{sel.has(e.id) && <Icone nom="check" taille={16} />}</span>
                    </button>
                  )}
                  <button className="zone-ouvrir" onClick={() => selection ? basculerSel(e.id) : onOuvrir(e)}>
                    <span className="txt">
                      <span className="t1">{e.marque} <span>· {e.modele || 'sans modèle'}</span><Numero n={e.numero} /></span>
                      <span className="t2">{estDirection || plusieursMagasins ? e.magasin + ' · ' : ''}{pluriel(e.total || 0, 'paire')} · {e.pht ? fmtEur(e.pht) : '—'}</span>
                    </span>
                    <Statut s={e.statut} />
                  </button>
                  {estDirection && !selection && (
                    <button className="pointer" aria-pressed={pt} aria-label={pt ? 'Dépointer' : 'Pointer'} title={pt ? 'Dépointer' : 'Pointer'} onClick={() => onPointer([e.id], !pt)}>
                      <span><Icone nom="check" taille={16} /></span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {filtrees.length > nb && <div style={{ textAlign: 'center', marginTop: 16 }}><button className="btn" onClick={() => setNb(n => n + PAR_PAGE)}>Afficher {Math.min(PAR_PAGE, filtrees.length - nb)} de plus ({filtrees.length - nb} restantes)</button></div>}

      {selection && <div style={{ height: 120 }} aria-hidden="true" />}
      {selection && (
        <div className="barre-selection" role="toolbar" aria-label="Actions sur la sélection">
          <b className="compte-selection">{sel.size ? pluriel(sel.size, 'sélectionnée') : 'Touchez les lignes à sélectionner'}</b>
          <div className="actions-selection">
            <button className="btn btn-prim" disabled={!sel.size} onClick={() => setChoixStatut(true)}>Changer le statut</button>
            {estDirection && <button className="btn" disabled={!sel.size} onClick={() => pointerSel(true)}>Pointer</button>}
            {estDirection && <button className="btn" disabled={!sel.size} onClick={() => pointerSel(false)}>Dépointer</button>}
            <button className="btn" onClick={() => setSelection(toutSelectionne ? new Set() : new Set(filtrees.map(e => e.id)))}>{toutSelectionne ? 'Tout désélectionner' : `Tout sélectionner (${filtrees.length})`}</button>
            <button className="btn btn-ghost" onClick={() => setSelection(null)}>Annuler</button>
          </div>
          <div className="action-danger-selection">
            <button className="btn btn-danger-plein" disabled={!sel.size} onClick={preparerSuppression}>Supprimer</button>
          </div>
        </div>
      )}
      {suppr && (() => {
        const n = suppr.lignes.length, paires = suppr.lignes.reduce((t, e) => t + (Number(e.total) || 0), 0)
        const aTaper = n > 5
        const bloq = suppr.bloquees.length ? `${pluriel(suppr.bloquees.length, 'entrée')} déjà pointée${suppr.bloquees.length > 1 ? 's' : ''} par la Direction ne ${suppr.bloquees.length > 1 ? 'seront' : 'sera'} pas supprimée${suppr.bloquees.length > 1 ? 's' : ''}. ` : ''
        if (!n) return <Confirmation titre="Suppression impossible" texte={`${bloq}Seule la Direction peut supprimer une entrée pointée.`} confirmer="Compris" annuler="Fermer" onConfirmer={() => setSuppr(null)} onAnnuler={() => setSuppr(null)} />
        return (
          <Confirmation danger titre={`Supprimer ${pluriel(n, 'entrée')} ?`} confirmer="Supprimer" actif={!aTaper || tape.trim() === String(n)}
            texte={`${pluriel(n, 'entrée')} · ${pluriel(paires, 'paire')} au total. ${bloq}`} onAnnuler={() => setSuppr(null)} onConfirmer={supprimerSel}>
            <ul className="liste-resume">
              {suppr.lignes.slice(0, 5).map(e => <li key={e.id}><span>{e.marque} · {e.modele || 'sans modèle'}</span><span>{e.date} · {e.total || 0} p.</span></li>)}
              {n > 5 && <li><span>… et {pluriel(n - 5, 'autre entrée')}</span><span /></li>}
            </ul>
            {suppr.lies > 0 && <div className="encart att" style={{ marginBottom: 14 }}>{suppr.lies > 1 ? `${suppr.lies} défectueux sont liés` : 'Un défectueux est lié'} à ces entrées : {suppr.lies > 1 ? 'ils resteront' : 'il restera'} dans la Gestion des défectueux.</div>}
            {aTaper && <label className="champ-confirmer" style={{ display: 'block' }}>
              <span className="etiquette">Pour confirmer, tapez le nombre d'entrées : <b>{n}</b></span>
              <input className="champ" inputMode="numeric" autoFocus value={tape} onChange={ev => setTape(ev.target.value)} aria-label="Nombre d'entrées à supprimer" />
            </label>}
          </Confirmation>
        )
      })()}
      {choixStatut && (
        <>
          <div className="feuille-fond" style={{ zIndex: 960 }} onClick={() => setChoixStatut(false)} />
          <div className="feuille bas" style={{ zIndex: 961 }} role="dialog" aria-label="Changer le statut">
            <div className="feuille-entete"><h2>Statut de {pluriel(sel.size, 'entrée')}</h2><button className="icone-btn" onClick={() => setChoixStatut(false)} aria-label="Fermer"><Icone nom="fermer" /></button></div>
            <div className="feuille-corps">
              <div className="liste" style={{ background: 'var(--carte-2)' }}>
                {STATUTS.map(st => (
                  <button key={st || 'aucun'} className="ligne" style={{ minHeight: 52 }} onClick={() => appliquerStatut(st)}>
                    <span className="txt">{st ? <Statut s={st} /> : <span className="t1" style={{ fontWeight: 500 }}>Aucun (vider le statut)</span>}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {feuilleFiltres && (
        <>
          <div className="feuille-fond" onClick={() => setFeuilleFiltres(false)} />
          <div className="feuille" role="dialog" aria-label="Filtres">
            <div className="feuille-entete"><h2>Filtres</h2><button className="icone-btn" onClick={() => setFeuilleFiltres(false)} aria-label="Fermer"><Icone nom="fermer" /></button></div>
            <div className="feuille-corps champs-filtres">
              <label className="etiquette">Magasin
                <select className="champ" value={filtres.magasin === null ? '__appareil' : filtres.magasin} onChange={e => setFiltres(x => ({ ...x, magasin: e.target.value === '__appareil' ? null : e.target.value }))}>
                  <option value="__appareil">{magasinAppareil} (cet appareil)</option>
                  <option value="">Tous les magasins</option>
                  {opts('magasin').filter(m => m !== magasinAppareil).map(m => <option key={m}>{m}</option>)}
                </select></label>
              <label className="etiquette">Société
                <select className="champ" value={f.societe} onChange={e => setFiltres(x => ({ ...x, societe: e.target.value }))}>
                  <option value="">Toutes les sociétés</option>{SOCIETES.map(s => <option key={s}>{s}</option>)}
                </select></label>
              <label className="etiquette">Marque
                <select className="champ" value={f.marque} onChange={e => setFiltres(x => ({ ...x, marque: e.target.value }))}>
                  <option value="">Toutes les marques</option>{opts('marque').map(m => <option key={m}>{m}</option>)}
                </select></label>
              <label className="etiquette">Catégorie
                <select className="champ" value={f.categorie} onChange={e => setFiltres(x => ({ ...x, categorie: e.target.value }))}>
                  <option value="">Toutes les catégories</option>{opts('categorie').map(c => <option key={c}>{c}</option>)}
                </select></label>
              <label className="etiquette">Statut
                <select className="champ" value={f.statut} onChange={e => setFiltres(x => ({ ...x, statut: e.target.value }))}>
                  <option value="">Tous les statuts</option><option value="aucun">Aucun</option>
                  {statutsPresents.map(s => <option key={s} value={s}>{libelleStatut(s)}</option>)}
                </select></label>
              {estDirection && (
                <label className="etiquette">Pointage
                  <select className="champ" value={f.pointe} onChange={e => setFiltres(x => ({ ...x, pointe: e.target.value }))}>
                    <option value="">Pointées et non pointées</option><option value="non">Non pointées</option><option value="oui">Pointées</option>
                  </select></label>
              )}
            </div>
            <div className="feuille-pied">
              <button className="btn btn-ghost" onClick={() => setFiltres(FILTRES_VIDES)}>Réinitialiser</button>
              <span style={{ flex: 1 }} />
              <button className="btn btn-prim" onClick={() => setFeuilleFiltres(false)}>Afficher {pluriel(filtrees.length, 'entrée')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

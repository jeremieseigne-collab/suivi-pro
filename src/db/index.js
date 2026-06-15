import { supabase } from '../lib/supabase'

// ─── Mapping camelCase JS ↔ snake_case Postgres ───────────────────────────────
const FIELD_TO_DB = {
  fournisseurs:    { modelesBySeason: 'modeles_by_season', contactSav: 'contact_sav', telephoneFixe: 'telephone_fixe', numeroClient: 'numero_client' },
  parametres:      { fournisseurId: 'fournisseur_id', magasinId: 'magasin_id', recuN1: 'recu_n1', objectifN: 'objectif_n', reelN: 'reel_n', prixModeles: 'prix_modeles', modelesSizes: 'modeles_sizes', modelesTypes: 'modeles_types' },
  entrees:         { magasinId: 'magasin_id', fournisseurId: 'fournisseur_id', typeKey: 'type_key' },
  modes_reglement: { fournisseurId: 'fournisseur_id', magasinId: 'magasin_id', modeReglement: 'mode_reglement' },
  suivi:           { fournisseurId: 'fournisseur_id', magasinId: 'magasin_id' },
  commandes:       { createdAt: 'created_at', clientNom: 'client_nom', clientPrenom: 'client_prenom' },
  evenements:      { createdAt: 'created_at' },
  defectueux:      { createdAt: 'created_at', magasinId: 'magasin_id', fournisseurId: 'fournisseur_id', entreeId: 'entree_id' },
  paie_variables:  { createdAt: 'created_at' },
  paie_envois:     { sentAt: 'sent_at' },
  planning:        { heureDebut: 'heure_debut', heureFin: 'heure_fin', createdAt: 'created_at' },
}

const FIELD_FROM_DB = {}
for (const [table, map] of Object.entries(FIELD_TO_DB)) {
  FIELD_FROM_DB[table] = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]))
}

function toDb(table, obj) {
  const map = FIELD_TO_DB[table] || {}
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id') continue // never write id in updates
    result[map[k] || k] = v
  }
  return result
}

function fromDb(table, obj) {
  if (!obj) return obj
  const map = FIELD_FROM_DB[table] || {}
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] || k] = v
  }
  return result
}

function dbf(table, field) {
  return FIELD_TO_DB[table]?.[field] || field
}

// ─── Classe de compatibilité Dexie → Supabase ─────────────────────────────────
class SupabaseTable {
  constructor(name) { this.name = name }

  _from(obj) { return fromDb(this.name, obj) }
  _fromAll(rows) { return (rows || []).map(r => this._from(r)) }
  _to(obj) { return toDb(this.name, obj) }
  _f(field) { return dbf(this.name, field) }

  async toArray() {
    const { data, error } = await supabase.from(this.name).select('*').limit(50000)
    if (error) throw error
    return this._fromAll(data)
  }

  async get(id) {
    const { data, error } = await supabase.from(this.name).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? this._from(data) : undefined
  }

  orderBy(field) {
    const self = this
    return {
      toArray: async () => {
        const { data, error } = await supabase.from(self.name).select('*').order(self._f(field)).limit(50000)
        if (error) throw error
        return self._fromAll(data)
      }
    }
  }

  where(fieldOrObj) {
    const self = this

    // Compound where: db.parametres.where({ fournisseurId: x, magasinId: y })
    if (typeof fieldOrObj === 'object') {
      const conditions = fieldOrObj
      return {
        filter: (fn) => ({
          first: async () => {
            let q = supabase.from(self.name).select('*').limit(50000)
            for (const [k, v] of Object.entries(conditions)) q = q.eq(self._f(k), v)
            const { data, error } = await q
            if (error) throw error
            return self._fromAll(data).find(fn)
          },
          toArray: async () => {
            let q = supabase.from(self.name).select('*').limit(50000)
            for (const [k, v] of Object.entries(conditions)) q = q.eq(self._f(k), v)
            const { data, error } = await q
            if (error) throw error
            return self._fromAll(data).filter(fn)
          }
        })
      }
    }

    // Single field where
    const field = fieldOrObj
    const dbField = self._f(field)
    return {
      equals: (value) => ({
        toArray: async () => {
          const { data, error } = await supabase.from(self.name).select('*').eq(dbField, value).limit(50000)
          if (error) throw error
          return self._fromAll(data)
        },
        first: async () => {
          const { data, error } = await supabase.from(self.name).select('*').eq(dbField, value).limit(1).maybeSingle()
          if (error) throw error
          return data ? self._from(data) : undefined
        },
        delete: async () => {
          const { error } = await supabase.from(self.name).delete().eq(dbField, value)
          if (error) throw error
        },
        // .where('f').equals(v).and(fn).first() — fetch matching rows, filter in JS
        and: (fn) => ({
          first: async () => {
            const { data, error } = await supabase.from(self.name).select('*').eq(dbField, value).limit(50000)
            if (error) throw error
            return self._fromAll(data).find(fn)
          },
          toArray: async () => {
            const { data, error } = await supabase.from(self.name).select('*').eq(dbField, value).limit(50000)
            if (error) throw error
            return self._fromAll(data).filter(fn)
          }
        }),
        // .where('f').equals(v).reverse().sortBy('field') — sorted descending
        reverse: () => ({
          sortBy: async (sortField) => {
            const { data, error } = await supabase.from(self.name).select('*')
              .eq(dbField, value)
              .order(self._f(sortField), { ascending: false })
              .limit(50000)
            if (error) throw error
            return self._fromAll(data)
          }
        }),
      })
    }
  }

  filter(fn) {
    const self = this
    return {
      first: async () => {
        const { data, error } = await supabase.from(self.name).select('*').limit(50000)
        if (error) throw error
        return self._fromAll(data).find(fn)
      },
      toArray: async () => {
        const { data, error } = await supabase.from(self.name).select('*').limit(50000)
        if (error) throw error
        return self._fromAll(data).filter(fn)
      }
    }
  }

  async add(obj) {
    const { data, error } = await supabase.from(this.name).insert(this._to(obj)).select('id').single()
    if (error) throw new Error(error.message || error.details || JSON.stringify(error))
    return data.id
  }

  async put(obj) {
    const { id, ...rest } = obj
    if (id) {
      const { error } = await supabase.from(this.name).upsert({ id, ...this._to(rest) })
      if (error) throw error
    } else {
      const { data, error } = await supabase.from(this.name).insert(this._to(rest)).select('id').single()
      if (error) throw error
      return data.id
    }
  }

  async update(id, changes) {
    const { error } = await supabase.from(this.name).update(this._to(changes)).eq('id', id)
    if (error) throw error
  }

  async delete(id) {
    const { error } = await supabase.from(this.name).delete().eq('id', id)
    if (error) throw error
  }

  // No-op: only used during Dexie migrations
  toCollection() { return { modify: async () => {} } }
}

export const db = {
  magasins:       new SupabaseTable('magasins'),
  fournisseurs:   new SupabaseTable('fournisseurs'),
  parametres:     new SupabaseTable('parametres'),
  entrees:        new SupabaseTable('entrees'),
  suivi:          new SupabaseTable('suivi'),
  modesReglement: new SupabaseTable('modes_reglement'),
  commandes:      new SupabaseTable('commandes'),
  evenements:     new SupabaseTable('evenements'),
  salaries:       new SupabaseTable('salaries'),
  defectueux:     new SupabaseTable('defectueux'),
  reglementPaye:  new SupabaseTable('reglement_paye'),
  paieVariables:  new SupabaseTable('paie_variables'),
  paieEnvois:     new SupabaseTable('paie_envois'),
  planning:       new SupabaseTable('planning'),
}

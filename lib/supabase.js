// Camada de dados no Supabase (Postgres).
//
// O app foi escrito em cima de uma API de coleções no estilo do MongoDB
// (find/findOne/insertOne/updateOne/aggregate...). Para trocar o banco sem
// reescrever as rotas e o robô, esta camada implementa a mesma API sobre uma
// única tabela `documents` (id, collection, data jsonb).
import { createClient } from '@supabase/supabase-js';

const TABLE = 'documents';
const PAGE_SIZE = 1000;

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function supabaseKey() {
  // A chave de serviço (server-side) ignora RLS e é a recomendada; a anon serve
  // apenas para leitura quando só ela estiver disponível.
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

export function supabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseKey());
}

let cached = globalThis._goldlinkSupabase;
if (!cached) {
  cached = globalThis._goldlinkSupabase = { client: null };
}

function client() {
  if (!supabaseConfigured()) {
    throw new Error(
      'Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) nas variáveis de ambiente.'
    );
  }
  if (!cached.client) {
    cached.client = createClient(supabaseUrl(), supabaseKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached.client;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(value) {
  return value instanceof Date ? value.getTime() : value;
}

function sameValue(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (x === y) return true;
  if (x == null || y == null) return x == null && y == null;
  if (typeof x === 'object' || typeof y === 'object') {
    try {
      return JSON.stringify(x) === JSON.stringify(y);
    } catch {
      return false;
    }
  }
  return String(x) === String(y);
}

function compareValues(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (x == null && y == null) return 0;
  if (x == null) return -1;
  if (y == null) return 1;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  if (typeof x === 'number' || typeof y === 'number') {
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny)) return nx - ny;
  }
  if (typeof x === 'boolean' || typeof y === 'boolean') return Number(x) - Number(y);
  return String(x).localeCompare(String(y));
}

function getField(doc, path) {
  if (!path.includes('.')) return doc?.[path];
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), doc);
}

function matches(doc, filter) {
  if (!filter || !Object.keys(filter).length) return true;
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return Array.isArray(cond) && cond.some((f) => matches(doc, f));
    if (key === '$and') return Array.isArray(cond) && cond.every((f) => matches(doc, f));
    if (key === '$nor') return Array.isArray(cond) && !cond.some((f) => matches(doc, f));
    const value = getField(doc, key);
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      const ops = Object.keys(cond).filter((k) => k.startsWith('$'));
      if (ops.length) {
        return ops.every((op) => {
          const target = cond[op];
          switch (op) {
            case '$eq':
              return sameValue(value, target);
            case '$ne':
              return !sameValue(value, target);
            case '$in':
              return Array.isArray(target) && target.some((t) => sameValue(value, t));
            case '$nin':
              return Array.isArray(target) && !target.some((t) => sameValue(value, t));
            case '$gt':
              return value != null && compareValues(value, target) > 0;
            case '$gte':
              return value != null && compareValues(value, target) >= 0;
            case '$lt':
              return value != null && compareValues(value, target) < 0;
            case '$lte':
              return value != null && compareValues(value, target) <= 0;
            case '$exists':
              return target ? value !== undefined : value === undefined;
            case '$not':
              return !matches({ __v: value }, { __v: target });
            case '$regex':
              return typeof value === 'string' && new RegExp(target, cond.$options || '').test(value);
            case '$options':
              return true;
            default:
              return true;
          }
        });
      }
    }
    return sameValue(value, cond);
  });
}

function applyUpdate(doc, update) {
  const patch = update || {};
  const hasOperators = Object.keys(patch).some((k) => k.startsWith('$'));
  if (!hasOperators) return { ...doc, ...patch };

  const next = { ...doc };
  for (const [op, payload] of Object.entries(patch)) {
    if (!payload || typeof payload !== 'object') continue;
    if (op === '$set') {
      Object.assign(next, payload);
    } else if (op === '$setOnInsert') {
      for (const [k, v] of Object.entries(payload)) if (next[k] === undefined) next[k] = v;
    } else if (op === '$unset') {
      for (const key of Object.keys(payload)) delete next[key];
    } else if (op === '$inc') {
      for (const [k, v] of Object.entries(payload)) next[k] = (Number(next[k]) || 0) + Number(v);
    } else if (op === '$push') {
      for (const [k, v] of Object.entries(payload)) {
        const arr = Array.isArray(next[k]) ? [...next[k]] : [];
        if (v && typeof v === 'object' && Array.isArray(v.$each)) arr.push(...v.$each);
        else arr.push(v);
        next[k] = arr;
      }
    } else if (op === '$addToSet') {
      for (const [k, v] of Object.entries(payload)) {
        const arr = Array.isArray(next[k]) ? [...next[k]] : [];
        const values = v && typeof v === 'object' && Array.isArray(v.$each) ? v.$each : [v];
        for (const item of values) if (!arr.some((x) => sameValue(x, item))) arr.push(item);
        next[k] = arr;
      }
    } else if (op === '$pull') {
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(next[k])) continue;
        next[k] = next[k].filter((x) => !sameValue(x, v));
      }
    }
  }
  return next;
}

function project(doc, projection) {
  if (!projection) return doc;
  const keys = Object.keys(projection);
  const included = keys.filter((k) => k !== '_id' && projection[k]);
  if (included.length) {
    const out = {};
    for (const k of included) if (doc[k] !== undefined) out[k] = doc[k];
    if (projection._id !== 0 && doc._id !== undefined) out._id = doc._id;
    return out;
  }
  const out = { ...doc };
  for (const k of keys) if (!projection[k]) delete out[k];
  return out;
}

function sortDocs(docs, spec) {
  const entries = Object.entries(spec || {});
  if (!entries.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [key, dir] of entries) {
      const cmp = compareValues(getField(a, key), getField(b, key));
      if (cmp !== 0) return dir < 0 ? -cmp : cmp;
    }
    return 0;
  });
}

function resolveExpr(expr, doc) {
  if (typeof expr === 'string') return expr.startsWith('$') ? getField(doc, expr.slice(1)) : expr;
  if (expr && typeof expr === 'object' && !Array.isArray(expr)) {
    if (Array.isArray(expr.$ifNull)) {
      for (const option of expr.$ifNull) {
        const value = resolveExpr(option, doc);
        if (value !== null && value !== undefined) return value;
      }
      return null;
    }
    if ('$literal' in expr) return expr.$literal;
  }
  return expr;
}

function runPipeline(input, pipeline = []) {
  let out = input;
  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object') continue;
    const [op] = Object.keys(stage);
    const arg = stage[op];
    if (op === '$match') out = out.filter((d) => matches(d, arg));
    else if (op === '$sort') out = sortDocs(out, arg);
    else if (op === '$limit') out = out.slice(0, Number(arg) || 0);
    else if (op === '$skip') out = out.slice(Number(arg) || 0);
    else if (op === '$count') out = [{ [arg]: out.length }];
    else if (op === '$project') out = out.map((d) => project(d, arg));
    else if (op === '$group') {
      const groups = new Map();
      for (const doc of out) {
        const key = resolveExpr(arg._id, doc);
        const mapKey = JSON.stringify(key ?? null);
        let group = groups.get(mapKey);
        if (!group) {
          group = { _id: key ?? null };
          groups.set(mapKey, group);
        }
        for (const [field, accumulator] of Object.entries(arg)) {
          if (field === '_id' || !accumulator || typeof accumulator !== 'object') continue;
          const [accOp, expr] = Object.entries(accumulator)[0] || [];
          const value = resolveExpr(expr, doc);
          if (accOp === '$sum') group[field] = (Number(group[field]) || 0) + (Number(value) || 0);
          else if (accOp === '$count') group[field] = (group[field] || 0) + 1;
          else if (accOp === '$min') group[field] = field in group ? Math.min(Number(group[field]), Number(value)) : Number(value);
          else if (accOp === '$max') group[field] = field in group ? Math.max(Number(group[field]), Number(value)) : Number(value);
          else if (accOp === '$first' && !(field in group)) group[field] = value;
          else if (accOp === '$last') group[field] = value;
        }
      }
      out = [...groups.values()];
    }
  }
  return out;
}

function rowToDoc(row) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};
  return { ...data, _id: data._id !== undefined ? data._id : row.id };
}

function docToRow(collection, doc) {
  const { _id, ...rest } = doc || {};
  return { id: String(_id ?? doc?.id ?? newId()), collection, data: rest };
}

async function fetchRows(collection) {
  const sb = client();
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from(TABLE)
      .select('id,data')
      .eq('collection', collection)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase (${collection}): ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function allDocs(collection) {
  return (await fetchRows(collection)).map(rowToDoc);
}

async function queryDocs(collection, filter, projection) {
  const docs = await allDocs(collection);
  const filtered = filter && Object.keys(filter).length ? docs.filter((d) => matches(d, filter)) : docs;
  return projection ? filtered.map((d) => project(d, projection)) : filtered;
}

async function writeDoc(collection, currentId, doc) {
  const sb = client();
  const { _id, ...rest } = doc || {};
  const nextId = String(_id ?? doc?.id ?? currentId);
  const { error } = await sb
    .from(TABLE)
    .update({ id: nextId, data: rest, updated_at: new Date().toISOString() })
    .eq('collection', collection)
    .eq('id', String(currentId));
  if (error) throw new Error(`Supabase (${collection}): ${error.message}`);
  return nextId;
}

async function deleteIds(collection, ids) {
  const sb = client();
  const unique = [...new Set(ids.filter((id) => id !== undefined && id !== null).map(String))];
  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const { error } = await sb.from(TABLE).delete().eq('collection', collection).in('id', slice);
    if (error) throw new Error(`Supabase (${collection}): ${error.message}`);
  }
  return unique.length;
}

function scalarFilterValues(filter) {
  const out = {};
  for (const [key, value] of Object.entries(filter || {})) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const hasOperators = Object.keys(value).some((k) => k.startsWith('$'));
      if (hasOperators) continue;
    }
    out[key] = value;
  }
  return out;
}

function createCollection(name) {
  const api = {
    async findOne(filter = {}, options = {}) {
      const docs = await queryDocs(name, filter, options.projection);
      if (!docs.length) return null;
      return options.sort ? sortDocs(docs, options.sort)[0] : docs[0];
    },

    find(filter = {}, options = {}) {
      let sortSpec = null;
      let limitCount = null;
      let projection = options.projection || null;
      const cursor = {
        sort(spec) {
          sortSpec = spec;
          return cursor;
        },
        limit(n) {
          limitCount = n;
          return cursor;
        },
        project(spec) {
          projection = spec;
          return cursor;
        },
        async toArray() {
          let docs = await queryDocs(name, filter, projection);
          if (sortSpec) docs = sortDocs(docs, sortSpec);
          if (limitCount != null) docs = docs.slice(0, Math.max(0, Number(limitCount) || 0));
          return docs;
        },
      };
      return cursor;
    },

    async insertOne(doc) {
      const sb = client();
      const row = docToRow(name, doc);
      const { error } = await sb.from(TABLE).insert(row);
      if (error) throw new Error(`Supabase (${name}): ${error.message}`);
      return { acknowledged: true, insertedId: row.id };
    },

    async insertMany(docs = [], options = {}) {
      if (!docs.length) return { acknowledged: true, insertedCount: 0 };
      const sb = client();
      const rows = docs.map((doc) => docToRow(name, doc));
      const { error } = await sb
        .from(TABLE)
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: options.ordered === false });
      if (error) throw new Error(`Supabase (${name}): ${error.message}`);
      return { acknowledged: true, insertedCount: rows.length };
    },

    async updateOne(filter = {}, update = {}, options = {}) {
      const docs = await queryDocs(name, filter);
      if (!docs.length) {
        if (options.upsert) {
          const created = { ...scalarFilterValues(filter), ...applyUpdate({}, update) };
          await api.insertOne(created);
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }
      const current = docs[0];
      await writeDoc(name, current._id, applyUpdate(current, update));
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    },

    async updateMany(filter = {}, update = {}, options = {}) {
      const docs = await queryDocs(name, filter);
      for (const doc of docs) await writeDoc(name, doc._id, applyUpdate(doc, update));
      if (!docs.length && options.upsert) return api.updateOne(filter, update, options);
      return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length, upsertedCount: 0 };
    },

    async findOneAndUpdate(filter = {}, update = {}, options = {}) {
      const docs = await queryDocs(name, filter);
      if (!docs.length) {
        if (!options.upsert) return null;
        const created = { ...scalarFilterValues(filter), ...applyUpdate({}, update) };
        await api.insertOne(created);
        const stored = { ...created, _id: String(created._id ?? created.id ?? newId()) };
        return options.returnDocument === 'after' ? project(stored, options.projection) : null;
      }
      const before = docs[0];
      const after = applyUpdate(before, update);
      await writeDoc(name, before._id, after);
      return project(options.returnDocument === 'after' ? after : before, options.projection);
    },

    async replaceOne(filter = {}, doc = {}, options = {}) {
      const docs = await queryDocs(name, filter);
      if (!docs.length) {
        if (options.upsert) {
          await api.insertOne(doc);
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }
      await writeDoc(name, docs[0]._id, doc);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    },

    async deleteOne(filter = {}) {
      const docs = await queryDocs(name, filter);
      if (!docs.length) return { acknowledged: true, deletedCount: 0 };
      await deleteIds(name, [docs[0]._id]);
      return { acknowledged: true, deletedCount: 1 };
    },

    async deleteMany(filter = {}) {
      const docs = await queryDocs(name, filter);
      if (!docs.length) return { acknowledged: true, deletedCount: 0 };
      const deleted = await deleteIds(name, docs.map((d) => d._id));
      return { acknowledged: true, deletedCount: deleted };
    },

    async countDocuments(filter = {}) {
      if (!filter || !Object.keys(filter).length) {
        const sb = client();
        const { count, error } = await sb
          .from(TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('collection', name);
        if (error) throw new Error(`Supabase (${name}): ${error.message}`);
        return count || 0;
      }
      return (await queryDocs(name, filter)).length;
    },

    // Os índices agora são criados pelo schema do Postgres (supabase/schema.sql).
    async createIndex() {
      return 'ok';
    },

    aggregate(pipeline = []) {
      return {
        async toArray() {
          return runPipeline(await allDocs(name), pipeline);
        },
      };
    },
  };
  return api;
}

export async function getDb() {
  return {
    collection: (name) => createCollection(name),
  };
}

export function getCollection(name) {
  return createCollection(name);
}

export async function getProductsCollection() {
  return createCollection('products');
}

export default { getDb, getCollection, getProductsCollection, supabaseConfigured };

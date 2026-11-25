// Ponto único de acesso ao banco usado pelas rotas e pelo robô.
// O MongoDB foi substituído pelo Supabase: a implementação fica em lib/supabase.js
// e mantém a mesma API de coleções (find, findOne, insertOne, updateOne...).
import {
  getDb as supabaseGetDb,
  getCollection as supabaseGetCollection,
  getProductsCollection as supabaseGetProductsCollection,
  supabaseConfigured,
} from './supabase';

export { supabaseConfigured };

export async function getDb() {
  return supabaseGetDb();
}

export async function getCollection(name) {
  return supabaseGetCollection(name);
}

export async function getProductsCollection() {
  return supabaseGetProductsCollection();
}

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'goldlink';

if (!uri) {
  // Surface a clear error instead of a cryptic driver failure at call time.
  console.error('[v0] MONGODB_URI não está definido no ambiente.');
}

// Cache the client across hot reloads / serverless invocations so we don't
// open a new connection pool on every request.
let cached = globalThis._goldlinkMongo;
if (!cached) {
  cached = globalThis._goldlinkMongo = { client: null, promise: null };
}

export async function getDb() {
  if (!uri) throw new Error('MONGODB_URI não configurado');
  if (cached.client) return cached.client.db(dbName);
  if (!cached.promise) {
    cached.promise = new MongoClient(uri, {
      maxPoolSize: 10,
    }).connect();
  }
  cached.client = await cached.promise;
  return cached.client.db(dbName);
}

export async function getProductsCollection() {
  const db = await getDb();
  return db.collection('products');
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

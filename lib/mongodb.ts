import { MongoClient, Db, MongoClientOptions } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'gold-link';

if (!MONGODB_URI) {
  // We don't throw at import time so that build steps that don't need the
  // database (e.g. `next build`) don't fail. The error is thrown lazily
  // when a connection is actually requested.
  // eslint-disable-next-line no-console
  console.warn('MONGODB_URI environment variable is not set.');
}

const options: MongoClientOptions = {};

// In development, use a global variable so that the MongoClient is not
// recreated on every hot-reload. In production, it's fine to create a new
// client for the module scope since the module is only evaluated once.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

function createClientPromise(): Promise<MongoClient> {
  if (!MONGODB_URI) {
    return Promise.reject(
      new Error(
        'Please define the MONGODB_URI environment variable inside .env(.local)'
      )
    );
  }

  const client = new MongoClient(MONGODB_URI, options);
  return client.connect();
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

/**
 * Returns a connected MongoDB `Db` instance, reusing the pooled connection
 * across invocations.
 */
export async function getDb(dbName: string = MONGODB_DB): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

/**
 * Returns the shared MongoClient promise. Useful if you need direct access
 * to the client (e.g. for transactions).
 */
export default clientPromise;

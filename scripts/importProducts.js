/**
 * Import products from products.json into the MongoDB "products" collection.
 *
 * Usage:
 *   node scripts/importProducts.js
 *   or
 *   yarn import:products
 *
 * The script is idempotent: it upserts each product by its "id" field, so
 * running it multiple times will not create duplicates.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'gold-link';
const PRODUCTS_FILE = path.join(__dirname, '..', 'products.json');

async function importProducts() {
  if (!MONGODB_URI) {
    console.error(
      'Missing MONGODB_URI environment variable. Set it in your .env file or export it before running this script.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(PRODUCTS_FILE)) {
    console.error(`Could not find products file at ${PRODUCTS_FILE}`);
    process.exit(1);
  }

  console.log(`Reading products from ${PRODUCTS_FILE}...`);
  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
  const products = JSON.parse(raw);

  if (!Array.isArray(products)) {
    console.error('products.json must contain an array of products.');
    process.exit(1);
  }

  console.log(`Found ${products.length} products to import.`);

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('Connected successfully.');

    const db = client.db(MONGODB_DB);
    const collection = db.collection('products');

    // Make sure the "id" field is unique so upserts are reliable.
    await collection.createIndex({ id: 1 }, { unique: true });

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const product of products) {
      if (!product || !product.id) {
        console.warn('Skipping product without an "id" field:', product);
        failed += 1;
        continue;
      }

      try {
        const result = await collection.updateOne(
          { id: product.id },
          { $set: product },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          inserted += 1;
          console.log(`Inserted: ${product.nome} (${product.id})`);
        } else if (result.modifiedCount > 0) {
          updated += 1;
          console.log(`Updated: ${product.nome} (${product.id})`);
        } else {
          console.log(`Unchanged: ${product.nome} (${product.id})`);
        }
      } catch (err) {
        failed += 1;
        console.error(`Failed to import product ${product.id}:`, err.message);
      }
    }

    console.log('\nImport complete.');
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Updated:  ${updated}`);
    console.log(`  Unchanged: ${products.length - inserted - updated - failed}`);
    console.log(`  Failed:   ${failed}`);

    const total = await collection.countDocuments();
    console.log(`Total products in collection: ${total}`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

importProducts();

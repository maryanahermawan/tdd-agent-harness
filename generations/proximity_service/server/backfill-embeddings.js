/**
 * Backfill business embeddings.
 *
 * Embeds each business's semantic text with Voyage AI (voyage-4-lite) and
 * stores the resulting 1024-dim vector as a JSON array in the
 * `businesses.embedding_vector` column (the format routes/search.js expects).
 *
 * Texts are batched into as few requests as possible to stay within Voyage's
 * rate limits (the free tier is only 3 requests/minute), with retry/backoff
 * on HTTP 429.
 *
 * Usage:
 *   node backfill-embeddings.js          # only fill empty / missing vectors
 *   node backfill-embeddings.js --force  # re-embed every business
 *
 * Requires VOYAGE_API_KEY (or VOYAGE_API_KEY_PATH) and DATABASE_URL in .env.
 */

import dotenv from 'dotenv';
import { pool } from './db.js';
import { generateEmbeddings } from './services/voyageai.js';

dotenv.config();

const FORCE = process.argv.includes('--force');
const BATCH_SIZE = 96;        // inputs per request
const MAX_RETRIES = 5;        // retries per batch on rate-limit / transient errors

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Text to embed for a business, mirroring the ranking text used at search time.
function embeddingText(business) {
  const parts = [
    business.name,
    business.description,
    business.semantic_search_blob
  ];

  return parts
    .filter(part => typeof part === 'string' && part.trim() !== '')
    .map(part => part.trim())
    .join(' ');
}

// A vector is considered missing if it is null, empty string, or '[]'.
function needsEmbedding(value) {
  if (FORCE) return true;
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === '' || trimmed === '[]';
}

// Embed a batch, retrying with exponential backoff when rate-limited (429).
async function embedBatchWithRetry(texts, batchLabel) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateEmbeddings(texts);
    } catch (error) {
      const isRateLimit = error.status === 429;
      if (attempt === MAX_RETRIES || !isRateLimit) throw error;

      // Free tier is 3 RPM, so wait out the window (~22s, growing per attempt).
      const waitMs = 22000 * attempt;
      console.warn(`  ${batchLabel}: rate limited (429), retry ${attempt}/${MAX_RETRIES - 1} in ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
    }
  }
}

async function main() {
  const { rows: businesses } = await pool.query(
    `SELECT id, name, description, semantic_search_blob, embedding_vector
     FROM businesses
     ORDER BY id`
  );

  const targets = businesses
    .filter(b => needsEmbedding(b.embedding_vector))
    .map(b => ({ ...b, text: embeddingText(b) }))
    .filter(b => {
      if (!b.text) console.warn(`- ${b.id}: no text to embed, skipping`);
      return b.text;
    });

  console.log(`Found ${businesses.length} businesses; embedding ${targets.length}${FORCE ? ' (--force)' : ''}.`);

  let updated = 0;
  const failures = [];

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const batchLabel = `batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}`;

    // Throttle between requests to respect the 3 RPM free-tier limit.
    if (i > 0) await sleep(22000);

    let embeddings;
    try {
      embeddings = await embedBatchWithRetry(batch.map(b => b.text), batchLabel);
    } catch (error) {
      console.error(`✗ ${batchLabel} failed: ${error.message}`);
      batch.forEach(b => failures.push({ id: b.id, error: error.message }));
      continue;
    }

    for (let j = 0; j < batch.length; j++) {
      const business = batch[j];
      const embedding = embeddings[j];
      await pool.query(
        `UPDATE businesses SET embedding_vector = $1 WHERE id = $2`,
        [JSON.stringify(embedding), business.id]
      );
      updated++;
      console.log(`✓ ${business.id} (${business.name}) — ${embedding.length} dims`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, failed: ${failures.length}.`);
  if (failures.length > 0) console.error('Failures:', failures);

  await pool.end();
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  await pool.end();
  process.exit(1);
});

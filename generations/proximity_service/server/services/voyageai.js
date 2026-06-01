/**
 * Voyage AI Service
 * Handles text embedding generation using Voyage AI API
 */

import fs from 'fs';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_MODEL = 'voyage-4-lite';

/**
 * Resolve the Voyage AI API key lazily.
 * Read on demand (not at import time) so the key is available after
 * dotenv.config() runs and so a newly-created key file is picked up.
 * Supports an inline key (VOYAGE_API_KEY) or a file path (VOYAGE_API_KEY_PATH).
 * @returns {string|null} - The trimmed API key, or null if not configured
 */
function getApiKey() {
  if (process.env.VOYAGE_API_KEY) {
    return process.env.VOYAGE_API_KEY.trim();
  }

  const keyPath = process.env.VOYAGE_API_KEY_PATH || '/tmp/api-key';
  try {
    return fs.readFileSync(keyPath, 'utf8').trim();
  } catch (error) {
    return null;
  }
}

/**
 * Generate embedding vectors for one or more texts in a single Voyage AI
 * request. Batching keeps request count low (important under rate limits).
 * @param {string[]} texts - Texts to embed
 * @returns {Promise<number[][]>} - Embedding vectors, in the same order as texts
 */
export async function generateEmbeddings(texts) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Voyage AI API key not available (set VOYAGE_API_KEY or VOYAGE_API_KEY_PATH)');
  }

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: VOYAGE_MODEL
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Voyage AI API error: ${response.status} - ${errorText}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding returned from Voyage AI');
    }

    // Return vectors ordered by the request index Voyage assigns to each input
    return data.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);
  } catch (error) {
    console.error('Voyage AI embedding error:', error);
    if (error.status) throw error;
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate an embedding vector for a single text.
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 1024-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  const [embedding] = await generateEmbeddings([text]);
  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Cosine similarity (0 to 1, higher is more similar)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

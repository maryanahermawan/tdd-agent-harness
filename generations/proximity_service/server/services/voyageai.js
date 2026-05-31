/**
 * Voyage AI Service
 * Handles text embedding generation using Voyage AI API
 */

import fs from 'fs';

// Read API key from file
const API_KEY_PATH = process.env.VOYAGE_API_KEY_PATH || '/tmp/api-key';
let apiKey = null;

try {
  apiKey = fs.readFileSync(API_KEY_PATH, 'utf8').trim();
} catch (error) {
  console.warn(`Warning: Could not read Voyage AI API key from ${API_KEY_PATH}`);
  console.warn('Semantic search will not work without a valid API key');
}

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

/**
 * Generate embedding vector for text using Voyage AI REST API
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 1024-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  if (!apiKey) {
    throw new Error('Voyage AI API key not available');
  }

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: [text],
        model: 'voyage-3-lite'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding returned from Voyage AI');
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error('Voyage AI embedding error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
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

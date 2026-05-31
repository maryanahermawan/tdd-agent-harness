/**
 * Text Similarity Utilities
 * Simple text-based similarity for testing when embeddings are not available
 */

/**
 * Calculate simple text similarity based on common keywords
 * This is a fallback for when Voyage AI embeddings are not available
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score (0 to 1)
 */
export function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  // Normalize and tokenize
  const tokens1 = tokenize(text1.toLowerCase());
  const tokens2 = tokenize(text2.toLowerCase());

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  // Calculate Jaccard similarity (intersection / union)
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  const jaccardSimilarity = intersection.size / union.size;

  // Also consider TF-IDF-like weighted scoring for important keywords
  const importantKeywords = {
    // Cafe keywords
    'cafe': 2.0, 'coffee': 2.0, 'wifi': 2.0, 'laptop': 2.0, 'quiet': 1.5, 'work': 1.5,
    'cozy': 1.5, 'casual': 1.5, 'brunch': 1.5, 'breakfast': 1.5,

    // Restaurant keywords
    'restaurant': 2.0, 'dining': 2.0, 'fine': 2.0, 'upscale': 2.0, 'elegant': 2.0,
    'michelin': 2.5, 'starred': 2.5, 'gourmet': 2.0, 'wine': 1.5, 'special': 1.5,
    'occasion': 1.5, 'european': 1.5, 'french': 1.5, 'barbecue': 1.5,

    // Hotel keywords
    'hotel': 2.0, 'luxury': 2.0, 'resort': 2.0, 'boutique': 1.5, 'colonial': 1.5,
    'heritage': 1.5, 'pool': 1.5, 'rooftop': 1.5,

    // Food center keywords
    'hawker': 2.0, 'food': 1.5, 'market': 1.5, 'centre': 1.5, 'local': 1.5,
    'delights': 1.5, 'family': 1.2,

    // Museum/attraction keywords
    'museum': 2.0, 'gallery': 2.0, 'art': 1.5, 'garden': 1.5, 'attraction': 1.5,
    'zoo': 2.0
  };

  let weightedScore = 0;
  let totalWeight = 0;

  // Calculate weighted overlap
  for (const token of intersection) {
    const weight = importantKeywords[token] || 1.0;
    weightedScore += weight;
    totalWeight += weight;
  }

  // Normalize weighted score
  const maxPossibleWeight = Math.max(tokens1.length, tokens2.length);
  const normalizedWeightedScore = totalWeight > 0 ? weightedScore / maxPossibleWeight : 0;

  // Combine Jaccard and weighted scores
  return (jaccardSimilarity * 0.4) + (normalizedWeightedScore * 0.6);
}

/**
 * Tokenize text into words
 * @param {string} text - Text to tokenize
 * @returns {string[]} - Array of tokens
 */
function tokenize(text) {
  return text
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(token => token.length > 2) // Filter out short tokens
    .filter(token => !isStopWord(token)); // Remove stop words
}

/**
 * Check if a word is a stop word
 * @param {string} word - Word to check
 * @returns {boolean} - True if stop word
 */
function isStopWord(word) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those'
  ]);
  return stopWords.has(word);
}

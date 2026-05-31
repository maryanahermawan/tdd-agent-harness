/**
 * Proximity Search Routes
 * Handles location-based search with semantic ranking
 */

import express from 'express';
import { pool } from '../db.js';
import { generateEmbedding, cosineSimilarity } from '../services/voyageai.js';
import { calculateDistance } from '../utils/distance.js';
import { calculateTextSimilarity } from '../utils/textSimilarity.js';

const router = express.Router();

// GET /v1/search/nearby - Proximity search with optional semantic ranking
router.get('/search/nearby', async (req, res) => {
  try {
    // 1. Validate query parameters
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = parseFloat(req.query.radius) || 5; // Default 5km
    const count = parseInt(req.query.count) || 10; // Default 10 results
    const preference = req.query.preference; // Optional semantic preference

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Invalid parameters. lat and lon are required and must be numbers'
      });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

    if (lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }

    // 2. Query all businesses from database
    // In production with PostGIS, we'd filter by spatial index
    // For now, we fetch all and filter in-memory
    const result = await pool.query(`
      SELECT id, name, address, postal_code, description,
             latitude, longitude, semantic_search_blob, embedding_vector
      FROM businesses
    `);

    let businesses = result.rows;

    // 3. Calculate distances and filter by radius
    const radiusMeters = radius * 1000;
    businesses = businesses
      .map(business => ({
        ...business,
        distance: calculateDistance(lat, lon, business.latitude, business.longitude)
      }))
      .filter(business => business.distance <= radiusMeters);

    // 4. If preference provided, calculate semantic similarity
    if (preference && preference.trim()) {
      let useEmbeddings = false;

      // Try to use Voyage AI embeddings first
      try {
        const preferenceEmbedding = await generateEmbedding(preference);

        // Calculate similarity scores for each business using embeddings
        businesses = businesses.map(business => {
          let similarity_score = 0;

          // Parse embedding_vector from JSON string
          if (business.embedding_vector && business.embedding_vector !== '[]') {
            try {
              const businessEmbedding = JSON.parse(business.embedding_vector);
              if (businessEmbedding.length > 0) {
                similarity_score = cosineSimilarity(preferenceEmbedding, businessEmbedding);
                useEmbeddings = true;
              }
            } catch (e) {
              console.warn(`Failed to parse embedding for business ${business.id}`);
            }
          }

          return {
            ...business,
            similarity_score
          };
        });
      } catch (error) {
        console.warn('Voyage AI embedding not available:', error.message);
      }

      // Fallback to text similarity if embeddings not available
      if (!useEmbeddings) {
        console.log('Using text-based similarity fallback');
        businesses = businesses.map(business => {
          const similarity_score = calculateTextSimilarity(
            preference,
            business.semantic_search_blob || business.description || business.name
          );

          return {
            ...business,
            similarity_score
          };
        });
      }

      // Sort by similarity score (descending), then distance (ascending)
      businesses.sort((a, b) => {
        if (Math.abs(a.similarity_score - b.similarity_score) > 0.001) {
          return b.similarity_score - a.similarity_score;
        }
        return a.distance - b.distance;
      });
    } else {
      // No preference: sort by distance only
      businesses.sort((a, b) => a.distance - b.distance);
    }

    // 5. Limit results
    businesses = businesses.slice(0, count);

    // 6. Format response (remove embedding_vector from response)
    const results = businesses.map(business => {
      const result = {
        id: business.id,
        name: business.name,
        address: business.address,
        latitude: business.latitude,
        longitude: business.longitude,
        description: business.description,
        distance: Math.round(business.distance) // Round to integer meters
      };

      // Include similarity_score if semantic search was used
      if (business.similarity_score !== undefined) {
        result.similarity_score = business.similarity_score;
      }

      return result;
    });

    res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Failed to perform search',
      details: error.message
    });
  }
});

export default router;

/**
 * Business CRUD Routes
 * Handles business creation, retrieval, update, and deletion
 */

import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateEmbedding } from '../services/voyageai.js';
import crypto from 'crypto';

const router = express.Router();

// GET /v1/business/:id - Retrieve business by ID (PUBLIC - no authentication required)
router.get('/business/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, owner_id FROM businesses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Failed to retrieve business' });
  }
});

// POST /v1/business - Create new business (authenticated)
router.post('/business', authenticateToken, async (req, res) => {
  try {
    const { name, address, postal_code, description, latitude, longitude, semantic_search_blob } = req.body;

    // Validate required fields
    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, address, latitude, longitude'
      });
    }

    // Generate unique ID
    const businessId = `biz_${crypto.randomBytes(8).toString('hex')}`;

    // Generate embedding from semantic_search_blob
    let embeddingVector = null;
    if (semantic_search_blob) {
      try {
        const embedding = await generateEmbedding(semantic_search_blob);
        embeddingVector = JSON.stringify(embedding);
      } catch (embeddingError) {
        console.warn('Failed to generate embedding:', embeddingError.message);
        // Continue without embedding - it's not critical for creation
      }
    }

    // Insert business into database
    const result = await pool.query(
      `INSERT INTO businesses
       (id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, owner_id`,
      [businessId, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embeddingVector, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// PUT /v1/business/:id - Update business (owner only)
router.put('/business/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, semantic_search_blob, name, address, postal_code } = req.body;

    // Check if business exists and user is the owner
    const checkResult = await pool.query(
      'SELECT owner_id, semantic_search_blob FROM businesses WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = checkResult.rows[0];
    if (business.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this business' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${paramIndex++}`);
      values.push(postal_code);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    // If semantic_search_blob changed, regenerate embedding
    let embeddingVector = null;
    if (semantic_search_blob !== undefined) {
      updates.push(`semantic_search_blob = $${paramIndex++}`);
      values.push(semantic_search_blob);

      if (semantic_search_blob !== business.semantic_search_blob) {
        try {
          const embedding = await generateEmbedding(semantic_search_blob);
          embeddingVector = JSON.stringify(embedding);
          updates.push(`embedding_vector = $${paramIndex++}`);
          values.push(embeddingVector);
        } catch (embeddingError) {
          console.warn('Failed to regenerate embedding:', embeddingError.message);
          // Continue with update even if embedding fails
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add business ID to values
    values.push(id);

    // Execute update
    const result = await pool.query(
      `UPDATE businesses
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, address, postal_code, description, latitude, longitude, semantic_search_blob, embedding_vector, owner_id`,
      values
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// DELETE /v1/business/:id - Delete business (owner only)
router.delete('/business/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if business exists and user is the owner
    const checkResult = await pool.query(
      'SELECT owner_id FROM businesses WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = checkResult.rows[0];
    if (business.owner_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this business' });
    }

    // Delete business
    await pool.query('DELETE FROM businesses WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

export default router;

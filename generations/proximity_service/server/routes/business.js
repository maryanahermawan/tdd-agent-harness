/**
 * Business CRUD Routes
 * Handles business creation, retrieval, update, and deletion
 */

import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /v1/business/:id - Retrieve business by ID (requires authentication)
router.get('/business/:id', authenticateToken, async (req, res) => {
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
  // TODO: Implement create business logic
  // 1. Validate request body
  // 2. Call Voyage AI to generate embedding from semantic_search_blob
  // 3. Insert business into database with owner_id from token
  // 4. Return created business with ID and embedding_vector
  res.status(501).json({ error: 'Not implemented' });
});

// PUT /v1/business/:id - Update business (owner only)
router.put('/business/:id', authenticateToken, async (req, res) => {
  // TODO: Implement update business logic
  // 1. Check if user owns this business
  // 2. Validate request body
  // 3. If semantic_search_blob changed, regenerate embedding with Voyage AI
  // 4. Update business in database
  // 5. Return updated business
  res.status(501).json({ error: 'Not implemented' });
});

// DELETE /v1/business/:id - Delete business (owner only)
router.delete('/business/:id', authenticateToken, async (req, res) => {
  // TODO: Implement delete business logic
  // 1. Check if user owns this business
  // 2. Delete business from database
  // 3. Return 204 No Content
  res.status(501).json({ error: 'Not implemented' });
});

export default router;

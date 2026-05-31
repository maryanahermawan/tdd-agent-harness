/**
 * Functional Tests: Business CRUD Operations
 * Priority: P2
 * Tests create, read, update, delete operations for businesses
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3000';

describe('Business CRUD API - P2', () => {
  let authToken = null;
  let createdBusinessId = null;

  beforeAll(async () => {
    // Get authentication token
    const response = await request(BASE_URL)
      .post('/v1/signin')
      .send({
        username: 'john_doe',
        password: 'test123'
      });

    authToken = response.body.token;
  });

  it('GET /v1/business/:id - should retrieve business by ID', async () => {
    const response = await request(BASE_URL)
      .get('/v1/business/biz_001')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('id', 'biz_001');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('address');
    expect(response.body).toHaveProperty('latitude');
    expect(response.body).toHaveProperty('longitude');
    expect(response.body).toHaveProperty('description');
  });

  it('GET /v1/business/:id - should return 404 for non-existent business', async () => {
    await request(BASE_URL)
      .get('/v1/business/nonexistent_id')
      .expect(404);
  });

  it('POST /v1/business - should create new business (authenticated)', async () => {
    const newBusiness = {
      name: 'Test Coffee House',
      address: '100 Test Street, Singapore',
      postal_code: '123456',
      description: 'A cozy coffee shop for testing',
      latitude: 1.2950,
      longitude: 103.8580,
      semantic_search_blob: 'Great cafe with excellent coffee. Perfect for working with laptop and good wifi.'
    };

    const response = await request(BASE_URL)
      .post('/v1/business')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newBusiness)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', newBusiness.name);
    expect(response.body).toHaveProperty('address', newBusiness.address);
    expect(response.body).toHaveProperty('latitude', newBusiness.latitude);
    expect(response.body).toHaveProperty('longitude', newBusiness.longitude);
    expect(response.body).toHaveProperty('embedding_vector'); // Should be generated

    createdBusinessId = response.body.id;
  });

  it('POST /v1/business - should reject creation without authentication', async () => {
    const newBusiness = {
      name: 'Unauthorized Business',
      address: '200 Test Street',
      latitude: 1.3000,
      longitude: 103.8600
    };

    await request(BASE_URL)
      .post('/v1/business')
      .send(newBusiness)
      .expect(401); // Unauthorized
  });

  it('POST /v1/business - should validate required fields', async () => {
    await request(BASE_URL)
      .post('/v1/business')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Incomplete Business'
        // Missing required fields: address, latitude, longitude
      })
      .expect(400); // Bad Request
  });

  it('PUT /v1/business/:id - should update existing business (owner only)', async () => {
    const updates = {
      description: 'Updated description for testing',
      semantic_search_blob: 'Updated review summary with new information'
    };

    const response = await request(BASE_URL)
      .put('/v1/business/biz_001')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updates)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('id', 'biz_001');
    expect(response.body).toHaveProperty('description', updates.description);
    expect(response.body).toHaveProperty('embedding_vector'); // Should be regenerated
  });

  it('PUT /v1/business/:id - should reject update without authentication', async () => {
    await request(BASE_URL)
      .put('/v1/business/biz_001')
      .send({ description: 'Unauthorized update' })
      .expect(401);
  });

  it('PUT /v1/business/:id - should reject update by non-owner', async () => {
    // Login as different user
    const otherUserResponse = await request(BASE_URL)
      .post('/v1/signin')
      .send({ username: 'jane_smith', password: 'test123' });

    const otherToken = otherUserResponse.body.token;

    // Try to update business owned by john_doe
    await request(BASE_URL)
      .put('/v1/business/biz_001')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ description: 'Unauthorized update' })
      .expect(403); // Forbidden
  });

  it('DELETE /v1/business/:id - should delete business (owner only)', async () => {
    if (!createdBusinessId) {
      // Create a business first
      const createResponse = await request(BASE_URL)
        .post('/v1/business')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'To Be Deleted',
          address: '999 Delete Street',
          latitude: 1.3100,
          longitude: 103.8700,
          semantic_search_blob: 'This business will be deleted'
        });

      createdBusinessId = createResponse.body.id;
    }

    await request(BASE_URL)
      .delete(`/v1/business/${createdBusinessId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204); // No Content

    // Verify deletion
    await request(BASE_URL)
      .get(`/v1/business/${createdBusinessId}`)
      .expect(404);
  });

  it('DELETE /v1/business/:id - should reject deletion without authentication', async () => {
    await request(BASE_URL)
      .delete('/v1/business/biz_002')
      .expect(401);
  });

  it('DELETE /v1/business/:id - should reject deletion by non-owner', async () => {
    // Login as different user
    const otherUserResponse = await request(BASE_URL)
      .post('/v1/signin')
      .send({ username: 'jane_smith', password: 'test123' });

    const otherToken = otherUserResponse.body.token;

    // Try to delete business owned by john_doe
    await request(BASE_URL)
      .delete('/v1/business/biz_001')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403); // Forbidden
  });
});

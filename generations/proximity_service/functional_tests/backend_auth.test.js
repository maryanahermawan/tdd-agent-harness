/**
 * Functional Tests: Authentication Endpoints
 * Priority: P1
 * Tests signup, signin, and JWT token validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3000';

describe('Authentication API - P1', () => {
  let authToken = null;

  it('POST /v1/signup - should create new user account', async () => {
    const response = await request(BASE_URL)
      .post('/v1/signup')
      .send({
        username: 'test_user_new',
        password: 'secure_password_123'
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('username', 'test_user_new');
    expect(response.body).toHaveProperty('token');
    expect(response.body).not.toHaveProperty('password');
  });

  it('POST /v1/signup - should reject duplicate username', async () => {
    await request(BASE_URL)
      .post('/v1/signup')
      .send({
        username: 'john_doe',
        password: 'test123'
      })
      .expect(409); // Conflict
  });

  it('POST /v1/signin - should authenticate with correct credentials', async () => {
    const response = await request(BASE_URL)
      .post('/v1/signin')
      .send({
        username: 'john_doe',
        password: 'test123'
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('username', 'john_doe');

    authToken = response.body.token;
  });

  it('POST /v1/signin - should reject incorrect password', async () => {
    await request(BASE_URL)
      .post('/v1/signin')
      .send({
        username: 'john_doe',
        password: 'wrong_password'
      })
      .expect(401); // Unauthorized
  });

  it('POST /v1/signin - should reject non-existent username', async () => {
    await request(BASE_URL)
      .post('/v1/signin')
      .send({
        username: 'nonexistent_user',
        password: 'any_password'
      })
      .expect(401); // Unauthorized
  });

  it('Protected endpoints should reject requests without token', async () => {
    await request(BASE_URL)
      .post('/v1/business')
      .send({
        name: 'Test Business',
        address: '123 Test St',
        latitude: 1.2897,
        longitude: 103.8501
      })
      .expect(401); // Unauthorized
  });

  it('Protected endpoints should accept valid JWT token', async () => {
    if (!authToken) {
      // Get token first
      const loginResponse = await request(BASE_URL)
        .post('/v1/signin')
        .send({ username: 'john_doe', password: 'test123' });
      authToken = loginResponse.body.token;
    }

    const response = await request(BASE_URL)
      .get('/v1/business/biz_001')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
  });
});

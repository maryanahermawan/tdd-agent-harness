/**
 * Functional Tests: Proximity Search with Semantic Ranking
 * Priority: P1
 * Tests core proximity search functionality with different radii and preferences
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';

const BASE_URL = 'http://localhost:3000';

describe('Proximity Search API - P1', () => {
  const CENTRAL_LAT = 1.2897; // Central Singapore
  const CENTRAL_LON = 103.8501;

  it('GET /v1/search/nearby - should return businesses within 1km radius', async () => {
    const response = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        radius: 1, // 1 km
        count: 5
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('results');
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.length).toBeLessThanOrEqual(5);

    // Verify each result has required fields
    if (response.body.results.length > 0) {
      const business = response.body.results[0];
      expect(business).toHaveProperty('id');
      expect(business).toHaveProperty('name');
      expect(business).toHaveProperty('address');
      expect(business).toHaveProperty('latitude');
      expect(business).toHaveProperty('longitude');
      expect(business).toHaveProperty('description');

      // Verify distance is within 1km
      expect(business).toHaveProperty('distance');
      expect(business.distance).toBeLessThanOrEqual(1000); // meters
    }
  });

  it('GET /v1/search/nearby - should return businesses within 5km radius', async () => {
    const response = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        radius: 5, // 5 km
        count: 10
      })
      .expect(200);

    expect(response.body.results.length).toBeGreaterThan(0);
    expect(response.body.results.length).toBeLessThanOrEqual(10);

    // Verify all results are within 5km
    response.body.results.forEach(business => {
      expect(business.distance).toBeLessThanOrEqual(5000); // meters
    });
  });

  it('GET /v1/search/nearby - should rank by semantic similarity with "cafe with good wifi"', async () => {
    const response = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        preference: 'quiet cafe suitable to work alone with laptop and good wifi',
        radius: 2,
        count: 5
      })
      .expect(200);

    expect(response.body.results).toHaveLength(5);

    // Results should have similarity scores
    const firstResult = response.body.results[0];
    expect(firstResult).toHaveProperty('similarity_score');
    expect(typeof firstResult.similarity_score).toBe('number');

    // Results should be sorted by similarity (descending)
    for (let i = 0; i < response.body.results.length - 1; i++) {
      expect(response.body.results[i].similarity_score)
        .toBeGreaterThanOrEqual(response.body.results[i + 1].similarity_score);
    }
  });

  it('GET /v1/search/nearby - should rank by semantic similarity with "fine dining restaurant"', async () => {
    const response = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        preference: 'elegant fine dining restaurant for special occasion',
        radius: 2,
        count: 5
      })
      .expect(200);

    expect(response.body.results.length).toBeGreaterThan(0);

    // Results should have similarity scores
    response.body.results.forEach(result => {
      expect(result).toHaveProperty('similarity_score');
      expect(typeof result.similarity_score).toBe('number');
    });

    // Results should be sorted by similarity
    for (let i = 0; i < response.body.results.length - 1; i++) {
      expect(response.body.results[i].similarity_score)
        .toBeGreaterThanOrEqual(response.body.results[i + 1].similarity_score);
    }
  });

  it('GET /v1/search/nearby - different preferences should yield different rankings', async () => {
    const cafePreference = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        preference: 'casual cafe with good coffee',
        radius: 2,
        count: 5
      })
      .expect(200);

    const restaurantPreference = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        preference: 'upscale restaurant with wine selection',
        radius: 2,
        count: 5
      })
      .expect(200);

    // The top results should be different for different preferences
    const cafeTopResult = cafePreference.body.results[0];
    const restaurantTopResult = restaurantPreference.body.results[0];

    // At least one of the top 3 results should be different
    const cafeTop3 = cafePreference.body.results.slice(0, 3).map(r => r.id);
    const restaurantTop3 = restaurantPreference.body.results.slice(0, 3).map(r => r.id);

    const hasAtLeastOneDifference = cafeTop3.some(id => !restaurantTop3.includes(id)) ||
                                     restaurantTop3.some(id => !cafeTop3.includes(id));

    expect(hasAtLeastOneDifference).toBe(true);
  });

  it('GET /v1/search/nearby - should handle missing preference (distance-only ranking)', async () => {
    const response = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        lon: CENTRAL_LON,
        radius: 1,
        count: 5
      })
      .expect(200);

    expect(response.body.results.length).toBeGreaterThan(0);

    // Results should be sorted by distance (ascending)
    for (let i = 0; i < response.body.results.length - 1; i++) {
      expect(response.body.results[i].distance)
        .toBeLessThanOrEqual(response.body.results[i + 1].distance);
    }
  });

  it('GET /v1/search/nearby - should validate required parameters', async () => {
    // Missing latitude
    await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lon: CENTRAL_LON,
        radius: 1
      })
      .expect(400);

    // Missing longitude
    await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: CENTRAL_LAT,
        radius: 1
      })
      .expect(400);
  });

  it('GET /v1/search/nearby - should return empty array when no businesses in radius', async () => {
    const response = await request(BASE_URL)
      .get('/v1/search/nearby')
      .query({
        lat: 0.0,  // Far from Singapore
        lon: 0.0,
        radius: 1,
        count: 5
      })
      .expect(200);

    expect(response.body.results).toEqual([]);
  });
});

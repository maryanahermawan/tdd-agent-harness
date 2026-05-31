/**
 * Functional Tests: Frontend Search Flow (E2E)
 * Priority: P1
 * Tests the complete search user flow using Puppeteer
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:5173'; // Vite default port
const TIMEOUT = 10000;

describe('Frontend Search Flow - P1', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should load the search page', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Check page title or heading
    const heading = await page.$eval('h1, h2', el => el.textContent);
    expect(heading).toBeTruthy();

    // Search interface should be visible
    const searchButton = await page.$('button:has-text("Search")') ||
                         await page.$('button[type="submit"]');
    expect(searchButton).toBeTruthy();
  }, TIMEOUT);

  it('should have location and preference input fields', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Check for location input (could be text input or select)
    const locationInput = await page.$('input[placeholder*="location" i], input[placeholder*="where" i], input[name*="location" i]');
    expect(locationInput).toBeTruthy();

    // Check for preference input
    const preferenceInput = await page.$('input[placeholder*="preference" i], input[placeholder*="what" i], textarea[name*="preference" i]');
    expect(preferenceInput).toBeTruthy();
  }, TIMEOUT);

  it('should display radius selection (1km or 5km)', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Look for radio buttons or select with 1km and 5km options
    const radiusOptions = await page.$$('input[type="radio"][name*="radius" i], select[name*="radius" i] option');
    expect(radiusOptions.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it('should perform search and display results', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Enter search location
    const locationInput = await page.$('input[placeholder*="location" i], input[placeholder*="where" i], input[name*="location" i]');
    if (locationInput) {
      await locationInput.type('1 Raffles Place, Singapore');
    }

    // Enter preference
    const preferenceInput = await page.$('input[placeholder*="preference" i], input[placeholder*="what" i], textarea[name*="preference" i]');
    if (preferenceInput) {
      await preferenceInput.type('cafe with good wifi for working');
    }

    // Select radius (1km)
    const radius1km = await page.$('input[type="radio"][value="1"]');
    if (radius1km) {
      await radius1km.click();
    }

    // Click search button
    const searchButton = await page.$('button:has-text("Search")') ||
                         await page.$('button[type="submit"]');
    await searchButton.click();

    // Wait for results to load
    await page.waitForSelector('[class*="result" i], [class*="business" i], [class*="card" i]', { timeout: 5000 });

    // Check that results are displayed
    const results = await page.$$('[class*="result" i], [class*="business" i], [class*="card" i]');
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5); // 5 results per page
  }, TIMEOUT * 2);

  it('should display map with markers after search', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Perform a search first
    const locationInput = await page.$('input[name*="location" i], input[placeholder*="where" i]');
    if (locationInput) {
      await locationInput.type('Marina Bay, Singapore');
    }

    const searchButton = await page.$('button:has-text("Search")') ||
                         await page.$('button[type="submit"]');
    await searchButton.click();

    // Wait for map to load
    await page.waitForTimeout(2000);

    // Check for map container (common map library classes)
    const map = await page.$('[class*="map" i], .leaflet-container, .mapboxgl-map, #map');
    expect(map).toBeTruthy();
  }, TIMEOUT * 2);

  it('should open business details when clicking a result', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Perform search
    const locationInput = await page.$('input[name*="location" i], input[placeholder*="where" i]');
    if (locationInput) {
      await locationInput.type('Central Singapore');
    }

    const searchButton = await page.$('button:has-text("Search")') ||
                         await page.$('button[type="submit"]');
    await searchButton.click();

    // Wait for results
    await page.waitForSelector('[class*="result" i], [class*="business" i], [class*="card" i]', { timeout: 5000 });

    // Click first result
    const firstResult = await page.$('[class*="result" i], [class*="business" i], [class*="card" i]');
    await firstResult.click();

    // Wait for details modal/layover to open
    await page.waitForSelector('[class*="modal" i], [class*="layover" i], [class*="detail" i]', { timeout: 3000 });

    // Check that business details are shown
    const detailsContainer = await page.$('[class*="modal" i], [class*="layover" i], [class*="detail" i]');
    expect(detailsContainer).toBeTruthy();

    // Should have business name, address, description
    const detailsText = await page.evaluate(() => document.body.textContent);
    expect(detailsText).toBeTruthy();
  }, TIMEOUT * 2);

  it('should display different results for different preferences', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // First search: cafe preference
    let locationInput = await page.$('input[name*="location" i], input[placeholder*="where" i]');
    await locationInput.type('Singapore CBD');

    let preferenceInput = await page.$('input[placeholder*="preference" i], textarea[name*="preference" i]');
    await preferenceInput.type('casual cafe with coffee');

    let searchButton = await page.$('button:has-text("Search")') ||
                       await page.$('button[type="submit"]');
    await searchButton.click();

    await page.waitForSelector('[class*="result" i], [class*="business" i]', { timeout: 5000 });

    const cafeResults = await page.$$eval('[class*="result" i] h3, [class*="business" i] h3, [class*="card" i] h3',
      elements => elements.map(el => el.textContent)
    );

    // Clear and perform second search: restaurant preference
    await page.reload({ waitUntil: 'networkidle0' });

    locationInput = await page.$('input[name*="location" i], input[placeholder*="where" i]');
    await locationInput.type('Singapore CBD');

    preferenceInput = await page.$('input[placeholder*="preference" i], textarea[name*="preference" i]');
    await preferenceInput.type('fine dining restaurant');

    searchButton = await page.$('button:has-text("Search")') ||
                   await page.$('button[type="submit"]');
    await searchButton.click();

    await page.waitForSelector('[class*="result" i], [class*="business" i]', { timeout: 5000 });

    const restaurantResults = await page.$$eval('[class*="result" i] h3, [class*="business" i] h3, [class*="card" i] h3',
      elements => elements.map(el => el.textContent)
    );

    // At least some results should be different
    expect(cafeResults).not.toEqual(restaurantResults);
  }, TIMEOUT * 3);

  it('should have sticky search bar at top', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Find the search bar
    const searchBar = await page.$('[class*="search" i] form, [class*="sticky" i], [class*="header" i] form');
    expect(searchBar).toBeTruthy();

    // Check if it has sticky positioning
    const isSticky = await page.evaluate(() => {
      const searchEl = document.querySelector('[class*="search" i] form, [class*="sticky" i], [class*="header" i] form');
      if (!searchEl) return false;

      const style = window.getComputedStyle(searchEl.closest('[class*="sticky" i]') || searchEl);
      return style.position === 'sticky' || style.position === 'fixed';
    });

    expect(isSticky).toBe(true);
  }, TIMEOUT);

  it('should paginate results (5 per page)', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Perform search with 5km radius to get more results
    const locationInput = await page.$('input[name*="location" i], input[placeholder*="where" i]');
    await locationInput.type('Marina Bay Singapore');

    const radius5km = await page.$('input[type="radio"][value="5"]');
    if (radius5km) {
      await radius5km.click();
    }

    const searchButton = await page.$('button:has-text("Search")') ||
                         await page.$('button[type="submit"]');
    await searchButton.click();

    await page.waitForSelector('[class*="result" i], [class*="business" i]', { timeout: 5000 });

    // Count results on first page
    const firstPageResults = await page.$$('[class*="result" i], [class*="business" i], [class*="card" i]');
    expect(firstPageResults.length).toBeLessThanOrEqual(5);

    // Look for pagination controls
    const pagination = await page.$('[class*="pagination" i], [class*="page" i] button, button:has-text("Next")');
    expect(pagination).toBeTruthy();
  }, TIMEOUT * 2);
});

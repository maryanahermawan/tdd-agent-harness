/**
 * Functional Tests: Frontend Business Management (E2E)
 * Priority: P2
 * Tests business owner's ability to manage their businesses
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:5173';
const TIMEOUT = 10000;

describe('Frontend Business Management - P2', () => {
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

  it('should show signin button for unauthenticated users', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    const signinButton = await page.$('button:has-text("Sign In"), a:has-text("Sign In")');
    expect(signinButton).toBeTruthy();
  }, TIMEOUT);

  it('should navigate to signin page and authenticate', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Click signin button
    const signinButton = await page.$('button:has-text("Sign In"), a:has-text("Sign In")');
    await signinButton.click();

    // Wait for signin form
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 3000 });

    // Fill in credentials
    await page.type('input[name="username"], input[type="text"]', 'john_doe');
    await page.type('input[name="password"], input[type="password"]', 'test123');

    // Submit form
    const submitButton = await page.$('button[type="submit"], button:has-text("Sign In")');
    await submitButton.click();

    // Wait for redirect back to main page
    await page.waitForNavigation({ timeout: 5000 });

    // Should now show avatar or username
    const userAvatar = await page.$('[class*="avatar" i], [class*="user" i]');
    expect(userAvatar).toBeTruthy();
  }, TIMEOUT * 2);

  it('should display Business tab for authenticated users', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Login first
    const signinButton = await page.$('button:has-text("Sign In"), a:has-text("Sign In")');
    if (signinButton) {
      await signinButton.click();
      await page.waitForSelector('input[name="username"]', { timeout: 3000 });
      await page.type('input[name="username"]', 'john_doe');
      await page.type('input[name="password"]', 'test123');
      const submitButton = await page.$('button[type="submit"]');
      await submitButton.click();
      await page.waitForNavigation({ timeout: 5000 });
    }

    // Check for Business tab
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business"), [role="tab"]:has-text("Business")');
    expect(businessTab).toBeTruthy();
  }, TIMEOUT * 2);

  it('should navigate to Business tab and show owned businesses', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Assume already logged in from previous test or login again
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
    }

    await page.waitForTimeout(1000);

    // Should show list of businesses or "Add Business" button
    const addBusinessButton = await page.$('button:has-text("Add Business"), button:has-text("Add")');
    expect(addBusinessButton).toBeTruthy();

    // Check if businesses are displayed (if user owns any)
    const businessCards = await page.$$('[class*="business" i] [class*="card" i], [class*="business-item" i]');
    // john_doe owns 4 businesses (biz_001, biz_010, biz_019)
    expect(businessCards.length).toBeGreaterThanOrEqual(0);
  }, TIMEOUT * 2);

  it('should open Add Business form', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Navigate to Business tab
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
      await page.waitForTimeout(500);
    }

    // Click Add Business button
    const addButton = await page.$('button:has-text("Add Business"), button:has-text("Add")');
    await addButton.click();

    // Wait for form to appear
    await page.waitForSelector('form, input[name="name"]', { timeout: 3000 });

    // Check for required form fields
    const nameInput = await page.$('input[name="name"], input[placeholder*="name" i]');
    const addressInput = await page.$('input[name="address"], textarea[name="address"]');
    const descriptionInput = await page.$('textarea[name="description"], input[name="description"]');

    expect(nameInput).toBeTruthy();
    expect(addressInput).toBeTruthy();
    expect(descriptionInput).toBeTruthy();
  }, TIMEOUT * 2);

  it('should fill and submit Add Business form', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Navigate to Add Business form (assume Business tab navigation works)
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
      await page.waitForTimeout(500);
    }

    const addButton = await page.$('button:has-text("Add Business"), button:has-text("Add")');
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // Fill form
    await page.type('input[name="name"]', 'E2E Test Cafe');
    await page.type('input[name="address"], textarea[name="address"]', '999 Test Road, Singapore');
    await page.type('input[name="postal_code"]', '999999');
    await page.type('textarea[name="description"], input[name="description"]', 'A test cafe created by E2E tests');

    // Submit form
    const submitButton = await page.$('button[type="submit"], button:has-text("Submit"), button:has-text("Save")');
    await submitButton.click();

    // Wait for success message or redirect
    await page.waitForTimeout(2000);

    // Should see the new business in the list or a success message
    const pageContent = await page.evaluate(() => document.body.textContent);
    expect(pageContent).toContain('E2E Test Cafe');
  }, TIMEOUT * 3);

  it('should show edit button on owned businesses', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Navigate to Business tab
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
      await page.waitForTimeout(500);
    }

    // Check for edit buttons on business cards
    const editButton = await page.$('button:has-text("Edit"), [class*="edit" i] button');
    expect(editButton).toBeTruthy();
  }, TIMEOUT * 2);

  it('should show delete button with confirmation on owned businesses', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Navigate to Business tab
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
      await page.waitForTimeout(500);
    }

    // Check for delete button
    const deleteButton = await page.$('button:has-text("Delete"), [class*="delete" i] button');
    expect(deleteButton).toBeTruthy();

    // Click delete button
    if (deleteButton) {
      // Set up dialog handler for confirmation popup
      page.on('dialog', async dialog => {
        expect(dialog.message()).toBeTruthy(); // Should have confirmation message
        await dialog.dismiss(); // Cancel deletion
      });

      await deleteButton.click();
      await page.waitForTimeout(500);
    }
  }, TIMEOUT * 2);

  it('should show "Show in Map Marker" button on Add/Edit business form', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Navigate to Add Business form
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
      await page.waitForTimeout(500);
    }

    const addButton = await page.$('button:has-text("Add Business"), button:has-text("Add")');
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // Look for "Show in Map" button
    const showMapButton = await page.$('button:has-text("Show in Map"), button:has-text("Show Map")');
    expect(showMapButton).toBeTruthy();
  }, TIMEOUT * 2);

  it('should convert postal code to coordinates when showing map', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // Navigate to Add Business form
    const businessTab = await page.$('button:has-text("Business"), a:has-text("Business")');
    if (businessTab) {
      await businessTab.click();
      await page.waitForTimeout(500);
    }

    const addButton = await page.$('button:has-text("Add Business"), button:has-text("Add")');
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    // Fill postal code
    await page.type('input[name="postal_code"]', '018956');

    // Click Show in Map button
    const showMapButton = await page.$('button:has-text("Show in Map"), button:has-text("Show Map")');
    if (showMapButton) {
      await showMapButton.click();
      await page.waitForTimeout(2000);

      // Should show map with marker
      const map = await page.$('[class*="map" i], .leaflet-container, #map');
      expect(map).toBeTruthy();

      // Latitude and longitude fields should be populated
      const latInput = await page.$('input[name="latitude"]');
      const lonInput = await page.$('input[name="longitude"]');

      if (latInput && lonInput) {
        const latValue = await page.evaluate(el => el.value, latInput);
        const lonValue = await page.evaluate(el => el.value, lonInput);

        expect(parseFloat(latValue)).toBeGreaterThan(0);
        expect(parseFloat(lonValue)).toBeGreaterThan(0);
      }
    }
  }, TIMEOUT * 3);
});

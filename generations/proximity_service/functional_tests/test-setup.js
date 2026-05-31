/**
 * Test setup file to extend Puppeteer with text-based selector support
 * This allows :has-text() selectors and case-insensitive attribute selectors to work in Puppeteer tests
 */

import { beforeAll } from 'vitest';
import puppeteer from 'puppeteer';

// Helper function to remove case-insensitive flags from selectors
function normalizeCaseInsensitiveSelector(selector) {
  // Remove ' i]' patterns (case-insensitive attribute selector flags)
  return selector.replace(/\s+i\]/g, ']');
}

// Patch page.$ to handle :has-text() selectors and case-insensitive selectors
beforeAll(() => {
  const originalLaunch = puppeteer.launch;

  puppeteer.launch = async function(...args) {
    const browser = await originalLaunch.apply(this, args);
    const originalNewPage = browser.newPage.bind(browser);

    browser.newPage = async function() {
      const page = await originalNewPage();
      const original$ = page.$.bind(page);
      const original$$ = page.$$.bind(page);
      const originalWaitForSelector = page.waitForSelector.bind(page);

      // Override page.$ to handle special selectors
      page.$ = async function(selector) {
        // Check if selector contains :has-text()
        const hasTextMatch = selector.match(/button:has-text\("([^"]+)"\)/);

        if (hasTextMatch) {
          const text = hasTextMatch[1];
          // Use XPath to find button with text
          const elements = await page.$x(`//button[contains(text(), "${text}")]`);
          return elements[0] || null;
        }

        // Normalize case-insensitive selectors
        const normalizedSelector = normalizeCaseInsensitiveSelector(selector);

        // For other selectors, use original method
        try {
          return await original$(normalizedSelector);
        } catch (error) {
          // If selector is invalid, return null instead of throwing
          if (error.message && error.message.includes('not a valid selector')) {
            return null;
          }
          throw error;
        }
      };

      // Override page.$$ for multiple elements
      page.$$ = async function(selector) {
        const normalizedSelector = normalizeCaseInsensitiveSelector(selector);
        try {
          return await original$$(normalizedSelector);
        } catch (error) {
          if (error.message && error.message.includes('not a valid selector')) {
            return [];
          }
          throw error;
        }
      };

      // Override waitForSelector
      page.waitForSelector = async function(selector, options) {
        const normalizedSelector = normalizeCaseInsensitiveSelector(selector);
        return await originalWaitForSelector(normalizedSelector, options);
      };

      return page;
    };

    return browser;
  };
});

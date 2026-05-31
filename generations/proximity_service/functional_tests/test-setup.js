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

// Helper function to handle :has-text() selectors
function parseHasTextSelector(selector) {
  // Match patterns like: button:has-text("text"), a:has-text("text"), [role="tab"]:has-text("text")
  const hasTextPattern = /([a-zA-Z]+|\[[^\]]+\]):has-text\("([^"]+)"\)/;
  const match = selector.match(hasTextPattern);

  if (match) {
    const [, element, text] = match;
    return { element, text };
  }
  return null;
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
        // Handle comma-separated selectors (OR logic)
        if (selector.includes(',')) {
          const selectors = selector.split(',').map(s => s.trim());
          for (const sel of selectors) {
            const element = await page.$(sel);
            if (element) return element;
          }
          return null;
        }

        // Check if selector contains :has-text()
        const hasTextInfo = parseHasTextSelector(selector);
        if (hasTextInfo) {
          const { element, text } = hasTextInfo;

          // Build XPath based on element type
          let xpath;
          if (element.startsWith('[')) {
            // Attribute selector like [role="tab"]
            const attrMatch = element.match(/\[([^=]+)="([^"]+)"\]/);
            if (attrMatch) {
              const [, attrName, attrValue] = attrMatch;
              xpath = `//*[@${attrName}="${attrValue}" and contains(text(), "${text}")]`;
            }
          } else {
            // Simple element like button, a, etc.
            xpath = `//${element}[contains(text(), "${text}")]`;
          }

          if (xpath) {
            const elements = await page.$x(xpath);
            return elements[0] || null;
          }
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

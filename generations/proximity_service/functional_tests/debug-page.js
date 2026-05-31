import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Get page content
  const content = await page.content();
  console.log('Page HTML:', content.substring(0, 2000));

  // Get all button texts
  const buttonTexts = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.map(btn => ({
      tag: btn.tagName,
      text: btn.textContent.trim(),
      className: btn.className
    }));
  });
  console.log('\nAll buttons and links:', JSON.stringify(buttonTexts, null, 2));

  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
})();

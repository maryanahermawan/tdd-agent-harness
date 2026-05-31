import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log('Browser launched successfully');
    const page = await browser.newPage();
    console.log('Page created successfully');
    await page.goto('http://localhost:5173');
    console.log('Page navigated successfully');
    await browser.close();
    console.log('Browser closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

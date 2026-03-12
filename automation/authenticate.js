const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const path = require('path');

chromium.use(stealth);

const USER_DATA_DIR = path.join(__dirname, 'chrome-data');

(async () => {
  console.log('🔄 Launching stealth browser with persistent data...');
  
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ["--enable-automation"]
  });
  
  const page = await context.newPage();

  console.log('🌐 Navigating to Google Labs Flow...');
  await page.goto('https://labs.google/fx/vi/tools/flow');

  console.log('\n======================================================');
  console.log('🚦 ACTION REQUIRED 🚦');
  console.log('1. Please log in to your Google Account.');
  console.log('2. Once you see the "Dự án mới" screen, press ENTER here.');
  console.log('======================================================\n');

  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  console.log('🔒 Saving persistent context...');
  await context.close();
  process.exit(0);
})();

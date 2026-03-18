const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function launchNativeChromeAndConnect() {
  const userDataDir = path.join(__dirname, 'chrome-debug');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // Corrected path for macOS

  console.log('🔄 Checking if existing Chrome debug instance is running...');

  try {
    // Try to connect first in case it's already running
    return await chromium.connectOverCDP('http://127.0.0.1:9222');
  } catch (err) {
    console.log('🚀 Chrome is not running on debugging port. Spawning it automatically in the background...');

    // Create dir if not exists
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Spawn Native Chrome with debugging port
    const chromeProcess = spawn(chromePath, [
      '--remote-debugging-port=9222',
      `--user-data-dir=${userDataDir}`,
      '--disable-blink-features=AutomationControlled', // Add this arg for stealth
      '--ignore-certificate-errors',
      '--window-size=1920,1080', // Essential: ensure desktop UI renders properly
    ], { detached: true, stdio: 'ignore' });

    chromeProcess.unref();

    console.log('⏳ Waiting 3 seconds for Chrome to initialize...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('🔄 Connecting to newly spawned Chrome via CDP...');
    return await chromium.connectOverCDP('http://127.0.0.1:9222');
  }
}

async function generateSeries(prompts, outputDir, config = { type: 'Video', orientation: 'Ngang' }) {
  let browser;
  try {
    browser = await launchNativeChromeAndConnect();
  } catch (err) {
    console.error('❌ Failed to connect to or spawn Chrome:', err);
    process.exit(1);
  }

  let context = browser.contexts()[0];
  if (!context) {
    context = await browser.newContext();
  }

  let page = await context.newPage();

  console.log('🌐 Navigating to Google Labs Flow...');
  await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle' });

  try {
    // 1. Initial Onboarding/Setup
    const createWithFlowBtn = page.locator('button', { hasText: 'Create with Flow' }).first();
    try {
      await createWithFlowBtn.waitFor({ state: 'visible', timeout: 5000 });
      await createWithFlowBtn.click();
      await page.waitForTimeout(3000);
    } catch (e) { }

    const getStartedBtn = page.locator('button:has-text("Bắt đầu"), button:has-text("Get started")').first();
    try {
      await getStartedBtn.waitFor({ state: 'visible', timeout: 3000 });
      await getStartedBtn.click();
      await page.waitForTimeout(3000);
    } catch (e) { }

    let promptInput = page.locator('div[contenteditable="true"][role="textbox"]').first();
    const isAlreadyInProject = await promptInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isAlreadyInProject) {
      const newProjectBtn = page.locator('button:has-text("Dự án mới"), div[role="button"]:has-text("Dự án mới")').first();
      try {
        await newProjectBtn.waitFor({ state: 'visible', timeout: 5000 });
        await newProjectBtn.click();
        await promptInput.waitFor({ state: 'visible', timeout: 15000 });
      } catch (e) { }
    }

    // 2. Loop through prompts
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const promptId = prompt.id || `prompt_${i}`;
      const promptText = prompt.text || prompt;

      console.log(`\n🎬 Working on [${i + 1}/${prompts.length}]: "${promptText.substring(0, 50)}..."`);

      await promptInput.waitFor({ state: 'visible', timeout: 15000 });

      // Apply config only for the first prompt to save time
      if (i === 0) {
        try {
          const configBtn = promptInput.locator('xpath=ancestor::div[1]').locator('button').first();
          if (await configBtn.isVisible()) {
            await configBtn.click();
            await page.waitForTimeout(1000);
            if (config.type) await page.locator(`button:has-text("${config.type}")`).first().click().catch(() => { });
            if (config.orientation) await page.locator(`button:has-text("${config.orientation}")`).first().click().catch(() => { });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        } catch (e) { }
      }

      // Enter prompt
      await promptInput.click({ force: true });
      // Clear existing text if any (triple click + backspace)
      await page.keyboard.down('Meta');
      await page.keyboard.press('a');
      await page.keyboard.up('Meta');
      await page.keyboard.press('Backspace');

      await page.keyboard.type(promptText, { delay: 20 });
      await page.keyboard.press('Enter');

      // Fallback click
      try {
        const submitBtn = promptInput.locator('xpath=ancestor::div[1]').locator('button').last();
        if (await submitBtn.isVisible()) await submitBtn.click();
      } catch (e) { }

      console.log('⏳ Waiting for generation...');
      const videoLocator = page.locator('video').first();
      await videoLocator.waitFor({ state: 'visible', timeout: 300000 });

      console.log('🎉 Generation complete. Attempting download...');

      // Hover and Download
      await videoLocator.hover();
      await page.waitForTimeout(1000);

      // Click 3-dot (assume top-right of video)
      const box = await videoLocator.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width - 30, box.y + 30);
        await page.waitForTimeout(1000);
      }

      let downloadMenuItem = page.locator('text="Tải xuống"').first();
      if (!await downloadMenuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        downloadMenuItem = page.locator('text="Download"').first();
      }

      if (await downloadMenuItem.isVisible()) {
        await downloadMenuItem.hover();
        await page.waitForTimeout(1000);

        let downloadInitiated = false;
        const outputDirResolved = path.resolve(outputDir || path.join(__dirname, 'output'));
        if (!fs.existsSync(outputDirResolved)) fs.mkdirSync(outputDirResolved, { recursive: true });

        const resBtn = page.locator('text="720p"').first(); // Prefer 720p for speed/consistency in demo
        if (await resBtn.isVisible()) {
          const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
          await resBtn.click();
          const download = await downloadPromise;
          if (download) {
            const fileName = `${promptId}.mp4`;
            const downloadPath = path.join(outputDirResolved, fileName);
            await download.saveAs(downloadPath);
            console.log(`✅ [RESULT][${promptId}] ${downloadPath}`);
            downloadInitiated = true;
          }
        }

        if (!downloadInitiated) {
          const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
          await downloadMenuItem.click();
          const download = await downloadPromise;
          if (download) {
            const fileName = `${promptId}.mp4`;
            const downloadPath = path.join(outputDirResolved, fileName);
            await download.saveAs(downloadPath);
            console.log(`✅ [RESULT][${promptId}] ${downloadPath}`);
          }
        }
      } else {
        console.error(`❌ Download failed for prompt ${i + 1}`);
      }

      // Slight pause between prompts if needed
      await page.waitForTimeout(2000);
    }

  } catch (error) {
    console.error('Automation failed:', error);
    throw error;
  } finally {
    console.log('Closing browser context...');
    await context.close();
  }
}

const args = process.argv.slice(2);
if (args[0]) {
  try {
    const data = JSON.parse(args[0]);
    const prompts = Array.isArray(data) ? data : [data];
    const output = args[1] || './output';
    generateSeries(prompts, output).catch(err => {
      console.error('Fatal automation error:', err);
      process.exit(1);
    });
  } catch (e) {
    // Fallback for single raw text prompt
    generateSeries([{ text: args[0] }], args[1] || './output').catch(err => {
      console.error('Fatal automation error:', err);
      process.exit(1);
    });
  }
} else {
  console.log('Usage: node generate.js \'<JSON_PROMPTS>\' [output_dir]');
}

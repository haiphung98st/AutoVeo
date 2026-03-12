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

async function generateVideo(promptText, outputDir, config = { type: 'Video', orientation: 'Ngang' }) {
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

  let page;
  // Try to find if a Flow tab is already open
  for (const existingPage of context.pages()) {
    if (existingPage.url().includes('labs.google/fx/vi/tools/flow')) {
      page = existingPage;
      await page.bringToFront();
      break;
    }
  }

  // If not open, create a new tab and navigate
  if (!page) {
    page = await context.newPage();
  }

  console.log('🌐 Navigating to Google Labs Flow...');
  await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle' });

  try {
    console.log('🤖 Checking for "Create with Flow" button...');
    const createWithFlowBtn = page.locator('button', { hasText: 'Create with Flow' }).first();
    try {
      await createWithFlowBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('🖱️ Clicking "Create with Flow"...');
      await createWithFlowBtn.click();
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('⏩ "Create with Flow" button not found, assuming already on dashboard.');
    }

    console.log('🤖 Checking for "Bắt đầu" (Get Started) onboarding button...');
    // The button might say "Bắt đầu" or "Get started"
    const getStartedBtn = page.locator('button:has-text("Bắt đầu"), button:has-text("Get started")').first();
    try {
      await getStartedBtn.waitFor({ state: 'visible', timeout: 3000 });
      console.log('🖱️ Clicking "Bắt đầu"...');
      await getStartedBtn.click();
      await page.waitForTimeout(3000); // Wait for transition to the New Project screen
    } catch (e) {
      console.log('⏩ "Bắt đầu" button not found, continuing...');
    }

    console.log('🤖 Looking for "New Project" (Dự án mới) button...');

    // Check if we are already in a project by looking for the textarea
    let promptInput = page.locator('div[contenteditable="true"][role="textbox"]').first();
    const isAlreadyInProject = await promptInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isAlreadyInProject) {
      // Attempting a more generic locator combining text and tags
      const newProjectBtn = page.locator('button:has-text("Dự án mới"), div[role="button"]:has-text("Dự án mới")').first();
      try {
        await newProjectBtn.waitFor({ state: 'visible', timeout: 5000 });
        console.log('🖱️ Clicking "New Project"...');
        await newProjectBtn.click();
        console.log('👀 Waiting for prompt text area to appear...');
        await promptInput.waitFor({ state: 'visible', timeout: 15000 });
      } catch (e) {
        console.log('⏩ "New Project" button not found, assuming prompt area is going to load or already there.');
      }
    } else {
      console.log('✅ Already in a project! Proceeding to prompt...');
    }

    // Ensure the prompt input is ready
    await promptInput.waitFor({ state: 'visible', timeout: 15000 });

    // --- APPLY CONFIGURATIONS ---
    console.log('⚙️ Applying generation configurations...');
    try {
      // Find the button next to the prompt area that opens the settings panel
      const configBtn = promptInput.locator('xpath=ancestor::div[1]').locator('button').first();
      if (await configBtn.isVisible()) {
        await configBtn.click(); // Open the popup
        await page.waitForTimeout(1000);

        // Select Type (e.g. "Video" or "Hình ảnh")
        if (config.type) {
          const typeBtn = page.locator(`button:has-text("${config.type}")`).first();
          if (await typeBtn.isVisible()) {
            console.log(`  -> Selected Type: ${config.type}`);
            await typeBtn.click();
          }
        }

        // Select Orientation ("Ngang" or "Dọc")
        if (config.orientation) {
          const oriBtn = page.locator(`button:has-text("${config.orientation}")`).first();
          if (await oriBtn.isVisible()) {
            console.log(`  -> Selected Orientation: ${config.orientation}`);
            await oriBtn.click();
          }
        }
        // Close config popup by pressing Escape (safer than clicking which might be intercepted)
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('⚠️ Could not apply configurations, continuing with defaults.', e.message);
    }
    // ----------------------------

    console.log(`⌨️ Entering prompt: "${promptText}"`);
    // Force click in case anything is still subtly overlaying it
    await promptInput.click({ force: true });
    await page.keyboard.type(promptText, { delay: 50 });

    console.log('🖱️ Clicking Submit/Generate...');
    // The submit button is likely the button next to the text area.
    // Try hitting Enter first (common for these UIs)
    await page.keyboard.press('Enter');

    // As a fallback, try to find and click the round arrow button
    try {
      // Find a button close to the input that contains an icon
      const submitBtn = promptInput.locator('xpath=ancestor::div[1]').locator('button').last();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    } catch (e) {
      // Ignore if button not found or not clickable, Enter might have worked
    }

    console.log('⏳ Waiting for generation to complete (this can take several minutes)...');

    // Look for a video element to appear
    const videoLocator = page.locator('video').first();
    await videoLocator.waitFor({ state: 'visible', timeout: 300000 }); // 5 minutes timeout

    console.log('🎉 Video generation complete!');

    // Extract video URL (might be a blob, useful for logging)
    const videoUrl = await videoLocator.getAttribute('src');
    console.log(`📺 Video source: ${videoUrl}`);

    console.log('👀 Hovering over video to reveal menu...');
    await videoLocator.hover();
    await page.waitForTimeout(1500); // Wait for menu to animate in

    console.log('🖱️ Opening 3-dot options menu...');
    let menuOpened = false;

    // Attempt 1: Click by coordinates (top right of video)
    const box = await videoLocator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width - 30, box.y + 30);
      await page.mouse.click(box.x + box.width - 30, box.y + 30);
      await page.waitForTimeout(1000);
    }

    // Check if 'Tải xuống' or 'Download' menu item appeared
    let downloadMenuItem = page.locator('text="Tải xuống"').first();
    if (!await downloadMenuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      downloadMenuItem = page.locator('text="Download"').first();
    }

    if (await downloadMenuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      menuOpened = true;
    } else {
      // Attempt 2: Try to find a button in the top right
      console.log('⚠️ Coordinate click failed, trying to find menu button via DOM...');
      const buttons = await page.locator('button').all();
      let closestBtn = null;
      let minDistance = Infinity;
      if (box) {
        for (const btn of buttons) {
          if (await btn.isVisible()) {
            const btnBox = await btn.boundingBox();
            if (btnBox) {
              const dx = btnBox.x - (box.x + box.width);
              const dy = btnBox.y - box.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < minDistance && distance < 150) {
                minDistance = distance;
                closestBtn = btn;
              }
            }
          }
        }
      }
      if (closestBtn) {
        await closestBtn.click();
        await page.waitForTimeout(1000);
        if (await downloadMenuItem.isVisible({ timeout: 2000 }).catch(() => false)) menuOpened = true;
      }
    }

    if (menuOpened) {
      console.log('🖱️ Selecting "Tải xuống"...');
      await downloadMenuItem.hover();
      await page.waitForTimeout(1000); // Wait for resolution sub-menu

      console.log('🖱️ Selecting resolution...');
      const resolutions = ['4K', '1080p', '720p', '270p'];
      let downloadInitiated = false;

      // Ensure output directory exists
      const outputDirResolved = path.resolve(outputDir || path.join(__dirname, 'output'));
      if (!fs.existsSync(outputDirResolved)) {
        fs.mkdirSync(outputDirResolved, { recursive: true });
      }

      for (const res of resolutions) {
        const resBtn = page.locator(`text="${res}"`).first();
        if (await resBtn.isVisible()) {
          // Check if the button is actually enabled (e.g., 4K might be disabled for non-Pro)
          const isEnabled = await resBtn.isEnabled({ timeout: 1000 }).catch(() => false);
          if (!isEnabled) {
            console.log(`  -> Skipping ${res} (disabled or requires upgrade)`);
            continue; // Fall back to the next resolution
          }

          console.log(`  -> Downloading ${res} version...`);

          const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(e => {
            console.error("Download event timeout");
            return null;
          });

          await resBtn.click();

          const download = await downloadPromise;
          if (download) {
            const downloadPath = path.join(outputDirResolved, download.suggestedFilename());
            await download.saveAs(downloadPath);
            console.log(`✅ Video saved to ${downloadPath}`);
            downloadInitiated = true;
          }
          break;
        }
      }

      if (!downloadInitiated) {
        console.log('  -> No resolution sub-menu found, clicking "Tải xuống" directly...');
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(e => {
          console.error("Download event timeout");
          return null;
        });
        await downloadMenuItem.click();
        const download = await downloadPromise;
        if (download) {
          const downloadPath = path.join(outputDirResolved, download.suggestedFilename());
          await download.saveAs(downloadPath);
          console.log(`✅ Video saved to ${downloadPath}`);
        } else {
          console.log("⚠️ Could not intercept download.");
        }
      }
    } else {
      console.log("⚠️ Could not open the options menu. Make sure the video is hovered properly.");
    }

  } catch (error) {
    console.error('Automation failed:', error);
  } finally {
    console.log('Closing browser context...');
    await context.close();
  }
}

const args = process.argv.slice(2);
if (args[0]) {
  generateVideo(args[0], './output');
} else {
  console.log('Usage: node generate.js "Your video prompt here"');
}

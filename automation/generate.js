const { chromium } = require('playwright');

async function generateVideo(promptText, outputDir, config = { type: 'Video', orientation: 'Ngang' }) {
  console.log('🔄 Connecting to existing Chrome instance...');

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (err) {
    console.error('❌ Failed to connect to Chrome. Did you launch it with --remote-debugging-port=9222?');
    process.exit(1);
  }

  const context = browser.contexts()[0];
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
    console.log('🌐 Navigating to Google Labs Flow...');
    await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle' });
  } else {
    console.log('🌐 Found existing Google Labs Flow tab...');
  }

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

    // Extract video URL
    const videoUrl = await videoLocator.getAttribute('src');
    console.log(`📺 Video URL: ${videoUrl}`);

  } catch (error) {
    console.error('Automation failed:', error);
  } finally {
    console.log('Detaching from Chrome...');
    await browser.close(); // Note: This detaches Playwright, it does NOT kill the user's Chrome window!
  }
}

const args = process.argv.slice(2);
if (args[0]) {
  generateVideo(args[0], './output');
} else {
  console.log('Usage: node generate.js "Your video prompt here"');
}

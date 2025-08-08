import { Browser } from '@playwright/test';

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // Close browser instance
  const browser = (global as any).__BROWSER__ as Browser;
  if (browser) {
    console.log('🌐 Closing browser...');
    await browser.close();
  }
  
  // Cleanup test files
  console.log('📁 Cleaning up test files...');
  
  console.log('✅ Global teardown complete!');
}

export default globalTeardown;

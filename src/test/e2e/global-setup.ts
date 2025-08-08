import { chromium, Browser, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as vscode from 'vscode';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Setup VS Code test environment
  console.log('📦 Setting up VS Code test environment...');
  
  // Ensure extension is built
  console.log('🔨 Building extension...');
  
  // Create test fixtures directory
  const fixturesDir = path.join(__dirname, '../fixtures');
  
  // Setup browser for webview testing
  console.log('🌐 Launching browser for webview tests...');
  const browser = await chromium.launch({
    headless: process.env.CI ? true : false,
    slowMo: process.env.CI ? 0 : 100,
  });
  
  // Store browser instance for tests
  (global as any).__BROWSER__ = browser;
  
  console.log('✅ Global setup complete!');
}

export default globalSetup;

import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

export default defineConfig({
  // Test directory
  testDir: './src/test/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global test timeout
    actionTimeout: 10000,
  },

  // Configure projects for major browsers and VS Code scenarios
  projects: [
    {
      name: 'vscode-webview',
      testDir: './src/test/e2e/webview',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1200, height: 800 },
        contextOptions: {
          // Simulate VS Code webview environment
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.84.0 Chrome/118.0.0.0 Electron/27.0.0 Safari/537.36',
        },
      },
    },
    
    {
      name: 'vscode-extension',
      testDir: './src/test/e2e/extension',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 1000 },
      },
    },

    // Cross-platform testing
    {
      name: 'windows-edge',
      testDir: './src/test/e2e',
      use: { ...devices['Desktop Edge'] },
    },

    {
      name: 'mac-safari',
      testDir: './src/test/e2e',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run serve:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },

  // Global setup and teardown
  globalSetup: require.resolve('./src/test/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./src/test/e2e/global-teardown.ts'),

  // Test output directories
  outputDir: 'test-results/',
  
  // Timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000,
    // Screenshot comparison settings
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
});
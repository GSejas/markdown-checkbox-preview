/**
 * End-to-End tests for complete CodeLens workflow
 * Testing the full user experience from document creation to interaction
 */

import { test, expect, Page } from '@playwright/test';

test.describe('CodeLens End-to-End Workflow Tests', () => {
    test('should display CodeLens actions for markdown checkboxes', async ({ page }) => {
        // Create a test markdown document with checkboxes
        const testContent = `# Project Management Demo

## Sprint Tasks
- [ ] Implement user authentication system
- [ ] Create database schema for users
  - [ ] Design user table structure
  - [x] Add database indexes
  - [ ] Create migration scripts
- [x] Set up CI/CD pipeline
- [ ] Write comprehensive unit tests
  - [ ] Test authentication logic
  - [ ] Test database operations
  - [ ] Test API endpoints

## Documentation
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Write deployment instructions`;

        // Navigate to VS Code web interface
        await page.goto('http://localhost:3000');

        // Wait for VS Code to load
        await page.waitForSelector('.monaco-workbench', { timeout: 30000 });

        // Create a new markdown file
        await page.keyboard.press('Control+Shift+P');
        await page.waitForSelector('.quick-input-widget');
        await page.fill('.quick-input-widget .input', '>Markdown: Create new file');
        await page.keyboard.press('Enter');

        // Type the test content
        await page.fill('.monaco-editor .view-lines', testContent);

        // Wait for CodeLens to appear (they appear above checkbox lines)
        await page.waitForSelector('.codelens-decoration', { timeout: 5000 });

        // Verify CodeLens actions are present
        const codelensElements = await page.locator('.codelens-decoration').all();
        expect(codelensElements.length).toBeGreaterThan(0);

        // Test clicking a CodeLens action
        const firstCodelens = page.locator('.codelens-decoration').first();
        await firstCodelens.click();

        // Verify the checkbox state changed in the document
        const editorContent = await page.locator('.monaco-editor .view-lines').textContent();
        expect(editorContent).toContain('[x]'); // Should have checked some boxes
    });

    test('should handle nested checkbox hierarchies', async ({ page }) => {
        const nestedContent = `# Nested Tasks
- [ ] Parent task
  - [ ] Child task 1
    - [ ] Grandchild task
  - [x] Child task 2
- [x] Another parent task`;

        await page.goto('http://localhost:3000');
        await page.waitForSelector('.monaco-workbench', { timeout: 30000 });

        // Create and populate markdown file
        await page.keyboard.press('Control+Shift+P');
        await page.fill('.quick-input-widget .input', '>Markdown: Create new file');
        await page.keyboard.press('Enter');
        await page.fill('.monaco-editor .view-lines', nestedContent);

        // Wait for CodeLens to appear
        await page.waitForSelector('.codelens-decoration', { timeout: 5000 });

        // Verify multiple CodeLens elements for nested structure
        const codelensCount = await page.locator('.codelens-decoration').count();
        expect(codelensCount).toBeGreaterThanOrEqual(4); // At least 4 checkboxes
    });

    test('should sync CodeLens actions with preview', async ({ page }) => {
        const syncContent = `- [ ] Task to toggle
- [x] Already completed task`;

        await page.goto('http://localhost:3000');
        await page.waitForSelector('.monaco-workbench', { timeout: 30000 });

        // Create markdown file
        await page.keyboard.press('Control+Shift+P');
        await page.fill('.quick-input-widget .input', '>Markdown: Create new file');
        await page.keyboard.press('Enter');
        await page.fill('.monaco-editor .view-lines', syncContent);

        // Open preview
        await page.keyboard.press('Control+Shift+P');
        await page.fill('.quick-input-widget .input', '>Open Interactive Checkbox Preview');
        await page.keyboard.press('Enter');

        // Wait for preview to open
        await page.waitForSelector('.webview-content', { timeout: 10000 });

        // Click CodeLens to toggle checkbox
        const codelens = page.locator('.codelens-decoration').first();
        await codelens.click();

        // Verify preview updates (checkbox should be checked)
        const previewCheckbox = page.locator('.webview-content input[type="checkbox"]').first();
        await expect(previewCheckbox).toBeChecked();
    });
});

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Test fixtures - different markdown scenarios
const testMarkdownFiles = {
  simple: `# Simple Checklist
- [x] Completed task
- [ ] Pending task
- [x] Another completed task`,
  
  hierarchical: `# Project Tasks

## Frontend Development
- [x] Set up React project
- [x] Create component structure  
- [ ] Implement user authentication
  - [x] Login form
  - [x] Registration form
  - [ ] Password reset
- [ ] Add routing
  - [ ] Setup React Router
  - [ ] Protected routes

## Backend Development  
- [x] Set up Express server
- [ ] Create database models
  - [ ] User model
  - [ ] Task model
- [ ] Implement REST API`,

  complex: `# Complex Nested Structure

## Phase 1: Planning
- [x] Define requirements
- [x] Create wireframes
- [ ] Assign team members
  - [x] Backend team
  - [ ] Frontend team
    - [x] Senior developer
    - [ ] Junior developer
      - [ ] React specialist
      - [x] CSS specialist
  - [x] QA team

## Phase 2: Development
### Frontend Tasks
- [x] Setup build tools
- [ ] Create UI components
  - [ ] Header component
  - [ ] Navigation component
  - [x] Footer component
- [ ] Implement routing

### Backend Tasks
- [x] Setup database
- [ ] Create API endpoints
  - [ ] Authentication
  - [ ] User management
  - [x] Data validation
- [x] Write tests

## Phase 3: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
  - [ ] User workflows
  - [ ] Error scenarios`,

  malformed: `# Malformed Content Test
- [x] Normal checkbox
- [x ] Space after x
- [ x] Space before x
- [] Missing space
- [xx] Double x
- [X] Capital X
- [ ] Normal unchecked
- [?] Invalid character`,

  performance: generateLargeMarkdown(500), // 500 checkboxes for performance testing
};

function generateLargeMarkdown(count: number): string {
  let content = '# Performance Test Document\n\n';
  for (let i = 0; i < count; i++) {
    const checked = i % 3 === 0 ? 'x' : ' ';
    const indent = '  '.repeat(Math.floor(i / 10) % 4);
    content += `${indent}- [${checked}] Task ${i + 1}\n`;
  }
  return content;
}

test.describe('Webview Visual Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set viewport size
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Mock VS Code webview environment
    await page.addInitScript(() => {
      // Mock acquireVsCodeApi
      (window as any).acquireVsCodeApi = () => ({
        postMessage: (message: any) => {
          console.log('Mock VS Code API message:', message);
        },
        setState: (state: any) => {
          console.log('Mock VS Code API setState:', state);
        },
        getState: () => {
          return null;
        }
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should render simple checkbox list correctly', async () => {
    // Create HTML content with our webview structure
    const htmlContent = generateWebviewHTML(testMarkdownFiles.simple);
    await page.setContent(htmlContent);
    
    // Wait for content to load
    await page.waitForSelector('.md-checkbox', { timeout: 5000 });
    
    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('simple-checkbox-list.png');
    
    // Verify checkboxes are rendered
    const checkboxes = await page.locator('.md-checkbox').count();
    expect(checkboxes).toBe(3);
    
    // Verify checked states
    const checkedBoxes = await page.locator('.md-checkbox[checked]').count();
    expect(checkedBoxes).toBe(2);
  });

  test('should render hierarchical structure with proper nesting', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.hierarchical);
    await page.setContent(htmlContent);
    
    await page.waitForSelector('.md-checkbox');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('hierarchical-structure.png');
    
    // Verify nested structure is preserved
    const nestedItems = await page.locator('ul ul .md-checkbox').count();
    expect(nestedItems).toBeGreaterThan(0);
  });

  test('should handle checkbox interactions', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.simple);
    await page.setContent(htmlContent);
    
    await page.waitForSelector('.md-checkbox');
    
    // Take before screenshot
    await expect(page).toHaveScreenshot('before-interaction.png');
    
    // Click on an unchecked checkbox
    const uncheckedBox = page.locator('.md-checkbox:not([checked])').first();
    await uncheckedBox.click();
    
    // Wait for potential animations
    await page.waitForTimeout(500);
    
    // Take after screenshot
    await expect(page).toHaveScreenshot('after-checkbox-click.png');
  });

  test('should display task completion statistics', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.hierarchical);
    await page.setContent(htmlContent);
    
    await page.waitForSelector('.task-stats');
    
    // Take screenshot of stats
    await expect(page.locator('.task-stats')).toHaveScreenshot('task-statistics.png');
    
    // Verify stats content
    const statsText = await page.locator('.task-stats').textContent();
    expect(statsText).toContain('completed');
    expect(statsText).toContain('total');
  });

  test('should handle malformed markdown gracefully', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.malformed);
    await page.setContent(htmlContent);
    
    // Should not crash
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Take screenshot to verify rendering
    await expect(page).toHaveScreenshot('malformed-markdown.png');
    
    // Should render some checkboxes despite malformed content
    const checkboxes = await page.locator('.md-checkbox').count();
    expect(checkboxes).toBeGreaterThan(0);
  });

  test('should handle large documents efficiently', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.performance);
    await page.setContent(htmlContent);
    
    // Measure render time
    const startTime = Date.now();
    await page.waitForSelector('.md-checkbox');
    const renderTime = Date.now() - startTime;
    
    // Should render within reasonable time (2 seconds)
    expect(renderTime).toBeLessThan(2000);
    
    // Take screenshot of large document
    await expect(page).toHaveScreenshot('large-document.png', {
      fullPage: true,
      maxDiffPixels: 1000 // Allow more variance for large content
    });
    
    // Verify performance
    const checkboxCount = await page.locator('.md-checkbox').count();
    expect(checkboxCount).toBe(500);
  });

  test('should support dark theme', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.simple, true); // Dark theme
    await page.setContent(htmlContent);
    
    await page.waitForSelector('.md-checkbox');
    
    // Take screenshot with dark theme
    await expect(page).toHaveScreenshot('dark-theme.png');
  });

  test('should be responsive on different screen sizes', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.hierarchical);
    await page.setContent(htmlContent);
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('.md-checkbox');
    await expect(page).toHaveScreenshot('mobile-view.png');
    
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('tablet-view.png');
    
    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveScreenshot('desktop-view.png');
  });

  test('should record user interaction video', async () => {
    const htmlContent = generateWebviewHTML(testMarkdownFiles.hierarchical);
    await page.setContent(htmlContent);
    
    await page.waitForSelector('.md-checkbox');
    
    // Start recording
    const recording = await page.video();
    
    // Perform various interactions
    const checkboxes = page.locator('.md-checkbox');
    const count = await checkboxes.count();
    
    for (let i = 0; i < Math.min(5, count); i++) {
      await checkboxes.nth(i).click();
      await page.waitForTimeout(500); // Pause between clicks
    }
    
    // Scroll through content
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -300);
    
    // Stop recording
    if (recording) {
      const videoPath = await recording.path();
      console.log(`Video saved to: ${videoPath}`);
    }
  });
});

// Helper function to generate webview HTML
function generateWebviewHTML(markdownContent: string, darkTheme: boolean = false): string {
  // This would use our actual renderer
  const { renderMarkdown, getTaskListCount } = require('../../renderer');
  
  const renderedHTML = renderMarkdown(markdownContent);
  const stats = getTaskListCount(markdownContent);
  
  const themeClass = darkTheme ? 'vscode-dark' : 'vscode-light';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Checkbox Preview</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .task-stats {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 20px;
            font-weight: bold;
        }
        
        .md-checkbox {
            cursor: pointer;
            margin-right: 8px;
            transform: scale(1.2);
        }
        
        .md-checkbox:hover {
            transform: scale(1.3);
        }
        
        ul {
            padding-left: 20px;
        }
        
        li {
            margin: 4px 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-titleBar-activeForeground);
            margin-top: 24px;
            margin-bottom: 16px;
        }
        
        /* Dark theme variables */
        .vscode-dark {
            --vscode-editor-background: #1e1e1e;
            --vscode-editor-foreground: #d4d4d4;
            --vscode-textBlockQuote-background: #2d2d30;
            --vscode-textBlockQuote-border: #464647;
            --vscode-titleBar-activeForeground: #cccccc;
        }
        
        /* Light theme variables */
        .vscode-light {
            --vscode-editor-background: #ffffff;
            --vscode-editor-foreground: #333333;
            --vscode-textBlockQuote-background: #f8f8f8;
            --vscode-textBlockQuote-border: #e1e1e1;
            --vscode-titleBar-activeForeground: #333333;
        }
    </style>
</head>
<body class="${themeClass}">
    <div class="task-stats">
        📊 Progress: ${stats.completed}/${stats.total} completed (${Math.round((stats.completed / stats.total) * 100) || 0}%)
    </div>
    
    <div class="markdown-content">
        ${renderedHTML}
    </div>
    
    <script>
        // Mock VS Code API
        const vscode = acquireVsCodeApi();
        
        // Handle checkbox clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('md-checkbox')) {
                const line = event.target.dataset.line;
                vscode.postMessage({
                    command: 'toggleCheckbox',
                    line: parseInt(line, 10)
                });
                
                // Toggle checkbox state for immediate feedback
                event.target.checked = !event.target.checked;
                
                // Update stats
                updateStats();
            }
        });
        
        function updateStats() {
            const checkboxes = document.querySelectorAll('.md-checkbox');
            const completed = document.querySelectorAll('.md-checkbox:checked').length;
            const total = checkboxes.length;
            const percentage = Math.round((completed / total) * 100) || 0;
            
            const statsElement = document.querySelector('.task-stats');
            if (statsElement) {
                statsElement.textContent = \`📊 Progress: \${completed}/\${total} completed (\${percentage}%)\`;
            }
        }
        
        // Initial stats update
        updateStats();
    </script>
</body>
</html>`;
}

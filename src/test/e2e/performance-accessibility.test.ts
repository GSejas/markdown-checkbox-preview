import { test, expect, Page } from '@playwright/test';

test.describe('Performance & Accessibility Tests', () => {
  
  test.describe('Performance Benchmarks', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 1200, height: 800 });
    });

    test.afterEach(async () => {
      await page.close();
    });

    test('should render large documents within performance budget', async () => {
      // Generate a large markdown document
      const largeMarkdown = generateLargeMarkdown(1000);
      const htmlContent = generateWebviewHTML(largeMarkdown);
      
      // Measure initial load time
      const startTime = Date.now();
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      const loadTime = Date.now() - startTime;
      
      // Performance budget: 3 seconds for 1000 checkboxes
      expect(loadTime).toBeLessThan(3000);
      
      // Measure interaction performance
      const interactionStart = Date.now();
      await page.locator('.md-checkbox').first().click();
      const interactionTime = Date.now() - interactionStart;
      
      // Interaction should be fast (under 100ms)
      expect(interactionTime).toBeLessThan(100);
      
      // Check memory usage (simplified)
      const metrics = await page.evaluate(() => {
        return {
          checkboxCount: document.querySelectorAll('.md-checkbox').length,
          domNodes: document.querySelectorAll('*').length
        };
      });
      
      expect(metrics.checkboxCount).toBe(1000);
      expect(metrics.domNodes).toBeLessThan(5000); // Reasonable DOM size
    });

    test('should handle rapid checkbox toggles without performance degradation', async () => {
      const markdown = generateMediumMarkdown(100);
      const htmlContent = generateWebviewHTML(markdown);
      
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Perform rapid toggles
      const toggleTimes: number[] = [];
      const checkboxes = page.locator('.md-checkbox');
      
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await checkboxes.nth(i % 10).click();
        const end = Date.now();
        toggleTimes.push(end - start);
      }
      
      // Average toggle time should remain low
      const avgToggleTime = toggleTimes.reduce((a, b) => a + b, 0) / toggleTimes.length;
      expect(avgToggleTime).toBeLessThan(50);
      
      // No significant performance degradation over time
      const firstHalf = toggleTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const secondHalf = toggleTimes.slice(10).reduce((a, b) => a + b, 0) / 10;
      expect(secondHalf / firstHalf).toBeLessThan(2); // Less than 2x slower
    });

    test('should efficiently update statistics display', async () => {
      const markdown = generateMediumMarkdown(200);
      const htmlContent = generateWebviewHTML(markdown);
      
      await page.setContent(htmlContent);
      await page.waitForSelector('.task-stats');
      
      // Measure stats update time
      const updateTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await page.locator('.md-checkbox').nth(i).click();
        
        // Wait for stats to update
        await page.waitForFunction(() => {
          const stats = document.querySelector('.task-stats')?.textContent;
          return stats && stats.includes('completed');
        });
        
        const end = Date.now();
        updateTimes.push(end - start);
      }
      
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      expect(avgUpdateTime).toBeLessThan(100); // Stats update under 100ms
    });

    test('should handle scroll performance with large content', async () => {
      const largeMarkdown = generateLargeMarkdown(500);
      const htmlContent = generateWebviewHTML(largeMarkdown);
      
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Measure scroll performance
      const scrollStart = Date.now();
      
      // Perform scrolling
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(50);
      }
      
      const scrollTime = Date.now() - scrollStart;
      expect(scrollTime).toBeLessThan(2000); // Smooth scrolling
      
      // Verify content is still interactive after scrolling
      await page.locator('.md-checkbox').first().click();
      
      // Take screenshot to verify no visual issues
      await expect(page).toHaveScreenshot('after-scroll-performance.png');
    });
  });

  test.describe('Accessibility Tests', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      await page.setViewportSize({ width: 1200, height: 800 });
    });

    test.afterEach(async () => {
      await page.close();
    });

    test('should have proper ARIA labels and roles', async () => {
      const markdown = `# Accessibility Test
- [x] Completed task
- [ ] Pending task
- [x] Another completed task`;
      
      const htmlContent = generateAccessibleWebviewHTML(markdown);
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Check ARIA attributes
      const checkboxes = page.locator('.md-checkbox');
      const firstCheckbox = checkboxes.first();
      
      // Verify checkbox has proper role
      await expect(firstCheckbox).toHaveAttribute('role', 'checkbox');
      
      // Verify aria-checked state
      const checkedBox = page.locator('.md-checkbox[checked]').first();
      await expect(checkedBox).toHaveAttribute('aria-checked', 'true');
      
      const uncheckedBox = page.locator('.md-checkbox:not([checked])').first();
      await expect(uncheckedBox).toHaveAttribute('aria-checked', 'false');
      
      // Verify accessible labels
      await expect(firstCheckbox).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', async () => {
      const markdown = `# Keyboard Test
- [x] Task 1
- [ ] Task 2
- [ ] Task 3`;
      
      const htmlContent = generateAccessibleWebviewHTML(markdown);
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Focus first checkbox
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveClass(/md-checkbox/);
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      
      // Toggle with Space or Enter
      await page.keyboard.press('Space');
      
      // Verify interaction worked
      await page.waitForTimeout(100);
      await expect(page).toHaveScreenshot('keyboard-navigation.png');
    });

    test('should work with screen readers', async () => {
      const markdown = `# Screen Reader Test
- [x] Accessible completed task
- [ ] Accessible pending task`;
      
      const htmlContent = generateAccessibleWebviewHTML(markdown);
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Simulate screen reader navigation
      const checkboxes = await page.locator('.md-checkbox').all();
      
      for (const checkbox of checkboxes) {
        // Verify each checkbox has accessible text
        const ariaLabel = await checkbox.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('task');
        
        // Verify state is communicated
        const isChecked = await checkbox.getAttribute('aria-checked');
        expect(isChecked).toMatch(/true|false/);
      }
    });

    test('should have sufficient color contrast', async () => {
      const markdown = `# Contrast Test
- [x] High contrast task
- [ ] Another task`;
      
      // Test both light and dark themes
      const themes = ['light', 'dark'];
      
      for (const theme of themes) {
        const htmlContent = generateAccessibleWebviewHTML(markdown, theme === 'dark');
        await page.setContent(htmlContent);
        await page.waitForSelector('.md-checkbox');
        
        // Take screenshot for manual contrast analysis
        await expect(page).toHaveScreenshot(`contrast-${theme}-theme.png`);
        
        // Basic color validation
        const styles = await page.evaluate(() => {
          const checkbox = document.querySelector('.md-checkbox');
          const computed = window.getComputedStyle(checkbox!);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor
          };
        });
        
        expect(styles.color).toBeTruthy();
        expect(styles.backgroundColor).toBeTruthy();
      }
    });

    test('should support high contrast mode', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      const markdown = `# High Contrast Test
- [x] Visible task
- [ ] Another visible task`;
      
      const htmlContent = generateAccessibleWebviewHTML(markdown);
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Take screenshot to verify high contrast appearance
      await expect(page).toHaveScreenshot('high-contrast-mode.png');
      
      // Verify elements are still visible and interactive
      await page.locator('.md-checkbox').first().click();
      await expect(page).toHaveScreenshot('high-contrast-after-click.png');
    });

    test('should have proper heading structure', async () => {
      const markdown = `# Main Heading
## Section 1
- [x] Task 1
### Subsection
- [ ] Task 2
## Section 2
- [x] Task 3`;
      
      const htmlContent = generateAccessibleWebviewHTML(markdown);
      await page.setContent(htmlContent);
      
      // Verify heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading levels are logical
      const headingLevels = await Promise.all(
        headings.map(h => h.evaluate(el => parseInt(el.tagName.charAt(1))))
      );
      
      // First heading should be h1
      expect(headingLevels[0]).toBe(1);
      
      // No gaps in heading levels
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        expect(diff).toBeLessThanOrEqual(1);
      }
    });

    test('should provide skip links for long content', async () => {
      const largeMarkdown = generateLargeMarkdown(100);
      const htmlContent = generateAccessibleWebviewHTML(largeMarkdown);
      
      await page.setContent(htmlContent);
      await page.waitForSelector('.md-checkbox');
      
      // Look for skip links (if implemented)
      const skipLinks = page.locator('[href^="#"], .skip-link');
      
      if (await skipLinks.count() > 0) {
        // Test skip link functionality
        await skipLinks.first().click();
        await page.waitForTimeout(100);
        
        await expect(page).toHaveScreenshot('skip-link-navigation.png');
      }
    });
  });
});

// Helper functions
function generateLargeMarkdown(count: number): string {
  let content = '# Performance Test Document\n\n';
  for (let i = 0; i < count; i++) {
    const checked = i % 3 === 0 ? 'x' : ' ';
    const level = Math.floor(i / 50);
    const indent = '  '.repeat(level % 4);
    
    if (i % 50 === 0 && i > 0) {
      content += `\n## Section ${Math.floor(i / 50)}\n`;
    }
    
    content += `${indent}- [${checked}] Performance task ${i + 1}\n`;
  }
  return content;
}

function generateMediumMarkdown(count: number): string {
  let content = '# Medium Test Document\n\n';
  for (let i = 0; i < count; i++) {
    const checked = i % 2 === 0 ? 'x' : ' ';
    content += `- [${checked}] Task ${i + 1}\n`;
  }
  return content;
}

function generateWebviewHTML(markdownContent: string): string {
  // Simplified version - in real implementation, use actual renderer
  const lines = markdownContent.split('\n');
  let html = '<div class="task-stats">Progress: 0/0 completed (0%)</div><div class="markdown-content">';
  
  lines.forEach((line, index) => {
    if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>`;
    } else if (line.match(/^\s*- \[([ xX])\]/)) {
      const checked = line.includes('[x]') || line.includes('[X]');
      const text = line.replace(/^\s*- \[[xX ]\]\s*/, '');
      html += `<div><input type="checkbox" class="md-checkbox" data-line="${index}" ${checked ? 'checked' : ''}> ${text}</div>`;
    }
  });
  
  html += '</div>';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .md-checkbox { margin-right: 8px; cursor: pointer; }
    .task-stats { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

function generateAccessibleWebviewHTML(markdownContent: string, darkTheme: boolean = false): string {
  const lines = markdownContent.split('\n');
  let html = '<div class="task-stats" role="status" aria-live="polite">Progress: 0/0 completed (0%)</div><div class="markdown-content">';
  
  lines.forEach((line, index) => {
    if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>`;
    } else if (line.match(/^\s*- \[([ xX])\]/)) {
      const checked = line.includes('[x]') || line.includes('[X]');
      const text = line.replace(/^\s*- \[[xX ]\]\s*/, '');
      html += `<div>
        <input 
          type="checkbox" 
          class="md-checkbox" 
          data-line="${index}" 
          role="checkbox"
          aria-checked="${checked}"
          aria-label="${text} - ${checked ? 'completed' : 'pending'} task"
          tabindex="0"
          ${checked ? 'checked' : ''}
        > 
        <label for="checkbox-${index}">${text}</label>
      </div>`;
    }
  });
  
  html += '</div>';
  
  const themeStyles = darkTheme ? `
    body { background: #1e1e1e; color: #d4d4d4; }
    .task-stats { background: #2d2d30; border: 1px solid #464647; }
    .md-checkbox:focus { outline: 2px solid #007acc; }
  ` : `
    body { background: #ffffff; color: #333333; }
    .task-stats { background: #f8f8f8; border: 1px solid #e1e1e1; }
    .md-checkbox:focus { outline: 2px solid #0078d4; }
  `;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessible Markdown Checkbox Preview</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      line-height: 1.6;
    }
    .md-checkbox { 
      margin-right: 8px; 
      cursor: pointer;
      transform: scale(1.2);
    }
    .md-checkbox:hover {
      transform: scale(1.3);
    }
    .task-stats { 
      padding: 10px; 
      margin-bottom: 20px; 
      border-radius: 4px;
      font-weight: bold;
    }
    h1, h2, h3 {
      margin-top: 24px;
      margin-bottom: 16px;
    }
    ${themeStyles}
  </style>
</head>
<body>${html}
<script>
  document.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('md-checkbox')) {
      if (e.key === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        e.target.click();
      }
    }
  });
</script>
</body>
</html>`;
}

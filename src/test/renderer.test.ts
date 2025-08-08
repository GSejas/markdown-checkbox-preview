import * as assert from 'assert';
import { renderMarkdown, getTaskListCount } from '../renderer';

suite('Renderer Unit Tests', () => {
	
	suite('Markdown Rendering', () => {
		test('should render simple checkbox', () => {
			const markdown = '- [ ] Simple task';
			const html = renderMarkdown(markdown);
			
			assert.ok(html.includes('<input type="checkbox"'));
			assert.ok(html.includes('class="md-checkbox"'));
			assert.ok(html.includes('data-line="0"'));
			assert.ok(!html.includes('checked'));
		});

		test('should render checked checkbox', () => {
			const markdown = '- [x] Completed task';
			const html = renderMarkdown(markdown);
			
			assert.ok(html.includes('<input type="checkbox"'));
			assert.ok(html.includes('checked'));
		});

		test('should handle uppercase X', () => {
			const markdown = '- [X] Completed task with uppercase';
			const html = renderMarkdown(markdown);
			
			assert.ok(html.includes('checked'));
		});

		test('should preserve task text', () => {
			const markdown = '- [x] Buy groceries and cook dinner';
			const html = renderMarkdown(markdown);
			
			assert.ok(html.includes('Buy groceries and cook dinner'));
		});

		test('should handle multiple checkboxes', () => {
			const markdown = `- [ ] Task 1
- [x] Task 2
- [ ] Task 3`;
			const html = renderMarkdown(markdown);
			
			// Should have 3 checkboxes
			const checkboxCount = (html.match(/class="md-checkbox"/g) || []).length;
			assert.strictEqual(checkboxCount, 3);
		});

		test('should handle mixed content', () => {
			const markdown = `# Header

Some text

- [ ] Task 1
- [x] Task 2

More text

## Another header

- [ ] Task 3`;
			
			const html = renderMarkdown(markdown);
			
			// Should have 3 checkboxes
			const checkboxCount = (html.match(/class="md-checkbox"/g) || []).length;
			assert.strictEqual(checkboxCount, 3);
			
			// Should have headers with clickable attributes
			assert.ok(html.includes('<h1'));
			assert.ok(html.includes('<h2'));
			assert.ok(html.includes('class="clickable-header"'));
			assert.ok(html.includes('data-line='));
		});

		test('should escape HTML in task text', () => {
			const markdown = '- [ ] Task with <script>alert("xss")</script> HTML';
			const html = renderMarkdown(markdown);
			
			// Should escape the HTML
			assert.ok(!html.includes('<script>'));
			assert.ok(html.includes('&lt;script&gt;'));
		});

		test('should handle special characters', () => {
			const markdown = '- [ ] Task with "quotes" & ampersands';
			const html = renderMarkdown(markdown);
			
			assert.ok(html.includes('&quot;'));
			assert.ok(html.includes('&amp;'));
		});
	});

	suite('Task Counting', () => {
		test('should count simple tasks', () => {
			const markdown = `- [ ] Task 1
- [x] Task 2
- [ ] Task 3`;
			
			const stats = getTaskListCount(markdown);
			assert.strictEqual(stats.total, 3);
			assert.strictEqual(stats.completed, 1);
		});

		test('should handle different list markers', () => {
			const markdown = `- [ ] Dash task
* [x] Asterisk task
+ [ ] Plus task`;
			
			const stats = getTaskListCount(markdown);
			assert.strictEqual(stats.total, 3);
			assert.strictEqual(stats.completed, 1);
		});

		test('should ignore non-checkbox list items', () => {
			const markdown = `- Regular list item
- [ ] Checkbox task
- Another regular item
- [x] Another checkbox`;
			
			const stats = getTaskListCount(markdown);
			assert.strictEqual(stats.total, 2);
			assert.strictEqual(stats.completed, 1);
		});

		test('should handle empty input', () => {
			const stats = getTaskListCount('');
			assert.strictEqual(stats.total, 0);
			assert.strictEqual(stats.completed, 0);
		});

		test('should handle no checkboxes', () => {
			const markdown = `# Header
Some text
- Regular list
- Another item`;
			
			const stats = getTaskListCount(markdown);
			assert.strictEqual(stats.total, 0);
			assert.strictEqual(stats.completed, 0);
		});

		test('should count indented checkboxes', () => {
			const markdown = `- [x] Parent task
  - [ ] Child task 1
  - [x] Child task 2
    - [ ] Grandchild task`;
			
			const stats = getTaskListCount(markdown);
			assert.strictEqual(stats.total, 4);
			assert.strictEqual(stats.completed, 2);
		});

		test('should handle malformed checkboxes', () => {
			const markdown = `- [x] Valid checkbox
- [ ] Valid unchecked
- [x ] Space after x
- [ x] Space before x
- [] No space
- [xx] Double x`;
			
			const stats = getTaskListCount(markdown);
			// Should only count the first two valid ones
			assert.strictEqual(stats.total, 2);
			assert.strictEqual(stats.completed, 1);
		});
	});

	suite('Error Handling', () => {
		test('should handle null input gracefully', () => {
			assert.doesNotThrow(() => {
				renderMarkdown('');
				getTaskListCount('');
			});
		});

		test('should handle very long lines', () => {
			const longTaskText = 'Very long task text that goes on and on and on '.repeat(100);
			const markdown = `- [ ] ${longTaskText}`;
			
			assert.doesNotThrow(() => {
				const html = renderMarkdown(markdown);
				const stats = getTaskListCount(markdown);
				assert.strictEqual(stats.total, 1);
			});
		});

		test('should handle Unicode characters', () => {
			const markdown = '- [ ] 🚀 Task with emoji and ünicöde';
			
			assert.doesNotThrow(() => {
				const html = renderMarkdown(markdown);
				const stats = getTaskListCount(markdown);
				assert.strictEqual(stats.total, 1);
				assert.ok(html.includes('🚀'));
			});
		});
	});
});

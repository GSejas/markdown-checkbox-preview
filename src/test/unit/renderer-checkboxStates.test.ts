/**
 * Unit tests for extractCheckboxStates() function
 * Tests the extraction of checkbox states from markdown text
 */

import * as assert from 'assert';
import { extractCheckboxStates } from '../../renderer';

suite('extractCheckboxStates Tests', () => {
  test('should extract unchecked checkbox states', () => {
    const markdown = `# Todo List
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 3);
    assert.deepStrictEqual(states[0], { line: 1, checked: false });
    assert.deepStrictEqual(states[1], { line: 2, checked: false });
    assert.deepStrictEqual(states[2], { line: 3, checked: false });
  });

  test('should extract checked checkbox states', () => {
    const markdown = `# Completed Tasks
- [x] Task 1
- [X] Task 2
- [x] Task 3`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 3);
    assert.deepStrictEqual(states[0], { line: 1, checked: true });
    assert.deepStrictEqual(states[1], { line: 2, checked: true });
    assert.deepStrictEqual(states[2], { line: 3, checked: true });
  });

  test('should extract mixed checkbox states', () => {
    const markdown = `# Mixed List
- [x] Completed task
- [ ] Pending task
- [X] Another completed
- [ ] Another pending`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 4);
    assert.deepStrictEqual(states[0], { line: 1, checked: true });
    assert.deepStrictEqual(states[1], { line: 2, checked: false });
    assert.deepStrictEqual(states[2], { line: 3, checked: true });
    assert.deepStrictEqual(states[3], { line: 4, checked: false });
  });

  test('should handle different bullet types', () => {
    const markdown = `# Different Bullets
- [ ] Hyphen bullet
* [ ] Asterisk bullet
+ [ ] Plus bullet`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 3);
    assert.deepStrictEqual(states[0], { line: 1, checked: false });
    assert.deepStrictEqual(states[1], { line: 2, checked: false });
    assert.deepStrictEqual(states[2], { line: 3, checked: false });
  });

  test('should ignore regular list items', () => {
    const markdown = `# Mixed Content
- Regular item
- [ ] Checkbox item
- Another regular item
- [x] Completed checkbox`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 2);
    assert.deepStrictEqual(states[0], { line: 2, checked: false });
    assert.deepStrictEqual(states[1], { line: 4, checked: true });
  });

  test('should handle nested checkboxes', () => {
    const markdown = `# Nested List
- [ ] Parent task
  - [ ] Nested child 1
  - [x] Nested child 2
- [x] Another parent`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 4);
    assert.deepStrictEqual(states[0], { line: 1, checked: false });
    assert.deepStrictEqual(states[1], { line: 2, checked: false });
    assert.deepStrictEqual(states[2], { line: 3, checked: true });
    assert.deepStrictEqual(states[3], { line: 4, checked: true });
  });

  test('should handle empty document', () => {
    const markdown = '';

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 0);
  });

  test('should handle document with no checkboxes', () => {
    const markdown = `# Title
Some text
- Regular item
- Another item`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 0);
  });

  test('should handle checkboxes with extra spaces', () => {
    const markdown = `# Spaces
- [  ] Extra space in empty
- [ ] Normal empty
- [x] Completed`;

    const states = extractCheckboxStates(markdown);

    // Should match checkboxes with spaces inside brackets
    assert.strictEqual(states.length, 2);
    assert.deepStrictEqual(states[0], { line: 2, checked: false });
    assert.deepStrictEqual(states[1], { line: 3, checked: true });
  });

  test('should be case-insensitive for X', () => {
    const markdown = `# Case Test
- [x] Lowercase x
- [X] Uppercase X`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 2);
    assert.deepStrictEqual(states[0], { line: 1, checked: true });
    assert.deepStrictEqual(states[1], { line: 2, checked: true });
  });

  test('should preserve line numbers correctly', () => {
    const markdown = `Line 0: Title

Line 2: Empty line above
- [ ] Line 3: First checkbox
Line 4: Regular text
- [x] Line 5: Second checkbox

Line 7: Empty line above
- [ ] Line 8: Third checkbox`;

    const states = extractCheckboxStates(markdown);

    assert.strictEqual(states.length, 3);
    assert.deepStrictEqual(states[0], { line: 3, checked: false });
    assert.deepStrictEqual(states[1], { line: 5, checked: true });
    assert.deepStrictEqual(states[2], { line: 8, checked: false });
  });

  test('should handle large documents efficiently', () => {
    // Generate a large document with 1000 checkboxes
    const lines = ['# Large Document'];
    for (let i = 0; i < 1000; i++) {
      const checked = i % 3 === 0 ? 'x' : ' ';
      lines.push(`- [${checked}] Task ${i + 1}`);
    }
    const markdown = lines.join('\n');

    const startTime = performance.now();
    const states = extractCheckboxStates(markdown);
    const endTime = performance.now();

    assert.strictEqual(states.length, 1000);
    assert.ok(endTime - startTime < 100, `Performance test failed: took ${endTime - startTime}ms, expected < 100ms`);
    
    // Verify some samples
    assert.deepStrictEqual(states[0], { line: 1, checked: true }); // i=0, 0%3===0
    assert.deepStrictEqual(states[1], { line: 2, checked: false }); // i=1, 1%3!==0
    assert.deepStrictEqual(states[2], { line: 3, checked: false }); // i=2, 2%3!==0
    assert.deepStrictEqual(states[3], { line: 4, checked: true }); // i=3, 3%3===0
  });
});

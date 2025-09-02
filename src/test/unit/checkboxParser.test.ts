/**
 * Unit tests for checkbox parsing logic
 * Testing isolated functions without VS Code API dependencies
 */

import * as assert from 'assert';

// Mock VS Code types for unit testing
interface MockTextDocument {
  getText(): string;
}

interface CheckboxItem {
  content: string;
  range: any;
  checked: boolean;
  lineNumber: number;
}

// Extracted parsing logic for unit testing
function findCheckboxItems(document: MockTextDocument): CheckboxItem[] {
  const items: CheckboxItem[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const checkboxMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+\[([ xX])\]\s*(.*)$/);

    if (checkboxMatch) {
      const [, indent, marker, checkState, content] = checkboxMatch;
      const checked = checkState.toLowerCase() === 'x';

      const range = {
        start: { line: i, character: 0 },
        end: { line: i, character: line.length }
      };

      items.push({
        content: content.trim(),
        range,
        checked,
        lineNumber: i
      });
    }
  }

  return items;
}

suite('Checkbox Parsing Unit Tests', () => {
  test('should parse simple unchecked checkbox', () => {
    const mockDoc = { getText: () => '- [ ] Simple task' };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].content, 'Simple task');
    assert.strictEqual(items[0].checked, false);
    assert.strictEqual(items[0].lineNumber, 0);
  });

  test('should parse simple checked checkbox', () => {
    const mockDoc = { getText: () => '- [x] Completed task' };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].content, 'Completed task');
    assert.strictEqual(items[0].checked, true);
  });

  test('should handle uppercase X', () => {
    const mockDoc = { getText: () => '- [X] Uppercase completed' };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items[0].checked, true);
  });

  test('should parse multiple checkboxes', () => {
    const mockDoc = {
      getText: () => `- [ ] First task
- [x] Second task
- [ ] Third task`
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].checked, false);
    assert.strictEqual(items[1].checked, true);
    assert.strictEqual(items[2].checked, false);
  });

  test('should parse numbered list checkboxes', () => {
    const mockDoc = {
      getText: () => `1. [ ] Numbered task
2. [x] Another numbered`
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].content, 'Numbered task');
    assert.strictEqual(items[1].content, 'Another numbered');
  });

  test('should parse different bullet markers', () => {
    const mockDoc = {
      getText: () => `- [ ] Dash marker
* [x] Asterisk marker
+ [ ] Plus marker`
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].content, 'Dash marker');
    assert.strictEqual(items[1].content, 'Asterisk marker');
    assert.strictEqual(items[2].content, 'Plus marker');
  });

  test('should handle nested checkboxes', () => {
    const mockDoc = {
      getText: () => `- [ ] Parent task
  - [x] Child task
    - [ ] Grandchild task`
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].lineNumber, 0);
    assert.strictEqual(items[1].lineNumber, 1);
    assert.strictEqual(items[2].lineNumber, 2);
  });

  test('should handle checkboxes with rich content', () => {
    const mockDoc = {
      getText: () => `- [ ] Task with **bold** and *italic* text
- [x] Task with [link](url) and \`code\``
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].content, 'Task with **bold** and *italic* text');
    assert.strictEqual(items[1].content, 'Task with [link](url) and `code`');
  });

  test('should handle empty content', () => {
    const mockDoc = { getText: () => '- [ ] ' };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].content, '');
  });

  test('should ignore regular list items', () => {
    const mockDoc = {
      getText: () => `- [ ] Checkbox item
- Regular list item
- Another regular item
- [x] Another checkbox`
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].content, 'Checkbox item');
    assert.strictEqual(items[1].content, 'Another checkbox');
  });

  test('should handle malformed checkboxes', () => {
    const mockDoc = {
      getText: () => `- [ ] Valid checkbox
- [invalid] Malformed
- [ ] Another valid
- [] Missing space
- [ ]  Valid with extra space`
    };
    const items = findCheckboxItems(mockDoc);

    // Should find valid checkboxes (including the one with extra space)
    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].content, 'Valid checkbox');
    assert.strictEqual(items[1].content, 'Another valid');
    assert.strictEqual(items[2].content, 'Valid with extra space');
  });

  test('should handle very long content', () => {
    const longContent = 'A'.repeat(1000);
    const mockDoc = { getText: () => `- [ ] ${longContent}` };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].content, longContent);
  });

  test('should handle Unicode characters', () => {
    const mockDoc = {
      getText: () => `- [ ] Task with émojis 🎉 and spëcial chärs
- [x] Unicode: α β γ δ ε`
    };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 2);
    assert.ok(items[0].content.includes('émojis'));
    assert.ok(items[1].content.includes('Unicode'));
  });

  test('should handle empty document', () => {
    const mockDoc = { getText: () => '' };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 0);
  });

  test('should handle document with only whitespace', () => {
    const mockDoc = { getText: () => '   \n  \n   ' };
    const items = findCheckboxItems(mockDoc);

    assert.strictEqual(items.length, 0);
  });
});

/**
 * Unit tests for CheckboxCodeLensProvider
 * Tests fenced code block skipping and various checkbox detection patterns
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CheckboxCodeLensProvider } from '../../providers/checkboxCodeLensProvider';

suite('CheckboxCodeLensProvider Tests', () => {
  let provider: CheckboxCodeLensProvider;
  let mockContext: vscode.ExtensionContext;

  setup(() => {
    // Create a minimal mock context
    mockContext = {
      subscriptions: [],
      extensionPath: __dirname,
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      }
    } as any;

    provider = new CheckboxCodeLensProvider(mockContext);
  });

  test('should detect simple unchecked checkbox', async () => {
    const markdown = `# Tasks\n- [ ] Task 1`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 1);
    assert.ok(lenses[0].command?.title.includes('Check'));
  });

  test('should detect simple checked checkbox', async () => {
    const markdown = `# Tasks\n- [x] Task 1`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 1);
    assert.ok(lenses[0].command?.title.includes('Uncheck'));
  });

  test('should detect uppercase X checkbox', async () => {
    const markdown = `# Tasks\n- [X] Task with uppercase X`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 1);
    assert.ok(lenses[0].command?.title.includes('Uncheck'));
  });

  test('should detect nested/indented checkboxes', async () => {
    const markdown = `# Tasks
- [ ] Parent
  - [ ] Child 1
    - [x] Grandchild`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 3);
  });

  test('should detect checkboxes in ordered lists', async () => {
    const markdown = `# Tasks
1. [ ] First task
2. [x] Second task
3. [ ] Third task`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 3);
  });

  test('should detect checkboxes with * and + bullets', async () => {
    const markdown = `# Tasks
* [ ] Task with asterisk
+ [x] Task with plus`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 2);
  });

  test('should skip fenced code blocks', async () => {
    const markdown = `# Tasks
- [ ] Real checkbox

\`\`\`mermaid
graph TD
  A[Node with brackets] --> B[Another node]
  C[ ] --> D[X]
\`\`\`

- [x] Another real checkbox`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    // Should only detect 2 real checkboxes, not the bracket tokens in Mermaid
    assert.strictEqual(lenses.length, 2);
  });

  test('should skip multiple fenced code blocks', async () => {
    const markdown = `# Tasks
- [ ] Task 1

\`\`\`javascript
const arr = [ ];
const checked = [x];
\`\`\`

- [x] Task 2

\`\`\`python
# - [ ] This looks like a checkbox but is in code
# - [x] So is this
\`\`\`

- [ ] Task 3`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 3);
  });

  test('should handle empty fenced blocks', async () => {
    const markdown = `# Tasks
- [ ] Before

\`\`\`
\`\`\`

- [x] After`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 2);
  });

  test('should ignore regular list items', async () => {
    const markdown = `# Tasks
- Regular item
- [ ] Checkbox item
- Another regular item`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 1);
  });

  test('should handle empty document', async () => {
    const markdown = '';
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 0);
  });

  test('should handle document with no checkboxes', async () => {
    const markdown = `# Title
Some text
- Regular list
- Another item`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 0);
  });

  test('should handle mixed checkbox states', async () => {
    const markdown = `# Tasks
- [x] Done
- [ ] Todo
- [X] Also done (uppercase)
- [ ] Another todo`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 4);
    
    // Check that checked items show "Uncheck" and unchecked show "Check"
    assert.ok(lenses[0].command?.title.includes('Uncheck')); // [x]
    assert.ok(lenses[1].command?.title.includes('Check')); // [ ]
    assert.ok(lenses[2].command?.title.includes('Uncheck')); // [X]
    assert.ok(lenses[3].command?.title.includes('Check')); // [ ]
  });

  test('should handle CRLF line endings', async () => {
    const markdown = `# Tasks\r\n- [ ] Task 1\r\n- [x] Task 2\r\n`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    assert.strictEqual(lenses.length, 2);
  });

  test('should skip inline code spans with brackets', async () => {
    const markdown = `# Tasks
- [ ] Task with \`[code]\` inline
- [x] Another task`;
    const doc = await createInMemoryDocument(markdown);
    
    const lenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    
    // Should detect both checkboxes (inline code doesn't interfere)
    assert.strictEqual(lenses.length, 2);
  });
});

/**
 * Helper to create an in-memory markdown document for testing
 */
async function createInMemoryDocument(content: string): Promise<vscode.TextDocument> {
  const uri = vscode.Uri.parse(`untitled:test-${Date.now()}.md`);
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: content
  });
  return doc;
}

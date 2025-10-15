/**
 * Unit tests for toggleCheckboxInDocumentUri
 * Tests WorkspaceEdit-based checkbox toggling by document URI
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { toggleCheckboxInDocumentUri } from '../../extension';

suite('toggleCheckboxInDocumentUri Tests', () => {
  test('should toggle unchecked to checked', async () => {
    const content = `# Tasks\n- [ ] Task 1\n- [ ] Task 2`;
    const doc = await createInMemoryDocument(content);
    
    // Toggle line 1 (zero-indexed)
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, true);
    
    // Re-read document to verify change
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(1).text;
    
    assert.ok(updatedLine.includes('[x]'), `Expected [x] but got: ${updatedLine}`);
  });

  test('should toggle checked to unchecked', async () => {
    const content = `# Tasks\n- [x] Completed task\n- [ ] Todo`;
    const doc = await createInMemoryDocument(content);
    
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, true);
    
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(1).text;
    
    assert.ok(updatedLine.includes('[ ]'), `Expected [ ] but got: ${updatedLine}`);
  });

  test('should toggle uppercase X to unchecked', async () => {
    const content = `# Tasks\n- [X] Task with uppercase X`;
    const doc = await createInMemoryDocument(content);
    
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, true);
    
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(1).text;
    
    assert.ok(updatedLine.includes('[ ]'), `Expected [ ] but got: ${updatedLine}`);
  });

  test('should return false for line without checkbox', async () => {
    const content = `# Tasks\n- Regular list item\n- [ ] Actual checkbox`;
    const doc = await createInMemoryDocument(content);
    
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, false);
    
    // Verify document unchanged
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const line = updatedDoc.lineAt(1).text;
    
    assert.strictEqual(line, '- Regular list item');
  });

  test('should handle nested checkboxes', async () => {
    const content = `# Tasks
- [x] Parent
  - [ ] Child
    - [ ] Grandchild`;
    const doc = await createInMemoryDocument(content);
    
    // Toggle line 2 (child)
    const success = await toggleCheckboxInDocumentUri(doc.uri, 2);
    
    assert.strictEqual(success, true);
    
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(2).text;
    
    assert.ok(updatedLine.includes('[x]'), `Expected child to be checked: ${updatedLine}`);
  });

  test('should handle ordered list checkboxes', async () => {
    const content = `# Tasks
1. [ ] First task
2. [ ] Second task`;
    const doc = await createInMemoryDocument(content);
    
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, true);
    
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(1).text;
    
    assert.ok(updatedLine.includes('[x]'), `Expected [x] in ordered list: ${updatedLine}`);
  });

  test('should preserve surrounding text when toggling', async () => {
    const content = `# Tasks\n- [ ] Task with extra content (important)`;
    const doc = await createInMemoryDocument(content);
    
    await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(1).text;
    
    assert.ok(updatedLine.includes('[x]'));
    assert.ok(updatedLine.includes('Task with extra content (important)'));
  });

  test('should handle multiple toggles on same line', async () => {
    const content = `# Tasks\n- [ ] Task`;
    const doc = await createInMemoryDocument(content);
    
    // Toggle once: [ ] -> [x]
    await toggleCheckboxInDocumentUri(doc.uri, 1);
    let updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    let line = updatedDoc.lineAt(1).text;
    assert.ok(line.includes('[x]'), 'First toggle failed');
    
    // Toggle again: [x] -> [ ]
    await toggleCheckboxInDocumentUri(doc.uri, 1);
    updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    line = updatedDoc.lineAt(1).text;
    assert.ok(line.includes('[ ]'), 'Second toggle failed');
    
    // Toggle third time: [ ] -> [x]
    await toggleCheckboxInDocumentUri(doc.uri, 1);
    updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    line = updatedDoc.lineAt(1).text;
    assert.ok(line.includes('[x]'), 'Third toggle failed');
  });

  test('should handle empty lines gracefully', async () => {
    const content = `# Tasks\n\n- [ ] Task after blank line`;
    const doc = await createInMemoryDocument(content);
    
    // Try to toggle blank line (line 1)
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, false);
  });

  test('should work with CRLF line endings', async () => {
    const content = `# Tasks\r\n- [ ] Task 1\r\n- [x] Task 2`;
    const doc = await createInMemoryDocument(content);
    
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    
    assert.strictEqual(success, true);
    
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedLine = updatedDoc.lineAt(1).text;
    
    assert.ok(updatedLine.includes('[x]'));
  });

  test('should return false for invalid line number', async () => {
    const content = `# Tasks\n- [ ] Only one task`;
    const doc = await createInMemoryDocument(content);
    
    // Try to toggle line 99 (doesn't exist)
    const success = await toggleCheckboxInDocumentUri(doc.uri, 99);
    
    assert.strictEqual(success, false);
  });
});

/**
 * Helper to create an in-memory markdown document for testing
 */
async function createInMemoryDocument(content: string): Promise<vscode.TextDocument> {
  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: content
  });
  return doc;
}

/**
 * Integration test for webview checkbox toggle flow
 * Tests the end-to-end flow: checkbox click → WorkspaceEdit → state sync
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { extractCheckboxStates } from '../../renderer';
import { toggleCheckboxInDocumentUri } from '../../extension';

suite('Webview Toggle Integration Tests', () => {
  test('complete flow: toggle → edit → extract states', async () => {
    const initialContent = `# My Tasks
- [ ] Task 1
- [x] Task 2
- [ ] Task 3`;

    // Create document
    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: initialContent
    });

    // 1. Extract initial states
    const initialStates = extractCheckboxStates(doc.getText());
    assert.strictEqual(initialStates.length, 3);
    assert.strictEqual(initialStates[0].checked, false); // Task 1
    assert.strictEqual(initialStates[1].checked, true);  // Task 2
    assert.strictEqual(initialStates[2].checked, false); // Task 3

    // 2. Simulate webview toggle message for line 1 (Task 1: [ ] -> [x])
    const success = await toggleCheckboxInDocumentUri(doc.uri, 1);
    assert.strictEqual(success, true, 'Toggle should succeed');

    // 3. Re-read document and extract updated states
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const updatedStates = extractCheckboxStates(updatedDoc.getText());

    // Verify state changed
    assert.strictEqual(updatedStates.length, 3);
    assert.strictEqual(updatedStates[0].checked, true, 'Task 1 should now be checked');
    assert.strictEqual(updatedStates[1].checked, true, 'Task 2 should remain checked');
    assert.strictEqual(updatedStates[2].checked, false, 'Task 3 should remain unchecked');
  });

  test('rapid toggles simulate user clicking quickly', async () => {
    const content = `# Tasks
- [ ] Rapid toggle task`;

    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: content
    });

    

    // Simulate rapid clicking (toggle 5 times)
    for (let i = 0; i < 5; i++) {
      await toggleCheckboxInDocumentUri(doc.uri, 1);
      
      // Small delay to simulate realistic user interaction
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // After 5 toggles, should end up checked (started unchecked)
    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const line = updatedDoc.lineAt(1).text;
    
    assert.ok(line.includes('[x]'), `After 5 toggles, checkbox should be checked: ${line}`);
  });

  test('multiple documents toggled concurrently', async () => {
    

    // Create multiple documents
    const doc1 = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: '# Doc 1\n- [ ] Task A'
    });

    const doc2 = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: '# Doc 2\n- [ ] Task B'
    });

    const doc3 = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: '# Doc 3\n- [ ] Task C'
    });

    // Toggle all concurrently
    await Promise.all([
      toggleCheckboxInDocumentUri(doc1.uri, 1),
      toggleCheckboxInDocumentUri(doc2.uri, 1),
      toggleCheckboxInDocumentUri(doc3.uri, 1)
    ]);

    // Verify all were toggled
    const updated1 = await vscode.workspace.openTextDocument(doc1.uri);
    const updated2 = await vscode.workspace.openTextDocument(doc2.uri);
    const updated3 = await vscode.workspace.openTextDocument(doc3.uri);

    assert.ok(updated1.lineAt(1).text.includes('[x]'), 'Doc 1 should be checked');
    assert.ok(updated2.lineAt(1).text.includes('[x]'), 'Doc 2 should be checked');
    assert.ok(updated3.lineAt(1).text.includes('[x]'), 'Doc 3 should be checked');
  });

  test('toggle with nested tasks updates correctly', async () => {
    const content = `# Project
- [ ] Parent task
  - [ ] Child task 1
  - [ ] Child task 2
    - [ ] Grandchild task`;

    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: content
    });

    

    // Toggle parent, child, and grandchild
    await toggleCheckboxInDocumentUri(doc.uri, 1); // Parent
    await toggleCheckboxInDocumentUri(doc.uri, 2); // Child 1
    await toggleCheckboxInDocumentUri(doc.uri, 4); // Grandchild

    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const states = extractCheckboxStates(updatedDoc.getText());

    assert.strictEqual(states.length, 4);
    assert.strictEqual(states[0].checked, true, 'Parent should be checked');
    assert.strictEqual(states[1].checked, true, 'Child 1 should be checked');
    assert.strictEqual(states[2].checked, false, 'Child 2 should remain unchecked');
    assert.strictEqual(states[3].checked, true, 'Grandchild should be checked');
  });

  test('state extraction matches document after toggle', async () => {
    const content = `# Tasks
- [ ] Task 1
- [ ] Task 2
- [x] Task 3`;

    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: content
    });

    

    // Toggle task 2
    await toggleCheckboxInDocumentUri(doc.uri, 2);

    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const states = extractCheckboxStates(updatedDoc.getText());

    // Verify extractCheckboxStates sees the updated state
    assert.strictEqual(states[1].line, 2);
    assert.strictEqual(states[1].checked, true, 'Task 2 should be checked after toggle');
  });

  test('preserves content around checkbox during toggle', async () => {
    const content = `# Important Tasks
- [ ] **Bold task** with *italic* and \`code\`
- [x] Task with [link](https://example.com)
- [ ] Task with emoji 🚀`;

    const doc = await vscode.workspace.openTextDocument({
      language: 'markdown',
      content: content
    });

    

    // Toggle all tasks
    await toggleCheckboxInDocumentUri(doc.uri, 1);
    await toggleCheckboxInDocumentUri(doc.uri, 2);
    await toggleCheckboxInDocumentUri(doc.uri, 3);

    const updatedDoc = await vscode.workspace.openTextDocument(doc.uri);
    const text = updatedDoc.getText();

    // Verify content preserved
    assert.ok(text.includes('**Bold task**'), 'Bold formatting preserved');
    assert.ok(text.includes('*italic*'), 'Italic formatting preserved');
    assert.ok(text.includes('`code`'), 'Code formatting preserved');
    assert.ok(text.includes('[link](https://example.com)'), 'Link preserved');
    assert.ok(text.includes('🚀'), 'Emoji preserved');

    // Verify all checkboxes toggled correctly
    const states = extractCheckboxStates(text);
    assert.strictEqual(states[0].checked, true);
    assert.strictEqual(states[1].checked, false); // Was checked, now unchecked
    assert.strictEqual(states[2].checked, true);
  });
});

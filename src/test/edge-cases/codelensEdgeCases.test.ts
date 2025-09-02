/**
 * Edge case tests for CodeLens and Hover providers
 * Testing unusual scenarios and error conditions
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CheckboxCodeLensProvider } from '../../providers/checkboxCodeLensProvider';
import { CheckboxHoverProvider } from '../../providers/checkboxHoverProvider';

suite('CodeLens Edge Case Tests', () => {
  let provider: CheckboxCodeLensProvider;

  suiteSetup(async () => {
    // Create provider instance with mock context
    provider = new CheckboxCodeLensProvider(vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')?.exports?.context || {} as any);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  test('should handle empty markdown file', async function() {
    this.timeout(10000); // Allow more time for test setup

    const emptyDoc = await vscode.workspace.openTextDocument({
      content: '',
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(emptyDoc, new vscode.CancellationTokenSource().token);

    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 0, 'Should return empty array for empty file');
  });

  test('should handle markdown file with only headers', async function() {
    this.timeout(10000); // Allow more time for test setup

    const headersOnlyDoc = await vscode.workspace.openTextDocument({
      content: `# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
###### Header 6`,
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(headersOnlyDoc, new vscode.CancellationTokenSource().token);

    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 0, 'Should return empty array for headers-only file');
  });

  test('should handle malformed checkbox syntax', async function() {
    this.timeout(10000); // Allow more time for test setup

    const malformedDoc = await vscode.workspace.openTextDocument({
      content: `# Malformed Checkboxes

- [ ] Valid checkbox
- [invalid] Missing space before bracket
- [] Missing space after bracket
- [ ]  Extra space in brackets
- [ x ] Spaces around x
- [ ] Valid checkbox again
- [X] Valid uppercase
- [x] Valid lowercase`,
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(malformedDoc, new vscode.CancellationTokenSource().token);

    // Should only find the valid checkboxes
    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 5, 'Should find 5 valid checkboxes');
  });

  test('should handle very long lines', async function() {
    this.timeout(10000); // Allow more time for test setup

    const longLine = '- [ ] ' + 'A'.repeat(10000); // 10KB line
    const longLineDoc = await vscode.workspace.openTextDocument({
      content: longLine,
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(longLineDoc, new vscode.CancellationTokenSource().token);

    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 1, 'Should find the checkbox despite long content');
  });

  test('should handle Unicode and special characters', async function() {
    this.timeout(10000); // Allow more time for test setup

    const unicodeDoc = await vscode.workspace.openTextDocument({
      content: `# Unicode Test

- [ ] Task with émojis 🎉🚀💻
- [x] Spëcial chärs: α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω
- [ ] Math symbols: ∑ ∏ √ ∫ ∂ ∇ ∈ ∉ ⊂ ⊃ ⊆ ⊇ ∪ ∩
- [ ] Asian characters: 你好 こんにちは 안녕하세요
- [ ] RTL text: مرحبا بالعالم`,
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(unicodeDoc, new vscode.CancellationTokenSource().token);

    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 5, 'Should handle all Unicode checkboxes');
  });

  test('should handle rapid document changes', async function() {
    this.timeout(10000); // Allow more time for test setup

    const doc = await vscode.workspace.openTextDocument({
      content: '- [ ] Initial task\n',
      language: 'markdown'
    });

    // First CodeLens request
    let codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    assert.strictEqual(codeLenses!.length, 1, 'Should find initial checkbox');

    // Modify document by appending a new line
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(doc.lineCount, 0), '- [x] New task\n');
    await vscode.workspace.applyEdit(edit);

    // Wait a bit for the document to be updated
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second CodeLens request after modification
    codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);
    assert.strictEqual(codeLenses!.length, 2, 'Should find both checkboxes after modification');
  });

  test('should handle mixed list types', async function() {
    this.timeout(10000); // Allow more time for test setup

    const mixedDoc = await vscode.workspace.openTextDocument({
      content: `# Mixed Lists

- [ ] Unordered item 1
* [x] Unordered item 2
+ [ ] Unordered item 3

1. [ ] Ordered item 1
2. [x] Ordered item 2
3. [ ] Ordered item 3

- [ ] Mixed
  1. [x] Nested ordered
  * [ ] Nested unordered
    + [ ] Deeply nested`,
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(mixedDoc, new vscode.CancellationTokenSource().token);

    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 10, 'Should find all 10 checkboxes');
  });

  test('should handle checkboxes at document boundaries', async function() {
    this.timeout(10000); // Allow more time for test setup

    const boundaryDoc = await vscode.workspace.openTextDocument({
      content: `- [ ] First line checkbox
Some content here
- [ ] Middle checkbox
More content
- [x] Last line checkbox`,
      language: 'markdown'
    });

    const codeLenses = await provider.provideCodeLenses(boundaryDoc, new vscode.CancellationTokenSource().token);

    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 3, 'Should find all checkboxes at boundaries');
  });

  test('should handle non-markdown files gracefully', async function() {
    this.timeout(10000); // Allow more time for test setup

    const jsDoc = await vscode.workspace.openTextDocument({
      content: `// JavaScript file
function test() {
  console.log("Hello");
}`,
      language: 'javascript'
    });

    const codeLenses = await provider.provideCodeLenses(jsDoc, new vscode.CancellationTokenSource().token);

    // Should return empty array for non-markdown files
    assert.ok(codeLenses, 'Should return CodeLens array');
    assert.strictEqual(codeLenses!.length, 0, 'Should return empty for non-markdown files');
  });
});

suite('Hover Provider Edge Case Tests', () => {
  let hoverProvider: CheckboxHoverProvider;

  suiteSetup(async () => {
    // Create hover provider instance with mock context
    hoverProvider = new CheckboxHoverProvider(vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')?.exports?.context || {} as any);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  test('should not provide hover for positions outside checkbox area', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '- [ ] Test checkbox with extra content',
      language: 'markdown'
    });

    // Test hover at different positions
    const positions = [
      new vscode.Position(0, 0),  // Before checkbox
      new vscode.Position(0, 15), // After checkbox content
      new vscode.Position(0, 25), // End of line
    ];

    for (const position of positions) {
      const hover = await hoverProvider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

      // Should not provide hover outside checkbox area
      assert.ok(!hover, `Should not provide hover at position ${position.character}`);
    }
  });

  test('should handle rapid hover requests', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: '- [ ] Rapid hover test',
      language: 'markdown'
    });

    const position = new vscode.Position(0, 3); // Inside checkbox

    // Make multiple rapid hover requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(hoverProvider.provideHover(doc, position, new vscode.CancellationTokenSource().token));
    }

    const results = await Promise.all(promises);

    // All should return valid hover information
    results.forEach((hover, index) => {
      assert.ok(hover, `Hover request ${index} should return result`);
    });
  });

  test('should handle very long checkbox content', async () => {
    const longContent = '- [ ] ' + 'Very long content '.repeat(100);
    const doc = await vscode.workspace.openTextDocument({
      content: longContent,
      language: 'markdown'
    });

    const position = new vscode.Position(0, 3); // Inside checkbox
    const hover = await hoverProvider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

    assert.ok(hover, 'Should provide hover for long content');

    const hoverContent = hover!.contents[0] as vscode.MarkdownString;
    assert.ok(hoverContent.value.includes('Very long content'), 'Should show content in hover');
  });
});

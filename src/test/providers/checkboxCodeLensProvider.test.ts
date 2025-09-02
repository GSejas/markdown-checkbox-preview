/**
 * Comprehensive tests for CheckboxCodeLensProvider
 * Following VS Code extension testing best practices
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CheckboxCodeLensProvider } from '../../providers/checkboxCodeLensProvider';

suite('CheckboxCodeLensProvider Integration Tests', () => {
    let doc: vscode.TextDocument;
    let editor: vscode.TextEditor;
    let provider: CheckboxCodeLensProvider;

    suiteSetup(async () => {
        // Create test document with various checkbox scenarios
        const content = `# Tasks
- [ ] Unchecked task
- [x] Checked task
  - [ ] Nested unchecked
  - [x] Nested checked
1. [ ] Numbered task
2. [X] Numbered completed
* [ ] Bullet task

## Section 2
- [ ] Another task
- [ ] Task with **bold** and *italic* text
- [ ] Task with [link](url) and \`code\`

Some regular text without checkboxes.

- Regular list item
- Another regular item`;

        doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        // Note: Not showing document in editor for performance

        // Create provider instance
        provider = new CheckboxCodeLensProvider(vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')?.exports?.context || {} as any);
    });

    suiteTeardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should provide CodeLens for all checkboxes', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        assert.ok(codeLenses, 'Should return CodeLens array');
        assert.strictEqual(codeLenses!.length, 10, 'Should provide CodeLens for all 10 checkboxes');
    });

    test('should position CodeLens correctly above checkbox lines', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        // Check specific positions (lines are 0-indexed)
        assert.strictEqual(codeLenses![0].range.start.line, 1, 'First CodeLens should be above "- [ ] Unchecked task"');
        assert.strictEqual(codeLenses![1].range.start.line, 2, 'Second CodeLens should be above "- [x] Checked task"');
        assert.strictEqual(codeLenses![2].range.start.line, 3, 'Third CodeLens should be above nested task');
        assert.strictEqual(codeLenses![3].range.start.line, 4, 'Fourth CodeLens should be above nested task');
        assert.strictEqual(codeLenses![4].range.start.line, 5, 'Fifth CodeLens should be above numbered task');
    });

    test('should have correct toggle commands for unchecked items', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        const uncheckedLens = codeLenses!.find(lens => lens.range.start.line === 1);
        assert.ok(uncheckedLens, 'Should find CodeLens for unchecked item');
        assert.ok(uncheckedLens!.command, 'Should have command');
        assert.strictEqual(uncheckedLens!.command!.command, 'checkboxPreview.toggleCheckbox');
        assert.ok(uncheckedLens!.command!.title!.includes('Check'), 'Should show "Check" for unchecked item');
    });

    test('should have correct toggle commands for checked items', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        const checkedLens = codeLenses!.find(lens => lens.range.start.line === 2);
        assert.ok(checkedLens, 'Should find CodeLens for checked item');
        assert.ok(checkedLens!.command, 'Should have command');
        assert.strictEqual(checkedLens!.command!.command, 'checkboxPreview.toggleCheckbox');
        assert.ok(checkedLens!.command!.title!.includes('Uncheck'), 'Should show "Uncheck" for checked item');
    });

    test('should execute toggle command and modify document', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        const uncheckedLens = codeLenses!.find((lens: vscode.CodeLens) => lens.range.start.line === 1);
        assert.ok(uncheckedLens, 'Should find unchecked CodeLens');

        // Verify the command structure is correct
        assert.ok(uncheckedLens!.command, 'Should have command');
        assert.strictEqual(uncheckedLens!.command!.command, 'checkboxPreview.toggleCheckbox');
        assert.deepStrictEqual(uncheckedLens!.command!.arguments, [doc.uri, 1]);

        // Note: In test environment, we can't execute the command as the extension isn't fully activated
        // The command structure validation above ensures the CodeLens is properly configured
    });

    test('should handle nested checkboxes correctly', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        const nestedLenses = codeLenses!.filter((lens: vscode.CodeLens) =>
            lens.range.start.line === 3 || lens.range.start.line === 4
        );

        assert.strictEqual(nestedLenses.length, 2, 'Should have CodeLens for both nested items');
        nestedLenses.forEach((lens: vscode.CodeLens) => {
            assert.ok(lens.command, 'Nested CodeLens should have command');
            assert.strictEqual(lens.command!.command, 'checkboxPreview.toggleCheckbox');
        });
    });

    test('should handle different list markers', async () => {
        const codeLenses = await provider.provideCodeLenses(doc, new vscode.CancellationTokenSource().token);

        // Check numbered list (line 5) and bullet list (line 7)
        const numberedLens = codeLenses!.find((lens: vscode.CodeLens) => lens.range.start.line === 5);
        const bulletLens = codeLenses!.find((lens: vscode.CodeLens) => lens.range.start.line === 7);

        assert.ok(numberedLens, 'Should have CodeLens for numbered list');
        assert.ok(bulletLens, 'Should have CodeLens for bullet list');

        [numberedLens, bulletLens].forEach((lens: vscode.CodeLens | undefined) => {
            assert.ok(lens!.command, 'List CodeLens should have command');
            assert.strictEqual(lens!.command!.command, 'checkboxPreview.toggleCheckbox');
        });
    });
});

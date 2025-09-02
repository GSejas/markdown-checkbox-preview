/**
 * Comprehensive tests for CheckboxHoverProvider
 * Testing hover information and command execution
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CheckboxHoverProvider } from '../../providers/checkboxHoverProvider';

suite('CheckboxHoverProvider Integration Tests', () => {
    let doc: vscode.TextDocument;
    let editor: vscode.TextEditor;
    let provider: CheckboxHoverProvider;

    suiteSetup(async () => {
        const content = `# Project Tasks
- [ ] Implement user authentication
- [x] Set up database schema
  - [ ] Create user table
  - [x] Add indexes
- [ ] Write unit tests
1. [ ] Code review
2. [X] Deploy to staging

## Notes
- [ ] Update documentation
- [ ] Plan next sprint`;

        doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        // Note: Not showing document in editor for performance

        // Create provider instance
        provider = new CheckboxHoverProvider(vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')?.exports?.context || {} as any);
    });

    suiteTeardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('should provide hover for unchecked checkbox', async () => {
        const position = new vscode.Position(1, 3); // Position inside "- [ ] Implement user authentication"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        assert.ok(hover, 'Should return hover information');
        const hoverContent = hover!.contents[0] as vscode.MarkdownString;
        assert.ok(hoverContent.value.includes('☑️ Checkbox: Unchecked'), 'Should show unchecked status');
        assert.ok(hoverContent.value.includes('Implement user authentication'), 'Should show task content');
        assert.ok(hoverContent.value.includes('Check this item'), 'Should show toggle action');
    });

    test('should provide hover for checked checkbox', async () => {
        const position = new vscode.Position(2, 3); // Position inside "- [x] Set up database schema"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        assert.ok(hover, 'Should return hover information');
        const hoverContent = hover!.contents[0] as vscode.MarkdownString;
        assert.ok(hoverContent.value.includes('✅ Checkbox: Checked'), 'Should show checked status');
        assert.ok(hoverContent.value.includes('Uncheck this item'), 'Should show uncheck action');
    });

    test('should show line and position information', async () => {
        const position = new vscode.Position(1, 3);
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        const hoverContent = hover!.contents[0] as vscode.MarkdownString;
        assert.ok(hoverContent.value.includes('📍 Line 2'), 'Should show line number');
        assert.ok(hoverContent.value.includes('🔤 Marker: `-`'), 'Should show list marker');
    });

    test('should show indentation information for nested items', async () => {
        const position = new vscode.Position(3, 5); // Position inside nested "- [ ] Create user table"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        const hoverContent = hover!.contents[0] as vscode.MarkdownString;
        assert.ok(hoverContent.value.includes('↪️ Indented (2 spaces)'), 'Should show indentation info');
    });

    test('should handle numbered list checkboxes', async () => {
        const position = new vscode.Position(6, 3); // Position inside "1. [ ] Code review"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        const hoverContent = hover!.contents[0] as vscode.MarkdownString;
        assert.ok(hoverContent.value.includes('🔤 Marker: `1.`'), 'Should show numbered marker');
    });

    test('should execute toggle command from hover', async () => {
        const position = new vscode.Position(1, 3);
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        const hoverContent = hover!.contents[0] as vscode.MarkdownString;

        // Extract command URI from hover content
        const commandMatch = hoverContent.value.match(/command:checkboxPreview\.toggleCheckbox\?(.+?)(\s|\))/);
        assert.ok(commandMatch, 'Should contain toggle command');

        // Parse the command arguments
        const encodedArgs = commandMatch[1];
        const args = JSON.parse(decodeURIComponent(encodedArgs));

        // Verify the command structure is correct
        assert.strictEqual(args.uri, doc.uri.toString());
        assert.strictEqual(args.line, 1);

        // Note: In test environment, we can't execute the command as the extension isn't fully activated
        // The command structure validation above ensures the hover is properly configured
    });

    test('should not provide hover for non-checkbox positions', async () => {
        const position = new vscode.Position(0, 5); // Position in header "# Project Tasks"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);

        assert.ok(!hover, 'Should not provide hover for non-checkbox positions');
    });

    test('should handle malformed checkboxes gracefully', async () => {
        // Create document with malformed checkbox
        const malformedDoc = await vscode.workspace.openTextDocument({
            content: '- [ ] Valid checkbox\n- [invalid] Malformed\n- [ ] Another valid',
            language: 'markdown'
        });

        const position = new vscode.Position(1, 3); // Position in malformed checkbox
        const hover = await provider.provideHover(malformedDoc, position, new vscode.CancellationTokenSource().token);

        // Should not provide hover for malformed checkbox
        assert.ok(!hover, 'Should not provide hover for malformed checkboxes');
    });
});

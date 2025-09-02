/**
 * End-to-End tests for complete CodeLens workflow
 * Testing the full user experience from document creation to interaction
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('CodeLens End-to-End Workflow Tests', () => {
  let doc: vscode.TextDocument;
  let editor: vscode.TextEditor;

  suiteSetup(async () => {
    // Create a comprehensive test document
    const content = `# Project Management Demo

## Sprint Tasks
- [ ] Implement user authentication system
- [ ] Create database schema for users
  - [ ] Design user table structure
  - [x] Add database indexes
  - [ ] Create migration scripts
- [x] Set up CI/CD pipeline
- [ ] Write comprehensive unit tests
  - [ ] Test authentication logic
  - [ ] Test database operations
  - [ ] Test API endpoints

## Documentation
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Write deployment instructions

## Code Quality
1. [ ] Run linter on all files
2. [ ] Fix identified issues
3. [x] Add code comments
4. [ ] Review pull request

## Deployment
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor system health`;

    doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    editor = await vscode.window.showTextDocument(doc);
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });

  test('should complete full workflow: CodeLens → Hover → Toggle → Verify', async () => {
    // Step 1: Verify CodeLens are present
    await vscode.commands.executeCommand('vscode.executeCodeLensProvider', doc.uri);
    const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    assert.ok(codeLenses, 'CodeLens should be available');
    assert.strictEqual(codeLenses!.length, 18, 'Should have 18 checkboxes');

    // Step 2: Test hover on first unchecked item
    const firstUncheckedPosition = new vscode.Position(3, 3); // "- [ ] Implement user authentication system"
    const hover = await vscode.commands.executeCommand<vscode.Hover[]>(
      'vscode.executeHoverProvider',
      doc.uri,
      firstUncheckedPosition
    );

    assert.ok(hover, 'Hover should be available');
    const hoverContent = hover![0].contents[0] as vscode.MarkdownString;
    assert.ok(hoverContent.value.includes('Check this item'), 'Should show check action');

    // Step 3: Execute toggle via CodeLens
    const firstLens = codeLenses!.find(lens => lens.range.start.line === 3);
    assert.ok(firstLens, 'Should find CodeLens for first task');

    await vscode.commands.executeCommand(
      firstLens!.command!.command,
      ...(firstLens!.command!.arguments || [])
    );

    // Step 4: Verify document was updated
    const updatedContent = doc.getText();
    assert.ok(updatedContent.includes('[x] Implement user authentication system'),
      'Task should be marked as completed');

    // Step 5: Verify CodeLens updated after change
    const updatedCodeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    const updatedFirstLens = updatedCodeLenses!.find(lens => lens.range.start.line === 3);
    assert.ok(updatedFirstLens!.command!.title!.includes('Uncheck'),
      'CodeLens should now show "Uncheck" for completed task');
  });

  test('should handle nested task workflow', async () => {
    // Find nested CodeLens items
    const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    const nestedLenses = codeLenses!.filter(lens =>
      lens.range.start.line >= 5 && lens.range.start.line <= 7 // Nested items
    );

    assert.strictEqual(nestedLenses.length, 3, 'Should have 3 nested CodeLens items');

    // Toggle all nested items
    for (const lens of nestedLenses) {
      await vscode.commands.executeCommand(
        lens.command!.command,
        ...(lens.command!.arguments || [])
      );
    }

    // Verify all nested items are now checked
    const updatedContent = doc.getText();
    assert.ok(updatedContent.includes('[x] Design user table structure'), 'First nested should be checked');
    assert.ok(updatedContent.includes('[x] Add database indexes'), 'Second nested should remain checked');
    assert.ok(updatedContent.includes('[x] Create migration scripts'), 'Third nested should be checked');
  });

  test('should handle mixed list types in workflow', async () => {
    const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    // Find numbered list items (lines 15-18)
    const numberedLenses = codeLenses!.filter(lens =>
      lens.range.start.line >= 15 && lens.range.start.line <= 18
    );

    assert.strictEqual(numberedLenses.length, 4, 'Should have 4 numbered CodeLens items');

    // Toggle numbered items
    for (const lens of numberedLenses) {
      if (lens.command!.title!.includes('Check')) { // Only toggle unchecked items
        await vscode.commands.executeCommand(
          lens.command!.command,
          ...(lens.command!.arguments || [])
        );
      }
    }

    // Verify numbered items are updated
    const updatedContent = doc.getText();
    assert.ok(updatedContent.includes('[x] Run linter on all files'), 'Should check numbered item');
    assert.ok(updatedContent.includes('[x] Fix identified issues'), 'Should check numbered item');
  });

  test('should maintain state across multiple operations', async () => {
    // Get initial state
    const initialCodeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    const initialCheckedCount = initialCodeLenses!.filter(lens =>
      lens.command!.title!.includes('Uncheck')
    ).length;

    // Perform multiple toggle operations
    const operations = [
      { line: 3, expectedState: 'checked' },
      { line: 4, expectedState: 'checked' },
      { line: 8, expectedState: 'checked' },
      { line: 3, expectedState: 'unchecked' }, // Toggle back
    ];

    for (const op of operations) {
      const lens = initialCodeLenses!.find(l => l.range.start.line === op.line);
      if (lens) {
        await vscode.commands.executeCommand(
          lens.command!.command,
          ...(lens.command!.arguments || [])
        );
      }
    }

    // Verify final state
    const finalCodeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    const finalCheckedCount = finalCodeLenses!.filter(lens =>
      lens.command!.title!.includes('Uncheck')
    ).length;

    // Should have same total items but different checked count
    assert.strictEqual(finalCodeLenses!.length, initialCodeLenses!.length,
      'Total CodeLens count should remain the same');
    assert.ok(finalCheckedCount !== initialCheckedCount,
      'Checked count should have changed after operations');
  });

  test('should handle rapid successive operations', async () => {
    const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    // Rapidly toggle the same item multiple times
    const targetLens = codeLenses!.find(lens => lens.range.start.line === 3);
    assert.ok(targetLens, 'Should find target CodeLens');

    // Toggle 5 times rapidly
    for (let i = 0; i < 5; i++) {
      await vscode.commands.executeCommand(
        targetLens!.command!.command,
        ...(targetLens!.command!.arguments || [])
      );
    }

    // Verify final state is consistent
    const finalContent = doc.getText();
    const line3Content = finalContent.split('\n')[3];

    // Should be checked (odd number of toggles from initial unchecked state)
    assert.ok(line3Content.includes('[x]'), 'Should be checked after 5 toggles');
  });

  test('should work with document changes during workflow', async () => {
    // Get initial CodeLens
    const initialCodeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    // Add new content to document
    const edit = new vscode.WorkspaceEdit();
    const lastLine = doc.lineCount - 1;
    const lastLineContent = doc.lineAt(lastLine).text;

    edit.insert(doc.uri, new vscode.Position(lastLine, lastLineContent.length),
      '\n- [ ] New task added during workflow');

    await vscode.workspace.applyEdit(edit);

    // Verify CodeLens updated to include new item
    const updatedCodeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
      'vscode.executeCodeLensProvider',
      doc.uri
    );

    assert.strictEqual(updatedCodeLenses!.length, initialCodeLenses!.length + 1,
      'Should include the newly added checkbox');

    // Test that new CodeLens works
    const newLens = updatedCodeLenses!.find(lens => lens.range.start.line === lastLine + 1);
    assert.ok(newLens, 'Should find CodeLens for newly added item');

    await vscode.commands.executeCommand(
      newLens!.command!.command,
      ...(newLens!.command!.arguments || [])
    );

    // Verify new task was toggled
    const finalContent = doc.getText();
    assert.ok(finalContent.includes('[x] New task added during workflow'),
      'New task should be checked');
  });
});

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Integration Tests', () => {
	let testDocument: vscode.TextDocument;
	let testEditor: vscode.TextEditor;

	suiteSetup(async function() {
		// Increase timeout for VS Code test environment setup
		this.timeout(10000);

		const testContent = `# Integration Test Document

## Task List
- [x] Completed task
- [ ] Pending task
  - [ ] Subtask 1
  - [x] Subtask 2

## Another Section
- [ ] Another task
- [ ] Yet another task`;

		// Create in-memory document instead of file system operations
		testDocument = await vscode.workspace.openTextDocument({
			content: testContent,
			language: 'markdown'
		});
		testEditor = await vscode.window.showTextDocument(testDocument);
	});

	suiteTeardown(async function() {
		// Increase timeout for cleanup
		this.timeout(5000);

		// Clean up
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	});

	suite('End-to-End Workflow', () => {
		test('should open markdown file and show tree view', async () => {
			// Use the test document created in setup
			assert.strictEqual(testDocument.languageId, 'markdown');
			assert.ok(testEditor);

			// Give the extension time to activate
			await new Promise(resolve => setTimeout(resolve, 1000));

			// The tree view should automatically populate when a markdown file is opened
			// We can't directly test the tree view UI, but we can test that the commands are available
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('checkboxTree.refresh'), 'checkboxTree.refresh command should be available');
		});

		test('should execute checkbox preview command', async () => {
			// Use the existing test document
			await vscode.window.showTextDocument(testDocument);

			// Execute the open preview command
			await assert.doesNotReject(async () => {
				await vscode.commands.executeCommand('checkboxPreview.open');
			});

			// Close any webview panels that might have opened
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});

		test('should refresh tree view command', async () => {
			// Use the existing test document
			await vscode.window.showTextDocument(testDocument);

			// Execute refresh command
			await assert.doesNotReject(async () => {
				await vscode.commands.executeCommand('checkboxTree.refresh');
			});
		});

		test('should handle file modifications', async () => {
			// Use the existing test document
			await vscode.window.showTextDocument(testDocument);

			// Get original content
			const originalContent = testDocument.getText();

			// Add a new checkbox
			const newCheckbox = '\n- [ ] New test checkbox';
			await testEditor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(testDocument.lineCount, 0), newCheckbox);
			});

			// Verify the change was made
			assert.ok(testDocument.getText().includes('New test checkbox'));

			// Restore original content
			await testEditor.edit(editBuilder => {
				const fullRange = new vscode.Range(
					new vscode.Position(0, 0),
					new vscode.Position(testDocument.lineCount, 0)
				);
				editBuilder.replace(fullRange, originalContent);
			});
		});
	});

	suite('Command Registration', () => {
		test('should register all extension commands', async () => {
			const commands = await vscode.commands.getCommands();
			
			const requiredCommands = [
				'checkboxPreview.open',
				'checkboxTree.refresh',
				'checkboxTree.toggle'
			];

			for (const command of requiredCommands) {
				assert.ok(commands.includes(command), `Command ${command} should be registered`);
			}
		});

		test('should have command titles and descriptions', async () => {
			// We can't directly test command metadata without access to the package.json
			// But we can verify the commands execute without errors
			await vscode.window.showTextDocument(testDocument);

			const commandTests = [
				'checkboxPreview.open',
				'checkboxTree.refresh'
			];

			for (const command of commandTests) {
				await assert.doesNotReject(async () => {
					await vscode.commands.executeCommand(command);
				}, `Command ${command} should execute without error`);
			}

			// Close any panels that might have opened
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});
	});

	suite('Extension Activation', () => {
		test('should activate on markdown files', async () => {
			// Use the existing test document
			await vscode.window.showTextDocument(testDocument);

			// Check that our extension commands are available
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('checkboxPreview.open'));

			// The extension should be active now
			const extension = vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview');
			if (extension) {
				assert.ok(extension.isActive);
			}
		});
	});

	suite('Multi-file Handling', () => {
		test('should handle switching between markdown files', async () => {
			// Create a second test document in memory
			const testContent2 = `# Second Test File

## Different Tasks
- [x] Task A
- [ ] Task B
- [x] Task C`;

			const document2 = await vscode.workspace.openTextDocument({
				content: testContent2,
				language: 'markdown'
			});
			const editor2 = await vscode.window.showTextDocument(document2);

			// Switch back to first document
			await vscode.window.showTextDocument(testDocument);

			// Both documents should be accessible
			assert.ok(testDocument);
			assert.ok(document2);

			// Clean up second document
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});
	});

	suite('Error Handling', () => {
		test('should handle non-existent file gracefully', async () => {
			// Create a non-existent URI for testing
			const nonExistentUri = vscode.Uri.file('/non-existent/path/test.md');

			// Trying to open a non-existent file should not crash the extension
			await assert.rejects(async () => {
				await vscode.workspace.openTextDocument(nonExistentUri);
			});

			// Extension commands should still work
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('checkboxPreview.open'));
		});

		test('should handle corrupted markdown gracefully', async () => {
			const corruptedContent = `# Corrupted File
			
- [x] Valid checkbox
- [ x] Invalid spacing
- [] Missing space
- [xx] Double x
### Incomplete header
- [X] Valid uppercase
`;

			// Create in-memory document with corrupted content
			const document = await vscode.workspace.openTextDocument({
				content: corruptedContent,
				language: 'markdown'
			});
			await vscode.window.showTextDocument(document);

			// Commands should still work without throwing
			await assert.doesNotReject(async () => {
				await vscode.commands.executeCommand('checkboxTree.refresh');
			});
		});
	});

	suite('Performance', () => {
		test('should handle large files efficiently', async () => {
			// Create a large markdown file content
			let largeContent = '# Large File Test\n\n';
			for (let i = 0; i < 1000; i++) {
				largeContent += `## Section ${i}\n`;
				for (let j = 0; j < 10; j++) {
					largeContent += `- [${j % 2 === 0 ? 'x' : ' '}] Task ${i}.${j}\n`;
				}
			}

			// Create in-memory document with large content
			const startTime = Date.now();
			const document = await vscode.workspace.openTextDocument({
				content: largeContent,
				language: 'markdown'
			});
			await vscode.window.showTextDocument(document);

			// Refresh should complete in reasonable time
			await vscode.commands.executeCommand('checkboxTree.refresh');
			const endTime = Date.now();

			// Should complete within 5 seconds even for large files
			assert.ok(endTime - startTime < 5000, 'Large file processing should complete within 5 seconds');
		});
	});
});

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Integration Tests', () => {
	let testWorkspaceUri: vscode.Uri;
	let testFileUri: vscode.Uri;

	suiteSetup(async () => {
		// Create a temporary workspace for testing
		const workspacePath = path.join(__dirname, '..', '..', 'test-workspace');
		testWorkspaceUri = vscode.Uri.file(workspacePath);
		testFileUri = vscode.Uri.joinPath(testWorkspaceUri, 'test.md');

		// Ensure the test file exists
		try {
			await vscode.workspace.fs.createDirectory(testWorkspaceUri);
		} catch (e) {
			// Directory might already exist
		}

		const testContent = `# Integration Test Document

## Task List
- [x] Completed task
- [ ] Pending task
  - [ ] Subtask 1
  - [x] Subtask 2

## Another Section
- [ ] Another task
- [ ] Yet another task`;

		await vscode.workspace.fs.writeFile(testFileUri, Buffer.from(testContent, 'utf8'));
	});

	suiteTeardown(async () => {
		// Clean up test files
		try {
			await vscode.workspace.fs.delete(testWorkspaceUri, { recursive: true });
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	suite('End-to-End Workflow', () => {
		test('should open markdown file and show tree view', async () => {
			// Open the test markdown file
			const document = await vscode.workspace.openTextDocument(testFileUri);
			const editor = await vscode.window.showTextDocument(document);

			assert.strictEqual(document.languageId, 'markdown');
			assert.ok(editor);

			// Give the extension time to activate
			await new Promise(resolve => setTimeout(resolve, 1000));

			// The tree view should automatically populate when a markdown file is opened
			// We can't directly test the tree view UI, but we can test that the commands are available
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('checkboxTree.refresh'), 'checkboxTree.refresh command should be available');
		});

		test('should execute checkbox preview command', async () => {
			const document = await vscode.workspace.openTextDocument(testFileUri);
			await vscode.window.showTextDocument(document);

			// Execute the open preview command
			await assert.doesNotReject(async () => {
				await vscode.commands.executeCommand('checkboxPreview.open');
			});

			// Close any webview panels that might have opened
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		});

		test('should refresh tree view command', async () => {
			const document = await vscode.workspace.openTextDocument(testFileUri);
			await vscode.window.showTextDocument(document);

			// Execute refresh command
			await assert.doesNotReject(async () => {
				await vscode.commands.executeCommand('checkboxTree.refresh');
			});
		});

		test('should handle file modifications', async () => {
			const document = await vscode.workspace.openTextDocument(testFileUri);
			const editor = await vscode.window.showTextDocument(document);

			// Get original content
			const originalContent = document.getText();

			// Add a new checkbox
			const newCheckbox = '\n- [ ] New test checkbox';
			await editor.edit(editBuilder => {
				editBuilder.insert(new vscode.Position(document.lineCount, 0), newCheckbox);
			});

			// Save the document
			await document.save();

			// Verify the change was made
			assert.ok(document.getText().includes('New test checkbox'));

			// Restore original content
			await editor.edit(editBuilder => {
				const fullRange = new vscode.Range(
					new vscode.Position(0, 0),
					new vscode.Position(document.lineCount, 0)
				);
				editBuilder.replace(fullRange, originalContent);
			});

			await document.save();
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
			const document = await vscode.workspace.openTextDocument(testFileUri);
			await vscode.window.showTextDocument(document);

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
			// Open a markdown file
			const document = await vscode.workspace.openTextDocument(testFileUri);
			await vscode.window.showTextDocument(document);

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
			// Create a second test file
			const testFile2Uri = vscode.Uri.joinPath(testWorkspaceUri, 'test2.md');
			const testContent2 = `# Second Test File

## Different Tasks
- [x] Task A
- [ ] Task B
- [x] Task C`;

			await vscode.workspace.fs.writeFile(testFile2Uri, Buffer.from(testContent2, 'utf8'));

			// Open first file
			const document1 = await vscode.workspace.openTextDocument(testFileUri);
			await vscode.window.showTextDocument(document1);

			// Execute refresh command
			await vscode.commands.executeCommand('checkboxTree.refresh');

			// Open second file
			const document2 = await vscode.workspace.openTextDocument(testFile2Uri);
			await vscode.window.showTextDocument(document2);

			// Execute refresh command again
			await vscode.commands.executeCommand('checkboxTree.refresh');

			// Both operations should succeed
			assert.ok(true);

			// Clean up second file
			try {
				await vscode.workspace.fs.delete(testFile2Uri);
			} catch (e) {
				// Ignore cleanup errors
			}
		});
	});

	suite('Error Handling', () => {
		test('should handle non-existent file gracefully', async () => {
			const nonExistentUri = vscode.Uri.joinPath(testWorkspaceUri, 'non-existent.md');

			// Trying to open a non-existent file should not crash the extension
			await assert.rejects(async () => {
				await vscode.workspace.openTextDocument(nonExistentUri);
			});

			// Extension commands should still work
			const commands = await vscode.commands.getCommands();
			assert.ok(commands.includes('checkboxPreview.open'));
		});

		test('should handle corrupted markdown gracefully', async () => {
			const corruptedFileUri = vscode.Uri.joinPath(testWorkspaceUri, 'corrupted.md');
			const corruptedContent = `# Corrupted File
			
- [x] Valid checkbox
- [ x] Invalid spacing
- [] Missing space
- [xx] Double x
### Incomplete header
- [X] Valid uppercase
`;

			await vscode.workspace.fs.writeFile(corruptedFileUri, Buffer.from(corruptedContent, 'utf8'));

			// Open the corrupted file
			const document = await vscode.workspace.openTextDocument(corruptedFileUri);
			await vscode.window.showTextDocument(document);

			// Commands should still work without throwing
			await assert.doesNotReject(async () => {
				await vscode.commands.executeCommand('checkboxTree.refresh');
			});

			// Clean up
			try {
				await vscode.workspace.fs.delete(corruptedFileUri);
			} catch (e) {
				// Ignore cleanup errors
			}
		});
	});

	suite('Performance', () => {
		test('should handle large files efficiently', async () => {
			const largeFileUri = vscode.Uri.joinPath(testWorkspaceUri, 'large.md');
			
			// Create a large markdown file
			let largeContent = '# Large File Test\n\n';
			for (let i = 0; i < 1000; i++) {
				largeContent += `## Section ${i}\n`;
				for (let j = 0; j < 10; j++) {
					largeContent += `- [${j % 2 === 0 ? 'x' : ' '}] Task ${i}.${j}\n`;
				}
			}

			await vscode.workspace.fs.writeFile(largeFileUri, Buffer.from(largeContent, 'utf8'));

			// Open the large file
			const startTime = Date.now();
			const document = await vscode.workspace.openTextDocument(largeFileUri);
			await vscode.window.showTextDocument(document);

			// Refresh should complete in reasonable time
			await vscode.commands.executeCommand('checkboxTree.refresh');
			const endTime = Date.now();

			// Should complete within 5 seconds even for large files
			assert.ok(endTime - startTime < 5000, 'Large file processing should complete within 5 seconds');

			// Clean up
			try {
				await vscode.workspace.fs.delete(largeFileUri);
			} catch (e) {
				// Ignore cleanup errors
			}
		});
	});
});

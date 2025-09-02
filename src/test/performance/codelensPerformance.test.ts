/**
 * Performance tests for CodeLens providers
 * Ensuring they can handle large documents efficiently
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CheckboxCodeLensProvider } from '../../providers/checkboxCodeLensProvider';

suite('CodeLens Performance Tests', () => {
    let largeDoc: vscode.TextDocument;
    let mediumDoc: vscode.TextDocument;
    let provider: CheckboxCodeLensProvider;

    suiteSetup(async () => {
        // Create a large document with many checkboxes
        const largeContent = generateLargeMarkdown(500); // 500 checkboxes
        const mediumContent = generateLargeMarkdown(100); // 100 checkboxes

        largeDoc = await vscode.workspace.openTextDocument({
            content: largeContent,
            language: 'markdown'
        });

        mediumDoc = await vscode.workspace.openTextDocument({
            content: mediumContent,
            language: 'markdown'
        });

        // Create provider instance
        provider = new CheckboxCodeLensProvider(vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')?.exports?.context || {} as any);
    });

    suiteTeardown(async () => {
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        if (largeDoc) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });

    test('should handle large document with 500 checkboxes efficiently', async function () {
        this.timeout(5000); // Allow up to 5 seconds for large document

        const startTime = Date.now();

        const codeLenses = await provider.provideCodeLenses(largeDoc, new vscode.CancellationTokenSource().token);

        const endTime = Date.now();
        const duration = endTime - startTime;

        assert.ok(codeLenses, 'Should return CodeLens array');
        assert.strictEqual(codeLenses!.length, 500, 'Should provide CodeLens for all 500 checkboxes');

        // Performance assertion: should complete within reasonable time
        assert.ok(duration < 2000, `CodeLens generation took ${duration}ms, should be under 2000ms`);

        console.log(`Large document (500 checkboxes): ${duration}ms`);
    });

    test('should handle medium document with 100 checkboxes efficiently', async function () {
        this.timeout(2000);

        const startTime = Date.now();

        const codeLenses = await provider.provideCodeLenses(mediumDoc, new vscode.CancellationTokenSource().token);

        const endTime = Date.now();
        const duration = endTime - startTime;

        assert.ok(codeLenses, 'Should return CodeLens array');
        assert.strictEqual(codeLenses!.length, 100, 'Should provide CodeLens for all 100 checkboxes');

        // Should be very fast for medium document
        assert.ok(duration < 500, `CodeLens generation took ${duration}ms, should be under 500ms`);

        console.log(`Medium document (100 checkboxes): ${duration}ms`);
    });

    test('should handle document with no checkboxes efficiently', async () => {
        const noCheckboxDoc = await vscode.workspace.openTextDocument({
            content: generateNoCheckboxMarkdown(1000), // 1000 lines, no checkboxes
            language: 'markdown'
        });

        const startTime = Date.now();

        const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
            'vscode.executeCodeLensProvider',
            noCheckboxDoc.uri
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        assert.ok(codeLenses, 'Should return CodeLens array');
        assert.strictEqual(codeLenses!.length, 0, 'Should return empty array for no checkboxes');

        // Should be very fast for documents with no checkboxes
        assert.ok(duration < 500, `Empty result took ${duration}ms, should be under 500ms`);

        console.log(`No checkboxes document: ${duration}ms`);
    });

    test('should handle mixed content efficiently', async () => {
        const mixedContent = generateMixedMarkdown(200); // Mix of checkboxes and regular content

        const mixedDoc = await vscode.workspace.openTextDocument({
            content: mixedContent,
            language: 'markdown'
        });

        const startTime = Date.now();

        const codeLenses = await provider.provideCodeLenses(mixedDoc, new vscode.CancellationTokenSource().token);

        const endTime = Date.now();
        const duration = endTime - startTime;

        assert.ok(codeLenses, 'Should return CodeLens array');
        assert.strictEqual(codeLenses!.length, 200, 'Should provide CodeLens for all 200 checkboxes');

        // Should handle mixed content efficiently
        assert.ok(duration < 1000, `Mixed content took ${duration}ms, should be under 1000ms`);

        console.log(`Mixed content (200 checkboxes): ${duration}ms`);
    });

    test('should handle deeply nested checkboxes efficiently', async function () {
        this.timeout(10000); // Allow up to 10 seconds for deeply nested content

        const nestedContent = generateNestedMarkdown(5, 3); // 5 levels deep, 3 checkboxes each

        const nestedDoc = await vscode.workspace.openTextDocument({
            content: nestedContent,
            language: 'markdown'
        });

        const startTime = Date.now();

        const codeLenses = await provider.provideCodeLenses(nestedDoc, new vscode.CancellationTokenSource().token);

        const endTime = Date.now();
        const duration = endTime - startTime;

        assert.ok(codeLenses, 'Should return CodeLens array');
        // Should have all checkboxes regardless of nesting
        assert.ok(codeLenses!.length > 0, 'Should find nested checkboxes');

        // Should handle nesting efficiently
        assert.ok(duration < 500, `Nested content took ${duration}ms, should be under 500ms`);

        console.log(`Nested content: ${duration}ms`);
    });
});

// Helper functions for generating test content

function generateLargeMarkdown(checkboxCount: number): string {
    let content = '# Large Test Document\n\n';

    for (let i = 0; i < checkboxCount; i++) {
        const checked = i % 2 === 0 ? ' ' : 'x';
        content += `- [${checked}] Task number ${i + 1} with some additional content to make it more realistic\n`;
    }

    return content;
}

function generateNoCheckboxMarkdown(lineCount: number): string {
    let content = '# Document Without Checkboxes\n\n';

    for (let i = 0; i < lineCount; i++) {
        if (i % 10 === 0) {
            content += `## Section ${i / 10 + 1}\n\n`;
        }
        content += `This is regular content on line ${i + 1}. No checkboxes here.\n`;

        if (i % 5 === 0) {
            content += `- This is a regular list item\n`;
        }
    }

    return content;
}

function generateMixedMarkdown(checkboxCount: number): string {
    let content = '# Mixed Content Document\n\n';

    for (let i = 0; i < checkboxCount; i++) {
        // Add some regular content
        content += `## Section ${i + 1}\n\n`;
        content += `This is some regular paragraph content for section ${i + 1}.\n\n`;
        content += `Here are some details:\n`;
        content += `- Point 1\n`;
        content += `- Point 2\n`;
        content += `- Point 3\n\n`;

        // Add checkbox
        const checked = i % 3 === 0 ? 'x' : ' ';
        content += `- [${checked}] Task ${i + 1}: Complete section ${i + 1} requirements\n\n`;
    }

    return content;
}

function generateNestedMarkdown(levels: number, itemsPerLevel: number): string {
    let content = '# Deeply Nested Tasks\n\n';

    function addNestedItems(currentLevel: number, prefix: string = ''): void {
        if (currentLevel > levels) {
            return;
        }

        const indent = '  '.repeat(currentLevel - 1);

        for (let i = 0; i < itemsPerLevel; i++) {
            const checked = (currentLevel + i) % 2 === 0 ? 'x' : ' ';
            content += `${indent}- [${checked}] Level ${currentLevel} Item ${i + 1}\n`;

            if (currentLevel < levels) {
                addNestedItems(currentLevel + 1, `${indent}  `);
            }
        }
    }

    addNestedItems(1);
    return content;
}

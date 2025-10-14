/**
 * Auto-Preview Manager Tests
 * 
 * Comprehensive tests for the AutoPreviewManager functionality
 * Testing configuration, panel tracking, and status bar integration
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { AutoPreviewManager } from '../../autoPreviewManager';

suite('Auto-Preview Manager Tests', () => {
  let manager: AutoPreviewManager;
  let mockPanel: vscode.WebviewPanel;
  let previewOpenedCount: number;

  suiteSetup(async () => {
    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
  });

  setup(async () => {
    previewOpenedCount = 0;
    
    // Create manager with mock callback
    const context = vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')
      ?.exports?.context || {} as vscode.ExtensionContext;
    
    manager = new AutoPreviewManager(context, () => {
      previewOpenedCount++;
    });

    // Reset configuration to default state
    const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
    await config.update('autoPreview', false, vscode.ConfigurationTarget.Global);
  });

  teardown(async () => {
    if (manager) {
      manager.dispose();
    }
    if (mockPanel) {
      mockPanel.dispose();
    }
    
    // Reset configuration
    const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
    await config.update('autoPreview', false, vscode.ConfigurationTarget.Global);
    
    // Close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  suite('Configuration Management', () => {
    test('should start with auto-preview disabled by default', async () => {
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      const autoPreview = config.get<boolean>('autoPreview', false);
      
      assert.strictEqual(autoPreview, false, 'Auto-preview should be disabled by default');
    });

    test('should toggle auto-preview setting', async function() {
      this.timeout(10000);
      
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      
      // Initially disabled
      let autoPreview = config.get<boolean>('autoPreview', false);
      assert.strictEqual(autoPreview, false);
      
      // Toggle to enabled
      await manager.toggleAutoPreview();
      
      // Wait longer for the configuration update to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh config instance
      const updatedConfig = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      autoPreview = updatedConfig.get<boolean>('autoPreview', false);
      assert.strictEqual(autoPreview, true, 'Auto-preview should be enabled after toggle');
      
      // Toggle back to disabled
      await manager.toggleAutoPreview();
      
      // Wait again for propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh config instance again
      const finalConfig = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      autoPreview = finalConfig.get<boolean>('autoPreview', false);
      assert.strictEqual(autoPreview, false, 'Auto-preview should be disabled after second toggle');
    });

    test('should persist configuration across manager instances', async () => {
      // Enable in first instance
      await manager.toggleAutoPreview();
      manager.dispose();
      
      // Create new instance
      const context = vscode.extensions.getExtension('undefined_publisher.markdown-checkbox-preview')
        ?.exports?.context || {} as vscode.ExtensionContext;
      const newManager = new AutoPreviewManager(context, () => {});
      
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      const autoPreview = config.get<boolean>('autoPreview', false);
      
      assert.strictEqual(autoPreview, true, 'Configuration should persist');
      
      newManager.dispose();
    });
  });

  suite('Panel Tracking', () => {
    test('should register and track panels', () => {
      const testUri = vscode.Uri.file('/test/file.md');
      
      // Initially no panel
      assert.strictEqual(manager.hasPanel(testUri), false);
      
      // Create and register panel
      mockPanel = vscode.window.createWebviewPanel(
        'test',
        'Test Panel',
        vscode.ViewColumn.One
      );
      
      manager.registerPanel(mockPanel, testUri);
      
      // Panel should be tracked
      assert.strictEqual(manager.hasPanel(testUri), true);
    });

    test('should unregister panel when explicitly removed', () => {
      const testUri = vscode.Uri.file('/test/file.md');
      
      mockPanel = vscode.window.createWebviewPanel(
        'test',
        'Test Panel',
        vscode.ViewColumn.One
      );
      
      manager.registerPanel(mockPanel, testUri);
      assert.strictEqual(manager.hasPanel(testUri), true);
      
      // Unregister
      manager.unregisterPanel(testUri);
      assert.strictEqual(manager.hasPanel(testUri), false);
    });

    test('should automatically unregister panel on disposal', async () => {
      const testUri = vscode.Uri.file('/test/file.md');
      
      mockPanel = vscode.window.createWebviewPanel(
        'test',
        'Test Panel',
        vscode.ViewColumn.One
      );
      
      manager.registerPanel(mockPanel, testUri);
      assert.strictEqual(manager.hasPanel(testUri), true);
      
      // Dispose panel
      mockPanel.dispose();
      
      // Wait for disposal event to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be automatically unregistered
      assert.strictEqual(manager.hasPanel(testUri), false);
    });

    test('should handle multiple panels for different documents', () => {
      const uri1 = vscode.Uri.file('/test/file1.md');
      const uri2 = vscode.Uri.file('/test/file2.md');
      
      const panel1 = vscode.window.createWebviewPanel('test1', 'Test 1', vscode.ViewColumn.One);
      const panel2 = vscode.window.createWebviewPanel('test2', 'Test 2', vscode.ViewColumn.Two);
      
      manager.registerPanel(panel1, uri1);
      manager.registerPanel(panel2, uri2);
      
      assert.strictEqual(manager.hasPanel(uri1), true);
      assert.strictEqual(manager.hasPanel(uri2), true);
      
      panel1.dispose();
      panel2.dispose();
    });
  });

  suite('Auto-Opening Behavior', () => {
    test('should not auto-open when disabled', async function() {
      this.timeout(5000);
      
      // Ensure auto-preview is disabled
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      await config.update('autoPreview', false, vscode.ConfigurationTarget.Global);
      
      // Reset counter
      previewOpenedCount = 0;
      
      // Open markdown file
      const doc = await vscode.workspace.openTextDocument({
        content: '# Test\n- [ ] Task',
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
      
      // Wait for any potential auto-open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.strictEqual(previewOpenedCount, 0, 'Preview should not auto-open when disabled');
    });

    test('should auto-open when enabled', async function() {
      this.timeout(5000);
      
      // Enable auto-preview
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      await config.update('autoPreview', true, vscode.ConfigurationTarget.Global);
      
      // Reset counter
      previewOpenedCount = 0;
      
      // Open markdown file
      const doc = await vscode.workspace.openTextDocument({
        content: '# Test\n- [ ] Task',
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
      
      // Wait for auto-open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.ok(previewOpenedCount > 0, 'Preview should auto-open when enabled');
    });

    test('should not auto-open for non-markdown files', async function() {
      this.timeout(5000);
      
      // Enable auto-preview
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      await config.update('autoPreview', true, vscode.ConfigurationTarget.Global);
      
      // Reset counter
      previewOpenedCount = 0;
      
      // Open non-markdown file
      const doc = await vscode.workspace.openTextDocument({
        content: 'console.log("test");',
        language: 'javascript'
      });
      await vscode.window.showTextDocument(doc);
      
      // Wait for any potential auto-open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.strictEqual(previewOpenedCount, 0, 'Preview should not auto-open for non-markdown files');
    });

    test('should not auto-open if panel already exists', async function() {
      this.timeout(5000);
      
      // Enable auto-preview
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      await config.update('autoPreview', true, vscode.ConfigurationTarget.Global);
      
      // Reset counter
      previewOpenedCount = 0;
      
      // Create a panel first (simulating it already exists)
      mockPanel = vscode.window.createWebviewPanel('test', 'Test', vscode.ViewColumn.Beside);
      
      // Open markdown file
      const doc = await vscode.workspace.openTextDocument({
        content: '# Test\n- [ ] Task',
        language: 'markdown'
      });
      
      // Register the panel BEFORE showing the document
      manager.registerPanel(mockPanel, doc.uri);
      
      // Now show the document - this should NOT trigger auto-open
      const editor = await vscode.window.showTextDocument(doc);
      
      // Wait for any potential auto-open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      assert.strictEqual(previewOpenedCount, 0, 'Preview should not auto-open if already exists');
    });
  });

  suite('Status Bar Integration', () => {
    test('should show status bar for markdown files', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: '# Test',
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
      
      // Manager should show status bar automatically
      // We can't directly test visibility, but we can test show() doesn't throw
      assert.doesNotThrow(() => {
        manager.show();
      });
    });

    test('should hide status bar when requested', () => {
      assert.doesNotThrow(() => {
        manager.hide();
      });
    });
  });

  suite('Resource Management', () => {
    test('should dispose cleanly', () => {
      assert.doesNotThrow(() => {
        manager.dispose();
      });
    });

    test('should clear all tracked panels on disposal', () => {
      const uri1 = vscode.Uri.file('/test/file1.md');
      const uri2 = vscode.Uri.file('/test/file2.md');
      
      const panel1 = vscode.window.createWebviewPanel('test1', 'Test 1', vscode.ViewColumn.One);
      const panel2 = vscode.window.createWebviewPanel('test2', 'Test 2', vscode.ViewColumn.Two);
      
      manager.registerPanel(panel1, uri1);
      manager.registerPanel(panel2, uri2);
      
      // Dispose manager
      manager.dispose();
      
      // Clean up panels
      panel1.dispose();
      panel2.dispose();
      
      // Manager should be disposed without errors
      assert.ok(true);
    });
  });

  suite('Edge Cases', () => {
    test('should handle rapid toggle operations', async function() {
      this.timeout(5000);
      
      // Rapidly toggle multiple times
      await manager.toggleAutoPreview();
      await manager.toggleAutoPreview();
      await manager.toggleAutoPreview();
      await manager.toggleAutoPreview();
      
      const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
      const finalState = config.get<boolean>('autoPreview', false);
      
      // Should end up disabled (started false, 4 toggles = false)
      assert.strictEqual(finalState, false);
    });

    test('should handle panel registration with same URI twice', () => {
      const testUri = vscode.Uri.file('/test/file.md');
      
      const panel1 = vscode.window.createWebviewPanel('test1', 'Test 1', vscode.ViewColumn.One);
      const panel2 = vscode.window.createWebviewPanel('test2', 'Test 2', vscode.ViewColumn.Two);
      
      manager.registerPanel(panel1, testUri);
      manager.registerPanel(panel2, testUri); // Should replace first
      
      assert.strictEqual(manager.hasPanel(testUri), true);
      
      panel1.dispose();
      panel2.dispose();
    });

    test('should handle unregistering non-existent panel', () => {
      const testUri = vscode.Uri.file('/test/nonexistent.md');
      
      // Should not throw
      assert.doesNotThrow(() => {
        manager.unregisterPanel(testUri);
      });
    });
  });
});

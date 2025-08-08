import * as vscode from 'vscode';
import * as path from 'path';

export class VSCodeTestHelper {
  private static instance: VSCodeTestHelper;
  
  public static getInstance(): VSCodeTestHelper {
    if (!VSCodeTestHelper.instance) {
      VSCodeTestHelper.instance = new VSCodeTestHelper();
    }
    return VSCodeTestHelper.instance;
  }

  /**
   * Open a markdown file in VS Code
   */
  async openMarkdownFile(content: string, fileName: string = 'test.md'): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    
    return await vscode.window.showTextDocument(document);
  }

  /**
   * Execute a VS Code command and wait for completion
   */
  async executeCommand(command: string, ...args: any[]): Promise<any> {
    return await vscode.commands.executeCommand(command, ...args);
  }

  /**
   * Wait for extension to activate
   */
  async waitForExtensionActivation(extensionId: string = 'undefined_publisher.markdown-checkbox-preview'): Promise<vscode.Extension<any> | undefined> {
    const extension = vscode.extensions.getExtension(extensionId);
    if (extension && !extension.isActive) {
      await extension.activate();
    }
    return extension;
  }

  /**
   * Create a test workspace with markdown files
   */
  async createTestWorkspace(files: { [fileName: string]: string }): Promise<vscode.Uri> {
    const workspaceUri = vscode.Uri.file(path.join(__dirname, '../fixtures/test-workspace'));
    
    // Ensure workspace directory exists
    try {
      await vscode.workspace.fs.createDirectory(workspaceUri);
    } catch (error) {
      // Directory might already exist
    }

    // Create test files
    for (const [fileName, content] of Object.entries(files)) {
      const fileUri = vscode.Uri.joinPath(workspaceUri, fileName);
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
    }

    return workspaceUri;
  }

  /**
   * Wait for a webview panel to be created
   */
  async waitForWebviewPanel(timeout: number = 5000): Promise<vscode.WebviewPanel | null> {
    return new Promise((resolve) => {
      const disposable = vscode.window.onDidChangeActiveTextEditor(() => {
        // Check if active editor is a webview
        setTimeout(() => {
          disposable.dispose();
          resolve(null); // This is a simplified check
        }, timeout);
      });
    });
  }

  /**
   * Get the tree data provider for checkbox tree
   */
  getCheckboxTreeProvider(): any {
    // This would need to be implemented based on how we expose the tree provider
    return null;
  }

  /**
   * Simulate user interaction delays
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up test workspace
   */
  async cleanupTestWorkspace(): Promise<void> {
    try {
      const workspaceUri = vscode.Uri.file(path.join(__dirname, '../fixtures/test-workspace'));
      await vscode.workspace.fs.delete(workspaceUri, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
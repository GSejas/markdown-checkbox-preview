/**
 * Auto-Preview Manager Module
 * 
 * Manages automatic preview opening and status bar toggle button.
 * Follows Single Responsibility Principle - handles only auto-preview functionality.
 * 
 * @module autoPreviewManager
 * @author Claude Code Assistant
 * @date 2025-10-14
 */

import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Configuration namespace for accessing extension settings
 */
const CONFIG_NAMESPACE = 'markdown-checkbox-preview';
const CONFIG_KEY_AUTO_PREVIEW = 'autoPreview';

/**
 * Interface for preview panel tracking
 */
interface PreviewPanelTracker {
  panel: vscode.WebviewPanel;
  documentUri: string;
}

/**
 * Auto-Preview Manager Class
 * 
 * Responsibilities:
 * - Manage status bar toggle button
 * - Track open preview panels to prevent duplicates
 * - Handle auto-opening of previews when markdown files are opened
 * - Persist user preferences across sessions
 * - Manage a SINGLE preview panel that updates when switching files
 * 
 * @class AutoPreviewManager
 */
export class AutoPreviewManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentPanel: vscode.WebviewPanel | undefined;
  private currentDocumentUri: string | undefined;
  private disposables: vscode.Disposable[] = [];
  private openPreviewCallback: () => void;

  /**
   * Creates an instance of AutoPreviewManager
   * 
   * @param {vscode.ExtensionContext} context - VS Code extension context
   * @param {() => void} openPreviewCallback - Callback function to open preview
   */
  constructor(
    private context: vscode.ExtensionContext,
    openPreviewCallback: () => void
  ) {
    this.openPreviewCallback = openPreviewCallback;
    this.statusBarItem = this.createStatusBarItem();
    this.registerEventHandlers();
    this.updateStatusBarButton();
  }

  /**
   * Creates and configures the status bar toggle button
   * 
   * @private
   * @returns {vscode.StatusBarItem} Configured status bar item
   */
  private createStatusBarItem(): vscode.StatusBarItem {
    const item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    item.command = 'checkboxPreview.toggleAutoPreview';
    item.tooltip = 'Toggle automatic preview opening for markdown files';
    
    return item;
  }

  /**
   * Registers event handlers for editor changes and document events
   * 
   * @private
   */
  private registerEventHandlers(): void {
    // Listen for active editor changes
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
      (editor) => this.handleEditorChange(editor)
    );

    // Listen for configuration changes
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
      (event) => this.handleConfigurationChange(event)
    );

    this.disposables.push(editorChangeDisposable, configChangeDisposable);
  }

  /**
   * Handles active editor changes to show/hide status bar and auto-open previews
   * 
   * @private
   * @param {vscode.TextEditor | undefined} editor - The newly active editor
   */
  private handleEditorChange(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    // Only show status bar button for markdown files
    if (editor.document.languageId === 'markdown') {
      this.statusBarItem.show();
      Logger.debug(`Active editor changed to markdown file ${editor.document.uri.toString()}`);
      this.attemptAutoOpenPreview(editor);
    } else {
      this.statusBarItem.hide();
    }
  }

  /**
   * Handles configuration changes to update UI
   * 
   * @private
   * @param {vscode.ConfigurationChangeEvent} event - Configuration change event
   */
  private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEY_AUTO_PREVIEW}`)) {
      this.updateStatusBarButton();
    }
  }

  /**
   * Attempts to auto-open preview if enabled and not already open
   * 
   * @private
   * @param {vscode.TextEditor} editor - The editor to potentially open preview for
   */
  private attemptAutoOpenPreview(editor: vscode.TextEditor): void {
    const autoPreviewEnabled = this.isAutoPreviewEnabled();
    
    if (!autoPreviewEnabled) {
      Logger.debug('Auto-preview disabled; not opening preview');
      return;
    }

    const documentUri = editor.document.uri.toString();
    
    // If panel exists and is showing a different document, just update it (handled by callback)
    // If panel doesn't exist, create it
    if (this.currentPanel && this.currentDocumentUri === documentUri) {
      Logger.debug(`Preview already showing ${documentUri}; skipping auto-open`);
      return;
    }

    // Small delay to ensure document is fully loaded
    setTimeout(() => {
      // Re-check if still active
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor?.document.uri.toString() === documentUri) {
        Logger.info(`Auto-preview opening/updating for ${documentUri}`);
        this.openPreviewCallback();
      } else {
        Logger.debug(`Auto-preview skipped for ${documentUri}; active editor changed`);
      }
    }, 100);
  }

  /**
   * Updates the status bar button text and icon based on current state
   * 
   * @private
   */
  private updateStatusBarButton(): void {
    const isEnabled = this.isAutoPreviewEnabled();
    
    if (isEnabled) {
      this.statusBarItem.text = '$(eye) $(check)';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = 'Auto-Preview: ON\nClick to disable automatic preview opening';
    } else {
      this.statusBarItem.text = '$(eye-closed) $(x)';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
      this.statusBarItem.tooltip = 'Auto-Preview: OFF\nClick to enable automatic preview opening';
    }
  }

  /**
   * Checks if auto-preview is currently enabled
   * 
   * @private
   * @returns {boolean} True if auto-preview is enabled
   */
  private isAutoPreviewEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<boolean>(CONFIG_KEY_AUTO_PREVIEW, false);
  }

  /**
   * Toggles the auto-preview setting on/off
   * 
   * @public
   */
  public async toggleAutoPreview(): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const currentValue = config.get<boolean>(CONFIG_KEY_AUTO_PREVIEW, false);
    const newValue = !currentValue;

    try {
      await config.update(
        CONFIG_KEY_AUTO_PREVIEW,
        newValue,
        vscode.ConfigurationTarget.Global
      );

      this.updateStatusBarButton();
      Logger.info(`Auto-preview toggled ${newValue ? 'on' : 'off'}`);

      // Show user feedback (disabled per user request)
      // const status = newValue ? 'enabled' : 'disabled';
      // vscode.window.showInformationMessage(
      //   `Auto-Preview ${status}. ${newValue ? 'Previews will open automatically when you open markdown files.' : 'Previews will only open manually.'}`
      // );
    } catch (error) {
      Logger.error('Failed to toggle auto-preview', error);
      vscode.window.showErrorMessage(
        `Failed to toggle auto-preview: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Registers the singleton preview panel
   * Call this when a preview panel is created or updated
   * 
   * @public
   * @param {vscode.WebviewPanel} panel - The webview panel to track
   * @param {vscode.Uri} documentUri - The URI of the document being previewed
   */
  public registerPanel(panel: vscode.WebviewPanel, documentUri: vscode.Uri): void {
    const uriString = documentUri.toString();
    
    // Store the panel and current document
    this.currentPanel = panel;
    this.currentDocumentUri = uriString;
    Logger.debug(`Registered preview panel for ${uriString}`);

    // Automatically clear when panel is disposed
    panel.onDidDispose(() => {
      this.unregisterPanel();
    });
  }

  /**
   * Unregisters the preview panel (when closed)
   * 
   * @public
   */
  public unregisterPanel(): void {
    if (this.currentDocumentUri) {
      Logger.debug(`Unregistered preview panel for ${this.currentDocumentUri}`);
    }
    this.currentPanel = undefined;
    this.currentDocumentUri = undefined;
  }

  /**
   * Checks if a preview panel currently exists
   * 
   * @public
   * @returns {boolean} True if a panel exists
   */
  public hasPanel(): boolean {
    return this.currentPanel !== undefined && !this.currentPanel.visible === false;
  }

  /**
   * Gets the current panel if it exists
   * 
   * @public
   * @returns {vscode.WebviewPanel | undefined} The current panel or undefined
   */
  public getCurrentPanel(): vscode.WebviewPanel | undefined {
    return this.currentPanel;
  }

  /**
   * Shows the status bar button if a markdown file is active
   * 
   * @public
   */
  public show(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'markdown') {
      this.statusBarItem.show();
    }
  }

  /**
   * Hides the status bar button
   * 
   * @public
   */
  public hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Disposes of all resources used by the manager
   * 
   * @public
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
    if (this.currentPanel) {
      this.currentPanel.dispose();
    }
  }
}

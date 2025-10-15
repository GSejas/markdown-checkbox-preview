import * as vscode from 'vscode';
import { renderMarkdown, getTaskListCount, extractCheckboxStates } from './renderer';
import { CheckboxTreeDataProvider, CheckboxItem } from './checkboxTree';
import { CheckboxCodeLensProvider } from './providers/checkboxCodeLensProvider';
import { CheckboxHoverProvider } from './providers/checkboxHoverProvider';
import { AutoPreviewManager } from './autoPreviewManager';
import { Logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
  Logger.info('Markdown Checkbox Preview extension activated');

  // Create the tree data provider
  const treeDataProvider = new CheckboxTreeDataProvider(context);

  // Register the tree view
  const treeView = vscode.window.createTreeView('checkboxTree', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true
  });

  // Create and register providers
  const codeLensProvider = new CheckboxCodeLensProvider(context);
  const hoverProvider = new CheckboxHoverProvider(context);

  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { scheme: 'file', language: 'markdown' },
    codeLensProvider
  );

  const hoverDisposable = vscode.languages.registerHoverProvider(
    { scheme: 'file', language: 'markdown' },
    hoverProvider
  );

  // Initialize auto-preview manager with callback to open preview
  // When auto-preview triggers opening we call with { silent: true }
  const autoPreviewManager = new AutoPreviewManager(
    context,
    () => openCheckboxPreview(context, treeDataProvider, autoPreviewManager, { silent: true })
  );

  // Register commands
  const openPreviewDisposable = vscode.commands.registerCommand('checkboxPreview.open', () => {
    openCheckboxPreview(context, treeDataProvider, autoPreviewManager);
  });

  const toggleAutoPreviewDisposable = vscode.commands.registerCommand(
    'checkboxPreview.toggleAutoPreview',
    () => autoPreviewManager.toggleAutoPreview()
  );

  const toggleDebugDisposable = vscode.commands.registerCommand(
    'checkboxPreview.toggleDebug',
    () => {
      Logger.setVerbose(!Logger.isVerbose());
      Logger.show();
      vscode.window.showInformationMessage(
        `Markdown Checkbox Preview: Debug logging ${Logger.isVerbose() ? 'enabled' : 'disabled'}`
      );
    }
  );

  const refreshTreeDisposable = vscode.commands.registerCommand('checkboxTree.refresh', () => {
    treeDataProvider.refresh();
  });

  const toggleHeadersDisposable = vscode.commands.registerCommand('checkboxTree.toggleHeaders', () => {
    treeDataProvider.toggleShowHeaders();
  });

  const toggleCheckboxDisposable = vscode.commands.registerCommand('checkboxTree.toggle', (item: CheckboxItem) => {
    treeDataProvider.toggleCheckbox(item);
  });

  const navigateToHeaderDisposable = vscode.commands.registerCommand('checkboxTree.navigateToHeader', (item: CheckboxItem) => {
    treeDataProvider.navigateToHeader(item);
  });

  const checkboxToggleDisposable = vscode.commands.registerCommand('checkboxPreview.toggleCheckbox', (uri: vscode.Uri, lineNumber: number) => {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    if (document) {
      const editor = vscode.window.visibleTextEditors.find(editor => editor.document === document);
      if (editor) {
        toggleCheckboxAtLine(editor, lineNumber);
      }
    }
  });

  // Add status bar item for completion stats
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = "$(checklist) 0/0 tasks";
  statusBarItem.tooltip = "Markdown checkbox completion";

  // Update status bar when tree changes
  const updateStatusBar = () => {
    const stats = treeDataProvider.getCompletionStats();
    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    statusBarItem.text = `$(checklist) ${stats.completed}/${stats.total} tasks (${percentage}%)`;

    if (stats.total > 0) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  // Listen for tree updates
  treeDataProvider.onDidChangeTreeData(() => {
    updateStatusBar();
  });

  // Initial status bar update
  updateStatusBar();

  // Update status bar when active editor changes
  vscode.window.onDidChangeActiveTextEditor(() => {
    setTimeout(updateStatusBar, 100); // Small delay to let tree update
  });

  context.subscriptions.push(
    openPreviewDisposable,
    toggleAutoPreviewDisposable,
    toggleDebugDisposable,
    refreshTreeDisposable,
    toggleCheckboxDisposable,
    navigateToHeaderDisposable,
    checkboxToggleDisposable,
    toggleHeadersDisposable,
    treeView,
    statusBarItem,
    codeLensDisposable,
    hoverDisposable,
    autoPreviewManager
  );

  // Show auto-preview button if markdown file is already open
  autoPreviewManager.show();
}

/**
 * Opens the interactive checkbox preview panel
 * 
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {CheckboxTreeDataProvider} [treeDataProvider] - Optional tree data provider for updates
 * @param {AutoPreviewManager} [autoPreviewManager] - Optional auto-preview manager for tracking
 */
function openCheckboxPreview(
  context: vscode.ExtensionContext, 
  treeDataProvider?: CheckboxTreeDataProvider,
  autoPreviewManager?: AutoPreviewManager,
  options?: { silent?: boolean }
) {
  const editor = vscode.window.activeTextEditor;

  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showErrorMessage('Please open a Markdown file first.');
    return;
  }

  const document = editor.document;
  const fileName = document.fileName.split(/[\\/]/).pop() || 'Untitled';

  Logger.debug(`Opening/updating preview for ${document.uri.toString()} (silent=${options?.silent ?? false})`);

  // Check if we have an existing panel - if so, update it instead of creating new
  const existingPanel = autoPreviewManager?.getCurrentPanel();
  if (existingPanel) {
    Logger.info(`Reusing existing preview panel, updating content for ${document.uri.toString()}`);
    
    // Update panel title
    existingPanel.title = `📋 ${fileName} - Interactive Checkboxes`;
    
    // Update panel content
    existingPanel.webview.html = getWebviewContent(existingPanel.webview, context, document.getText());
    
    // Register as current document
    if (autoPreviewManager) {
      autoPreviewManager.registerPanel(existingPanel, document.uri);
    }
    
    // Reveal the panel (bring to front)
    existingPanel.reveal(vscode.ViewColumn.Two, true);
    
    return;
  }

  // Create the webview panel
  const panel = vscode.window.createWebviewPanel(
    'checkboxPreview',
    `📋 ${fileName} - Interactive Checkboxes`,
    { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media')
      ],
      retainContextWhenHidden: true
    }
  );

  Logger.info(`Created preview panel for ${document.uri.toString()} in column two`);

  let isWebviewReady = false;
  const sendMessage = (message: { type: string; [key: string]: unknown }) => {
    if (!panel.visible && message.type !== 'rerender') {
      Logger.debug(`Skipping message type ${message.type}; panel not visible`);
      return;
    }

    panel.webview.postMessage(message).then(sent => {
      if (!sent) {
        Logger.warn(`Webview message of type ${message.type} was not delivered`);
      }
    }, (error: unknown) => {
      Logger.error(`Failed to post webview message of type ${message.type}`, error);
    });
  };

  // Set the initial HTML content
  panel.webview.html = getWebviewContent(panel.webview, context, document.getText());
  Logger.debug(`Initial preview content rendered for ${document.uri.toString()}`);
  
  // Mark webview as ready after short delay to ensure initialization
  setTimeout(() => {
    isWebviewReady = true;
    Logger.debug(`Webview ready for ${document.uri.toString()}`);
  }, 100);

  // Register panel with auto-preview manager to prevent duplicates
  if (autoPreviewManager) {
    autoPreviewManager.registerPanel(panel, document.uri);
  }

  // Handle document changes with debouncing to avoid flooding webview
  let updateTimeout: NodeJS.Timeout | undefined;
  let isTogglingCheckbox = false;
  
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.uri.toString() === document.uri.toString()) {
      Logger.debug(`Document change detected for ${document.uri.toString()} (${event.contentChanges.length} change(s))`);
      
      // Clear existing timeout
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      // Use shorter debounce for checkbox toggles (faster feedback)
      const debounceTime = isTogglingCheckbox ? 50 : 150;
      
      // Debounce updates to batch rapid changes
      updateTimeout = setTimeout(() => {
        const newContent = event.document.getText();
        
        if (isTogglingCheckbox) {
          // For checkbox toggles, send only checkbox states (targeted update)
          const checkboxStates = extractCheckboxStates(newContent);
          sendMessage({
            type: 'syncCheckboxes',
            checkboxes: checkboxStates
          });
        } else {
          // For other changes, do full rerender
          const html = renderMarkdown(newContent);
          sendMessage({
            type: 'rerender',
            html: html
          });
        }
        
        // Always update progress
        const stats = getTaskListCount(newContent);
        sendMessage({
          type: 'updateProgress',
          completed: stats.completed,
          total: stats.total
        });

        // Refresh tree view if available
        if (treeDataProvider) {
          treeDataProvider.refresh();
        }
        
        // Reset checkbox toggle flag
        isTogglingCheckbox = false;
      }, debounceTime);
    }
  });

  // Synchronized scrolling: editor -> preview
  let scrollTimeout: NodeJS.Timeout | undefined;
  const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
    if (event.textEditor.document.uri.toString() === document.uri.toString()) {
      // Clear existing timeout to debounce rapid scroll events
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        const visibleRanges = event.visibleRanges;
        if (visibleRanges.length > 0) {
          const topLine = visibleRanges[0].start.line;
          Logger.debug(`Editor scrolled to line ${topLine} for ${document.uri.toString()}`);
          
          sendMessage({
            type: 'scroll',
            line: topLine
          });
        }
      }, 50); // Faster than document changes for smooth scrolling
    }
  });

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(message => {
    Logger.debug(`Received webview message: ${message.type}`);
    
    // Prefer editing the document currently tracked by the preview manager
    const previewUri = autoPreviewManager?.getCurrentDocumentUri();
    
    switch (message.type) {
      case 'toggle':
        Logger.debug(`Toggling checkbox at line ${message.line}`);
        isTogglingCheckbox = true;
        if (previewUri) {
          toggleCheckboxInDocumentUri(previewUri, message.line);
        } else {
          // Fallback to active editor
          const currentEditor = vscode.window.activeTextEditor;
          if (currentEditor) {
            toggleCheckboxAtLine(currentEditor, message.line);
          } else {
            Logger.error('No document available to toggle checkbox');
          }
        }
        break;
      case 'navigate':
        Logger.debug(`Navigating to line ${message.line}`);
        // Prefer to navigate in the previewed document if available
        if (previewUri) {
          const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === previewUri.toString());
          const editor = vscode.window.visibleTextEditors.find(e => e.document === doc);
          if (editor) {
            navigateToLine(editor, message.line);
          } else if (doc) {
            vscode.window.showTextDocument(doc).then(ed => navigateToLine(ed, message.line));
          }
        } else {
          const currentEditor = vscode.window.activeTextEditor;
          if (currentEditor) {
            navigateToLine(currentEditor, message.line);
          }
        }
        break;
    }
  });

  // Clean up when panel is disposed
  panel.onDidDispose(() => {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    changeDisposable.dispose();
    scrollDisposable.dispose();
    Logger.debug(`Disposed preview panel for ${document.uri.toString()}`);
    // Auto-preview manager automatically unregisters via its own onDidDispose handler
  });

  context.subscriptions.push(changeDisposable, scrollDisposable);
}

/**
 * Toggles a checkbox at the specified line number
 * 
 * @param {vscode.TextEditor} editor - The text editor containing the checkbox
 * @param {number} lineNumber - The line number of the checkbox (0-indexed)
 */
function toggleCheckboxAtLine(editor: vscode.TextEditor, lineNumber: number) {
  const document = editor.document;

  Logger.info(`Toggle checkbox requested: line=${lineNumber}, documentUri=${document.uri.toString()}`);

  if (lineNumber >= document.lineCount) {
    Logger.warn(`Toggle requested for line ${lineNumber} beyond document length ${document.lineCount}`);
    return;
  }

  const line = document.lineAt(lineNumber);
  const lineText = line.text;

  Logger.debug(`Current line text: "${lineText}"`);

  // Match different checkbox patterns
  let updatedText = lineText;

  // Handle [ ] -> [x]
  if (lineText.includes('[ ]')) {
    updatedText = lineText.replace(/\[ \]/, '[x]');
    Logger.debug(`Toggling unchecked -> checked`);
  }
  // Handle [x] -> [ ] (both lowercase and uppercase)
  else if (lineText.match(/\[[xX]\]/)) {
    updatedText = lineText.replace(/\[[xX]\]/, '[ ]');
    Logger.debug(`Toggling checked -> unchecked`);
  } else {
    Logger.warn(`No checkbox pattern found in line ${lineNumber}: "${lineText}"`);
  }

  // Apply the edit if there was a change
  if (updatedText !== lineText) {
    Logger.info(`Applying edit to line ${lineNumber}: "${lineText}" -> "${updatedText}"`);
    editor.edit(editBuilder => {
      editBuilder.replace(line.range, updatedText);
    }).then(success => {
      if (!success) {
        vscode.window.showErrorMessage('Failed to update checkbox state');
        Logger.error(`Failed to apply checkbox toggle at line ${lineNumber}`);
      } else {
        Logger.info(`✅ Checkbox successfully toggled at line ${lineNumber}`);
      }
    });
  } else {
    Logger.warn(`No change needed for line ${lineNumber}`);
  }
}

function navigateToLine(editor: vscode.TextEditor, lineNumber: number) {
  const document = editor.document;

  if (lineNumber >= document.lineCount) {
    return;
  }

  // Create a new selection at the specified line
  const position = new vscode.Position(lineNumber, 0);
  const range = new vscode.Range(position, position);

  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

  // Focus the editor
  vscode.window.showTextDocument(document, editor.viewColumn);
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext, markdownContent: string): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  );

  const renderedContent = renderMarkdown(markdownContent);
  const stats = getTaskListCount(markdownContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' ${webview.cspSource}; style-src 'self' 'unsafe-inline';">
    <title>Interactive Checkbox Preview</title>
    <style>
        body {
            font-family: var(--vscode-editor-font-family, 'Segoe UI', Arial, sans-serif);
            font-size: var(--vscode-editor-font-size, 14px);
            line-height: 1.7;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .main-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 32px 24px;
            min-height: 100vh;
            box-sizing: border-box;
        }

        @media (max-width: 600px) {
            .main-container {
                padding: 20px 16px;
                max-width: 100%;
            }
        }

        .progress-container {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 32px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(10px);
        }

        .progress-container:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .no-tasks-container {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 32px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }

        .no-tasks-header {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 12px;
            color: var(--vscode-editorWidget-foreground);
        }

        .no-tasks-message {
            font-size: 14px;
            line-height: 1.5;
        }

        .no-tasks-message code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }

        .progress-header {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 12px;
            color: var(--vscode-editorWidget-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .progress-bar-container {
            background-color: var(--vscode-editorWidget-resizeBorder);
            border-radius: 12px;
            height: 10px;
            overflow: hidden;
            margin-bottom: 12px;
            position: relative;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            border-radius: 12px;
            transition: width 0.5s ease;
            width: 0%;
            position: relative;
            overflow: hidden;
        }

        .progress-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            animation: progress-shine 2s infinite;
        }

        @keyframes progress-shine {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        .progress-text {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }

        .content-container {
            background-color: var(--vscode-editor-background);
            border-radius: 8px;
            padding: 24px;
            margin: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid var(--vscode-editorWidget-border, transparent);
        }

        .task-list-item {
            display: flex;
            align-items: flex-start;
            margin: 12px 0;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid transparent;
        }

        .task-list-item:hover {
            background-color: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
            transform: translateX(2px);
        }

        .md-checkbox {
            margin-right: 16px;
            margin-top: 3px;
            cursor: pointer;
            transform: scale(1.3);
            transition: transform 0.1s ease;
        }

        .md-checkbox:hover {
            background-color: var(--vscode-inputOption-hoverBackground);
            transform: scale(1.4);
        }

        .md-checkbox:active {
            transform: scale(1.2);
        }

        .task-text {
            flex: 1;
            word-wrap: break-word;
            transition: all 0.3s ease;
            font-size: 14px;
            line-height: 1.6;
        }

        .task-list-item input:checked + .task-text {
            text-decoration: line-through;
            opacity: 0.65;
            color: var(--vscode-descriptionForeground);
        }

        ul, ol {
            padding-left: 0;
            margin: 16px 0;
        }

        ul ul, ol ol {
            margin: 8px 0;
            padding-left: 24px;
        }

        .task-list-item-container {
            list-style: none;
            margin: 6px 0;
        }

        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-editorLineNumber-activeForeground);
            margin-top: 40px;
            margin-bottom: 20px;
            font-weight: 600;
            line-height: 1.3;
        }

        .clickable-header:hover {
            color: var(--vscode-textLink-foreground) !important;
            text-decoration: underline;
        }

        h1 {
            font-size: 2.2em;
            border-bottom: 2px solid var(--vscode-editorWidget-border);
            padding-bottom: 12px;
            margin-top: 0;
        }

        h2 {
            font-size: 1.8em;
            border-bottom: 1px solid var(--vscode-editorWidget-border);
            padding-bottom: 8px;
        }

        h3 {
            font-size: 1.4em;
            margin-top: 32px;
        }

        p {
            margin: 16px 0;
            line-height: 1.7;
        }

        code {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 3px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }

        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            border: 1px solid var(--vscode-editorWidget-border);
        }

        blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding-left: 20px;
            margin: 20px 0;
            color: var(--vscode-textBlockQuote-foreground);
            font-style: italic;
            background-color: var(--vscode-textCodeBlock-background);
            padding: 16px 20px;
            border-radius: 0 8px 8px 0;
        }

        /* Improved list spacing */
        li {
            margin: 8px 0;
        }

        /* Better spacing for nested lists */
        .task-list-item-container .task-list-item-container {
            margin-left: 20px;
            border-left: 2px solid var(--vscode-editorWidget-border);
            padding-left: 16px;
            margin-top: 4px;
        }

        /* Focus styles for accessibility */
        .md-checkbox:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }

        /* Smooth transitions for better UX */
        * {
            transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }

        /* Section spacing */
        .content-container > * + * {
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="main-container">
        ${stats.total > 0 ? `
        <div class="progress-container">
            <div class="progress-header">📊 Task Progress</div>
            <div class="progress-bar-container">
                <div id="progress-bar" class="progress-bar" style="width: ${(stats.completed / stats.total) * 100}%"></div>
            </div>
            <div id="progress-text" class="progress-text">${stats.completed}/${stats.total} tasks completed (${Math.round((stats.completed / stats.total) * 100)}%)</div>
        </div>
        ` : `
        <div class="no-tasks-container">
            <div class="no-tasks-header">📝 No Task Checklists Found</div>
            <div class="no-tasks-message">
                This markdown file doesn't contain any checkboxes yet.<br>
                Add some tasks using the format: <code>- [ ] Task description</code>
            </div>
        </div>
        `}
        
        <div class="content-container">
            <div id="root">${renderedContent}</div>
        </div>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Toggle a checkbox in a document by URI using WorkspaceEdit
 * Exported for testing purposes
 * 
 * @param uri Document URI
 * @param lineNumber Zero-based line number
 */
export async function toggleCheckboxInDocumentUri(uri: vscode.Uri, lineNumber: number): Promise<boolean> {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const line = doc.lineAt(lineNumber);
    const lineText = line.text;

    let updatedText = lineText;
    if (/\[ \]/.test(lineText)) {
      updatedText = lineText.replace(/\[ \]/, '[x]');
    } else if (/\[[xX]\]/.test(lineText)) {
      updatedText = lineText.replace(/\[[xX]\]/, '[ ]');
    } else {
      Logger.warn(`No checkbox found at line ${lineNumber} in ${uri.toString()}`);
      return false;
    }

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, line.range, updatedText);
    const success = await vscode.workspace.applyEdit(edit);
    if (!success) {
      Logger.error(`WorkspaceEdit failed for ${uri.toString()} at line ${lineNumber}`);
      return false;
    } else {
      Logger.info(`Checkbox toggled in document ${uri.toString()} at line ${lineNumber}`);
      return true;
    }
  } catch (err) {
    Logger.error('Failed to toggle checkbox by URI', err);
    return false;
  }
}

export function deactivate() {
  // Cleanup when extension is deactivated
}

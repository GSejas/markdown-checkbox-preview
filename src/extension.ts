import * as vscode from 'vscode';
import { renderMarkdown, getTaskListCount } from './renderer';
import { CheckboxTreeDataProvider, CheckboxItem } from './checkboxTree';
import { CheckboxCodeLensProvider } from './providers/checkboxCodeLensProvider';
import { CheckboxHoverProvider } from './providers/checkboxHoverProvider';

type PreviewMode = 'manual' | 'ephemeral' | 'sticky';

// Global state to manage panels
const activePanels = new Map<string, { panel: vscode.WebviewPanel, mode: PreviewMode }>();
let lastActiveMarkdownUri: vscode.Uri | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Markdown Checkbox Preview extension is now active!');

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

  // New command for setting preview mode from webview
  const setPreviewModeDisposable = vscode.commands.registerCommand('checkboxPreview.setPreviewMode', async (args: { uri: string, mode: 'default' | PreviewMode }) => {
    const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
    const fileModes = config.get<Record<string, string>>('fileSpecificPreviewModes', {});

    if (args.mode === 'default') {
      delete fileModes[args.uri];
    } else {
      fileModes[args.uri] = args.mode;
    }

    await config.update('fileSpecificPreviewModes', fileModes, vscode.ConfigurationTarget.Workspace);

    // After updating settings, get the *effective* new mode for the file
    const effectiveMode = getPreviewModeForFile(vscode.Uri.parse(args.uri));

    // Update the in-memory state of the active panel to apply the change immediately
    const panelInfo = activePanels.get(args.uri);
    if (panelInfo) {
      panelInfo.mode = effectiveMode;
    }
  });

  // Register commands
  const openPreviewDisposable = vscode.commands.registerCommand('checkboxPreview.open', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown') {
      createOrShowPreview(context, editor.document.uri, treeDataProvider);
    } else {
      vscode.window.showErrorMessage('Please open a Markdown file first.');
    }
  });

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

  const checkboxToggleDisposable = vscode.commands.registerCommand('checkboxPreview.toggleCheckbox', (arg1: any, arg2: any) => {
    let targetUri: vscode.Uri;
    let targetLineNumber: number;

    // Type guard for URI-like objects that might have been marshalled
    const isUriLike = (p: any): p is vscode.Uri => p && typeof p.scheme === 'string' && typeof p.path === 'string';

    // Case 1: Invoked from Hover Provider (single object argument)
    if (typeof arg1 === 'object' && arg1 !== null && typeof arg1.uri === 'string' && typeof arg1.line === 'number') {
        try {
            targetUri = vscode.Uri.parse(arg1.uri, true);
            targetLineNumber = arg1.line;
        } catch (e) {
            console.error('Error parsing URI from hover args:', e);
            vscode.window.showErrorMessage('Could not toggle checkbox: invalid URI.');
            return;
        }
    } 
    // Case 2: Invoked from CodeLens Provider (uri, lineNumber arguments)
    else if (isUriLike(arg1) && typeof arg2 === 'number') {
        targetUri = arg1;
        targetLineNumber = arg2;
    }
    else {
        vscode.window.showErrorMessage('Could not toggle checkbox: invalid arguments provided.');
        console.error('Invalid arguments for toggleCheckbox command', arg1, arg2);
        return;
    }

    vscode.workspace.openTextDocument(targetUri).then(document => {
        // Find an editor for the document, or open one.
        // Using showTextDocument is robust as it will find an existing editor or open a new one.
        vscode.window.showTextDocument(document, { preserveFocus: true }).then(editor => {
            toggleCheckboxAtLine(editor, targetLineNumber);
        }, (err) => {
            vscode.window.showErrorMessage(`Could not show document to toggle checkbox: ${err.message}`);
            console.error('Error showing document for toggle:', err);
        });
    }, (err) => {
        vscode.window.showErrorMessage(`Could not open document to toggle checkbox: ${err.message}`);
        console.error('Error opening document for toggle:', err);
    });
  });

  // Handle automatic preview opening/closing
  const onDidChangeActiveEditorDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    handleActiveEditorChange(editor, context, treeDataProvider);
  });

  // Initial check for the currently active editor
  if (vscode.window.activeTextEditor) {
    handleActiveEditorChange(vscode.window.activeTextEditor, context, treeDataProvider);
  }

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
    refreshTreeDisposable,
    toggleCheckboxDisposable,
    navigateToHeaderDisposable,
    checkboxToggleDisposable,
    toggleHeadersDisposable,
    treeView,
    statusBarItem,
    codeLensDisposable,
    hoverDisposable,
    setPreviewModeDisposable,
    onDidChangeActiveEditorDisposable
  );
}

async function handleActiveEditorChange(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext, treeDataProvider: CheckboxTreeDataProvider) {
  const newMarkdownUri = (editor && editor.document.languageId === 'markdown') ? editor.document.uri : undefined;

  // 1. Handle closing the previous ephemeral panel
  if (lastActiveMarkdownUri) {
    // If we are switching to a different file (or no file), check if the old panel should be closed.
    if (!newMarkdownUri || newMarkdownUri.toString() !== lastActiveMarkdownUri.toString()) {
      const panelInfo = activePanels.get(lastActiveMarkdownUri.toString());
      // Close if the panel is ephemeral and is NOT the currently active element (i.e., user clicked a different editor, not the panel itself)
      if (panelInfo && panelInfo.mode === 'ephemeral' && !panelInfo.panel.active) {
        panelInfo.panel.dispose();
      }
    }
  }

  // 2. Handle opening a new panel
  if (newMarkdownUri) {
    const mode = getPreviewModeForFile(newMarkdownUri);
    if (mode === 'ephemeral' || mode === 'sticky') {
      createOrShowPreview(context, newMarkdownUri, treeDataProvider);
    }
  }

  // 3. Update the state for the next change event
  if (newMarkdownUri) {
    lastActiveMarkdownUri = newMarkdownUri;
  }
  // If the new editor is not a markdown file, we don't clear lastActiveMarkdownUri.
  // This allows us to correctly close its ephemeral panel on a subsequent editor change.
}

function getPreviewModeForFile(uri: vscode.Uri): PreviewMode {
  const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
  const fileModes = config.get<Record<string, string>>('fileSpecificPreviewModes', {});
  const fileSpecificMode = fileModes[uri.toString()];

  if (fileSpecificMode && ['manual', 'ephemeral', 'sticky'].includes(fileSpecificMode)) {
    return fileSpecificMode as PreviewMode;
  }

  return config.get<PreviewMode>('defaultPreviewMode', 'manual');
}

async function createOrShowPreview(context: vscode.ExtensionContext, uri: vscode.Uri, treeDataProvider?: CheckboxTreeDataProvider) {
  const uriString = uri.toString();
  const existingPanelInfo = activePanels.get(uriString);

  if (existingPanelInfo) {
    existingPanelInfo.panel.reveal(vscode.ViewColumn.Beside, true);
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  if (!document) return;

  const fileName = document.fileName.split(/[\\/]/).pop() || 'Untitled';
  const panel = vscode.window.createWebviewPanel(
    'checkboxPreview',
    `📋 ${fileName} - Interactive Checkboxes`,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      retainContextWhenHidden: true
    }
  );

  const mode = getPreviewModeForFile(uri);
  panel.webview.html = getWebviewContent(panel.webview, context, document.getText(), uri);

  activePanels.set(uriString, { panel, mode });

  panel.onDidDispose(() => {
    activePanels.delete(uriString);
  });

  // Handle document changes
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.uri.toString() === uriString) {
      const newContent = event.document.getText();
      const html = renderMarkdown(newContent);
      const stats = getTaskListCount(newContent);

      panel.webview.postMessage({
        type: 'rerender',
        html: html
      });

      panel.webview.postMessage({
        type: 'updateProgress',
        completed: stats.completed,
        total: stats.total
      });

      if (treeDataProvider) {
        treeDataProvider.refresh();
      }
    }
  });

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(message => {
    const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uriString);
    if (!editor && message.type !== 'setMode') return;

    switch (message.type) {
      case 'toggle':
        if (editor) toggleCheckboxAtLine(editor, message.line);
        break;
      case 'navigate':
        if (editor) navigateToLine(editor, message.line);
        break;
      case 'setMode':
        vscode.commands.executeCommand('checkboxPreview.setPreviewMode', {
          uri: uriString,
          mode: message.mode
        });
        break;
    }
  });

  panel.onDidDispose(() => {
    changeDisposable.dispose();
  });
}

function toggleCheckboxAtLine(editor: vscode.TextEditor, lineNumber: number) {
  const document = editor.document;

  if (lineNumber >= document.lineCount) {
    return;
  }

  const line = document.lineAt(lineNumber);
  const lineText = line.text;

  // Match different checkbox patterns
  let updatedText = lineText;

  // Handle [ ] -> [x]
  if (lineText.includes('[ ]')) {
    updatedText = lineText.replace(/\[ \]/, '[x]');
  }
  // Handle [x] -> [ ] (both lowercase and uppercase)
  else if (lineText.match(/\[[xX]\]/)) {
    updatedText = lineText.replace(/\[[xX]\]/, '[ ]');
  }

  // Apply the edit if there was a change
  if (updatedText !== lineText) {
    editor.edit(editBuilder => {
      editBuilder.replace(line.range, updatedText);
    }).then(success => {
      if (!success) {
        vscode.window.showErrorMessage('Failed to update checkbox state');
      }
    });
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

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext, markdownContent: string, uri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  );

  const renderedContent = renderMarkdown(markdownContent);
  const stats = getTaskListCount(markdownContent);

  const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
  const defaultMode = config.get<PreviewMode>('defaultPreviewMode', 'manual');
  const fileModes = config.get<Record<string, string>>('fileSpecificPreviewModes', {});
  const fileSpecificMode = fileModes[uri.toString()];
  const selectedValue = fileSpecificMode ? fileSpecificMode : 'default';

  const options = [
    { value: 'default', text: `Default (${defaultMode})` },
    { value: 'manual', text: 'Manual' },
    { value: 'ephemeral', text: 'Ephemeral' },
    { value: 'sticky', text: 'Sticky' }
  ];

  const dropdownOptions = options.map(opt =>
    `<option value="${opt.value}" ${selectedValue === opt.value ? 'selected' : ''}>${opt.text}</option>`
  ).join('');

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
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .progress-container:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .no-tasks-message {
            font-size: 14px;
            line-height: 1.5;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding-top: 8px;
        }

        .no-tasks-message code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }
        
        .progress-header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .progress-header {
            font-weight: 600;
            font-size: 16px;
            color: var(--vscode-editorWidget-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .preview-mode-selector {
            font-family: var(--vscode-font-family);
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
        }

        .progress-bar-container {
            background-color: var(--vscode-editorWidget-resizeBorder);
            border-radius: 12px;
            height: 10px;
            overflow: hidden;
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
        <div class="progress-container">
            <div class="progress-header-container">
                <div class="progress-header">${stats.total > 0 ? '📊 Task Progress' : '📝 No Task Checklists Found'}</div>
                <select id="preview-mode-selector" class="preview-mode-selector" title="Set preview mode for this file">
                    ${dropdownOptions}
                </select>
            </div>
            ${stats.total > 0 ? `
            <div class="progress-bar-container">
                <div id="progress-bar" class="progress-bar" style="width: ${(stats.completed / stats.total) * 100}%"></div>
            </div>
            <div id="progress-text" class="progress-text">${stats.completed}/${stats.total} tasks completed (${Math.round((stats.completed / stats.total) * 100)}%)</div>
            ` : `
            <div class="no-tasks-message">
                This markdown file doesn't contain any checkboxes yet.<br>
                Add some tasks using the format: <code>- [ ] Task description</code>
            </div>
            `}
        </div>
        
        <div class="content-container">
            <div id="root">${renderedContent}</div>
        </div>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {
  // Cleanup when extension is deactivated
}
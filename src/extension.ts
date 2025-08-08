import * as vscode from 'vscode';
import { renderMarkdown, getTaskListCount } from './renderer';
import { CheckboxTreeDataProvider, CheckboxItem } from './checkboxTree';

export function activate(context: vscode.ExtensionContext) {
  console.log('Markdown Checkbox Preview extension is now active!');

  // Create the tree data provider
  const treeDataProvider = new CheckboxTreeDataProvider();
  
  // Register the tree view
  const treeView = vscode.window.createTreeView('checkboxTree', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true
  });

  // Register commands
  const openPreviewDisposable = vscode.commands.registerCommand('checkboxPreview.open', () => {
    openCheckboxPreview(context, treeDataProvider);
  });

  const refreshTreeDisposable = vscode.commands.registerCommand('checkboxTree.refresh', () => {
    treeDataProvider.refresh();
  });

  const toggleCheckboxDisposable = vscode.commands.registerCommand('checkboxTree.toggle', (item: CheckboxItem) => {
    treeDataProvider.toggleCheckbox(item);
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
    refreshTreeDisposable,
    toggleCheckboxDisposable,
    treeView,
    statusBarItem
  );
}

function openCheckboxPreview(context: vscode.ExtensionContext, treeDataProvider?: CheckboxTreeDataProvider) {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor || editor.document.languageId !== 'markdown') {
    vscode.window.showErrorMessage('Please open a Markdown file first.');
    return;
  }

  const document = editor.document;
  const fileName = document.fileName.split(/[\\/]/).pop() || 'Untitled';
  
  // Create the webview panel
  const panel = vscode.window.createWebviewPanel(
    'checkboxPreview',
    `📋 ${fileName} - Interactive Checkboxes`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media')
      ],
      retainContextWhenHidden: true
    }
  );

  // Set the initial HTML content
  panel.webview.html = getWebviewContent(panel.webview, context, document.getText());

  // Handle document changes
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.uri.toString() === document.uri.toString()) {
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

      // Refresh tree view if available
      if (treeDataProvider) {
        treeDataProvider.refresh();
      }
    }
  });

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(message => {
    switch (message.type) {
      case 'toggle':
        toggleCheckboxAtLine(editor, message.line);
        break;
    }
  });

  // Clean up when panel is disposed
  panel.onDidDispose(() => {
    changeDisposable.dispose();
  });

  context.subscriptions.push(changeDisposable);
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
            line-height: 1.6;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }

        .progress-container {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .progress-header {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-editorWidget-foreground);
        }

        .progress-bar-container {
            background-color: var(--vscode-editorWidget-resizeBorder);
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            border-radius: 10px;
            transition: width 0.3s ease;
            width: 0%;
        }

        .progress-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .task-list-item {
            display: flex;
            align-items: flex-start;
            margin: 8px 0;
            cursor: pointer;
            transition: background-color 0.2s ease;
            padding: 4px;
            border-radius: 4px;
        }

        .task-list-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .md-checkbox {
            margin-right: 12px;
            margin-top: 2px;
            cursor: pointer;
            transform: scale(1.2);
        }

        .md-checkbox:hover {
            background-color: var(--vscode-inputOption-hoverBackground);
        }

        .task-text {
            flex: 1;
            word-wrap: break-word;
        }

        .task-list-item input:checked + .task-text {
            text-decoration: line-through;
            opacity: 0.7;
            color: var(--vscode-descriptionForeground);
        }

        ul, ol {
            padding-left: 0;
        }

        .task-list-item-container {
            list-style: none;
            margin: 4px 0;
        }

        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-editorLineNumber-activeForeground);
            margin-top: 24px;
            margin-bottom: 16px;
        }

        code {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }

        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
        }

        blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding-left: 16px;
            margin: 16px 0;
            color: var(--vscode-textBlockQuote-foreground);
        }

        .content-container {
            max-width: 800px;
        }
    </style>
</head>
<body>
    <div class="progress-container">
        <div class="progress-header">📊 Task Progress</div>
        <div class="progress-bar-container">
            <div id="progress-bar" class="progress-bar" style="width: ${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%"></div>
        </div>
        <div id="progress-text" class="progress-text">${stats.completed}/${stats.total} tasks completed (${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)</div>
    </div>
    
    <div class="content-container">
        <div id="root">${renderedContent}</div>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {
  // Cleanup when extension is deactivated
}

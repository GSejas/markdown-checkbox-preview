/**
 * Markdown Checkbox Preview - CodeLens Provider for Markdown Files
 * 
 * Purpose: Show toggle actions above checkbox lines in markdown files
 * Author: Claude Code Assistant
 * Date: 2025-09-01
 */

import * as vscode from 'vscode';

interface CheckboxItem {
  content: string;
  range: vscode.Range;
  checked: boolean;
  lineNumber: number;
}

export class CheckboxCodeLensProvider implements vscode.CodeLensProvider {
  private context: vscode.ExtensionContext;
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    console.log('[markdown-checkbox-preview] CheckboxCodeLensProvider constructed');
    
    // Refresh CodeLenses when document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'markdown') {
        this._onDidChangeCodeLenses.fire();
      }
    }, null, context.subscriptions);
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    if (token.isCancellationRequested) {
      return [];
    }

    // Only process markdown files
    if (document.languageId !== 'markdown') {
      return [];
    }

    // Check if CodeLens is enabled in settings
    const config = vscode.workspace.getConfiguration('markdown-checkbox-preview');
    const enableCodeLens = config.get<boolean>('enableCodeLens', true);
    
    if (!enableCodeLens) {
      return [];
    }

    console.log('[markdown-checkbox-preview] Providing CodeLenses for:', document.fileName);

    const codeLenses: vscode.CodeLens[] = [];
    const checkboxItems = this.findCheckboxItems(document);
    
    console.log(`[markdown-checkbox-preview] Found ${checkboxItems.length} checkboxes in ${document.fileName}`);

    for (const checkbox of checkboxItems) {
      // Create toggle command
      const toggleCommand = {
        title: checkbox.checked ? '$(check) Uncheck' : '$(circle-outline) Check',
        command: 'checkboxPreview.toggleCheckbox',
        arguments: [document.uri, checkbox.lineNumber]
      };

      // Position CodeLens at the beginning of the line
      const range = new vscode.Range(
        checkbox.range.start.line,
        0,
        checkbox.range.start.line,
        0
      );

      codeLenses.push(new vscode.CodeLens(range, toggleCommand));
    }

    return codeLenses;
  }

  resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens {
    // CodeLens is already resolved in provideCodeLenses
    return codeLens;
  }

  private findCheckboxItems(document: vscode.TextDocument): CheckboxItem[] {
    const items: CheckboxItem[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    console.log(`[markdown-checkbox-preview] Scanning ${lines.length} lines for checkboxes`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // More flexible regex to catch various checkbox formats
      const checkboxMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+\[([ xX])\]\s*(.*)$/);
      
      if (checkboxMatch) {
        const [fullMatch, indent, marker, checkState, content] = checkboxMatch;
        const checked = checkState.toLowerCase() === 'x';
        
        console.log(`[markdown-checkbox-preview] Found checkbox at line ${i + 1}: "${line.trim()}"`);
        
        const range = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, line.length)
        );

        items.push({
          content: content.trim(),
          range,
          checked,
          lineNumber: i
        });
      }
    }

    console.log(`[markdown-checkbox-preview] Total checkboxes found: ${items.length}`);
    return items;
  }
}
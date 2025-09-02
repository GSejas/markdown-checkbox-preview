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

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    console.log('[markdown-checkbox-preview] CheckboxCodeLensProvider constructed');
  }

  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    if (token.isCancellationRequested) {
      return [];
    }

    // Only process markdown files
    if (document.languageId !== 'markdown') {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const checkboxItems = this.findCheckboxItems(document);

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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const checkboxMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+\[([ xX])\]\s*(.*)$/);
      
      if (checkboxMatch) {
        const [, indent, marker, checkState, content] = checkboxMatch;
        const checked = checkState.toLowerCase() === 'x';
        
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

    return items;
  }
}
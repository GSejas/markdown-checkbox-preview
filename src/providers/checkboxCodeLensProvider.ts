/**
 * Markdown Checkbox Preview - CodeLens Provider for Markdown Files
 * 
 * Purpose: Show toggle actions above checkbox lines in markdown files
 * Author: Claude Code Assistant
 * Date: 2025-09-01
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';

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

    Logger.debug(`[CodeLens] Providing for ${document.fileName}`);

    const codeLenses: vscode.CodeLens[] = [];
    const checkboxItems = this.findCheckboxItems(document);
    
    Logger.debug(`[CodeLens] Found ${checkboxItems.length} checkboxes in ${document.fileName}`);

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
    const lines = text.split(/\r?\n/);

    Logger.debug(`[CodeLens] Scanning ${lines.length} lines for checkboxes`);

    // Regex: allow leading whitespace (nested items), match -, *, + or numbered lists,
    // then a checkbox [ ] or [x] (case-insensitive). Capture the rest of the content.
    const checkboxRe = /^\s*(?:[-*+]|\d+\.)\s+\[(?: |x|X)\]\s*(.*)$/;

    // We'll skip fenced code blocks (```), so we don't misinterpret diagram tokens like A[Node]
    let inFencedBlock = false;
    let fenceInfo = '';

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = rawLine;

      // Detect start/end of fenced code blocks: ``` or ```lang
      const fenceMatch = line.match(/^\s*```(.*)$/);
      if (fenceMatch) {
        // Toggle fenced block state
        inFencedBlock = !inFencedBlock;
        fenceInfo = fenceMatch[1] ? fenceMatch[1].trim() : '';
        Logger.debug(`[CodeLens] ${inFencedBlock ? 'Entering' : 'Exiting'} fenced block at line ${i + 1} ${fenceInfo ? `(lang=${fenceInfo})` : ''}`);
        continue;
      }

      if (inFencedBlock) {
        // Skip lines inside fenced blocks
        continue;
      }

      const m = line.match(checkboxRe);
      if (m) {
        const content = m[1] || '';
        // Determine checked state by inspecting the exact bracket content
        const checked = /\[[xX]\]/.test(line);

        Logger.debug(`[CodeLens] ✅ Found checkbox at line ${i + 1}: "${line.trim()}"`);

        const range = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, rawLine.length)
        );

        items.push({
          content: content.trim(),
          range,
          checked,
          lineNumber: i
        });
      } else if (line.trim() && line.includes('[') && line.includes(']')) {
        // Log lines that have bracket patterns but don't match our checkbox regex for debugging
        Logger.debug(`[CodeLens] ❌ Line ${i + 1} has brackets but doesn't match checkbox pattern: "${line.trim()}"`);
      }
    }

    Logger.debug(`[CodeLens] Total checkboxes found: ${items.length}`);
    return items;
  }
}
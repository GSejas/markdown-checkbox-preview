/**
 * Markdown Checkbox Preview - Hover Provider for Markdown Files
 * 
 * Purpose: Show toggle actions and checkbox info on hover over checkboxes
 * Author: Claude Code Assistant
 * Date: 2025-09-01
 */

import * as vscode from 'vscode';

interface CheckboxItem {
  content: string;
  range: vscode.Range;
  checked: boolean;
  lineNumber: number;
  indent: string;
  listMarker: string;
}

export class CheckboxHoverProvider implements vscode.HoverProvider {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    console.log('[markdown-checkbox-preview] CheckboxHoverProvider constructed');
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
    if (token.isCancellationRequested) {
      return undefined;
    }

    // Only process markdown files
    if (document.languageId !== 'markdown') {
      return undefined;
    }

    // Check if position is on a checkbox line
    const checkboxItem = this.findCheckboxAtPosition(document, position);
    if (!checkboxItem) {
      return undefined;
    }

    // Create hover content
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true; // Enable command links
    markdown.supportHtml = true;

    // Add checkbox status and info
    const statusIcon = checkboxItem.checked ? '✅' : '☑️';
    const statusText = checkboxItem.checked ? 'Checked' : 'Unchecked';
    
    markdown.appendMarkdown(`**${statusIcon} Checkbox: ${statusText}**\n\n`);
    
    if (checkboxItem.content) {
      markdown.appendMarkdown(`� **Content**: ${checkboxItem.content}\n\n`);
    }
    
    // Add toggle action
    const toggleText = checkboxItem.checked ? 'Uncheck' : 'Check';
    const toggleIcon = checkboxItem.checked ? '☐' : '☑️';
    
    // Create command URI for toggling
    const commandArgs = {
      uri: document.uri.toString(),
      line: checkboxItem.lineNumber
    };
    const encodedArgs = encodeURIComponent(JSON.stringify(commandArgs));
    const commandUri = `command:checkboxPreview.toggleCheckbox?${encodedArgs}`;
    
    markdown.appendMarkdown(`**Actions:**\n\n`);
    markdown.appendMarkdown(`${toggleIcon} [${toggleText} this item](${commandUri})  \n`);
    
    // Show line and position info
    markdown.appendMarkdown(`\n**Info:**\n`);
    markdown.appendMarkdown(`📍 Line ${checkboxItem.lineNumber + 1}  \n`);
    markdown.appendMarkdown(`🔤 Marker: \`${checkboxItem.listMarker}\`  \n`);
    
    if (checkboxItem.indent) {
      markdown.appendMarkdown(`↪️ Indented (${checkboxItem.indent.length} spaces)  \n`);
    }

    return new vscode.Hover(markdown, checkboxItem.range);
  }

  private findCheckboxAtPosition(document: vscode.TextDocument, position: vscode.Position): CheckboxItem | null {
    const line = document.lineAt(position.line);
    const lineText = line.text;
    
    // Check if this line contains a checkbox
    const checkboxMatch = lineText.match(/^(\s*)([-*+]|\d+\.)\s+\[([ xX])\]\s*(.*)$/);
    
    if (!checkboxMatch) {
      return null;
    }

    const [, indent, marker, checkState, content] = checkboxMatch;
    const checked = checkState.toLowerCase() === 'x';
    
    // Check if the position is within the checkbox area
    const checkboxStart = indent.length + marker.length + 1; // Start of checkbox [
    const checkboxEnd = checkboxStart + 3; // End of checkbox ]
    
    if (position.character >= checkboxStart && position.character <= checkboxEnd) {
      const range = new vscode.Range(
        new vscode.Position(position.line, 0),
        new vscode.Position(position.line, lineText.length)
      );

      return {
        content: content.trim(),
        range,
        checked,
        lineNumber: position.line,
        indent,
        listMarker: marker
      };
    }

    return null;
  }
}
import * as vscode from 'vscode';

export interface CheckboxItem {
  label: string;
  line: number;
  checked: boolean;
  level: number;
  parent?: CheckboxItem;
  children: CheckboxItem[];
}

export class CheckboxTreeItem extends vscode.TreeItem {
  constructor(
    public readonly item: CheckboxItem,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(item.label, collapsibleState);
    
    this.tooltip = `Line ${item.line + 1}: ${item.label}`;
    this.description = item.checked ? '✓' : '○';
    this.contextValue = 'checkbox';
    
    // Set icon based on checkbox state
    this.iconPath = item.checked 
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
      : new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.gray'));
    
    // Command to toggle checkbox when clicked
    this.command = {
      command: 'checkboxTree.toggle',
      title: 'Toggle Checkbox',
      arguments: [this.item]
    };
  }
}

export class CheckboxTreeDataProvider implements vscode.TreeDataProvider<CheckboxItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CheckboxItem | undefined | null | void> = new vscode.EventEmitter<CheckboxItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CheckboxItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private checkboxItems: CheckboxItem[] = [];

  constructor() {
    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.refresh();
    });

    // Listen for document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && event.document === activeEditor.document && event.document.languageId === 'markdown') {
        this.refresh();
      }
    });
  }

  refresh(): void {
    this.parseCheckboxes();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CheckboxItem): vscode.TreeItem {
    const hasChildren = element.children.length > 0;
    return new CheckboxTreeItem(
      element,
      hasChildren ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
    );
  }

  getChildren(element?: CheckboxItem): Thenable<CheckboxItem[]> {
    if (!element) {
      // Return root items (top-level checkboxes and headers)
      return Promise.resolve(this.checkboxItems);
    } else {
      // Return children of the given element
      return Promise.resolve(element.children);
    }
  }

  private parseCheckboxes(): void {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
      this.checkboxItems = [];
      return;
    }

    const document = activeEditor.document;
    const text = document.getText();
    const lines = text.split('\n');
    
    const items: CheckboxItem[] = [];
    const stack: CheckboxItem[] = []; // Stack to track hierarchy
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for headers
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        
        const headerItem: CheckboxItem = {
          label: headerText,
          line: i,
          checked: false,
          level: level,
          children: []
        };
        
        // Remove items from stack that are at same or deeper level
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
        
        // Add to parent if exists
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.children.push(headerItem);
          headerItem.parent = parent;
        } else {
          items.push(headerItem);
        }
        
        stack.push(headerItem);
        continue;
      }
      
      // Check for checkboxes
      const checkboxMatch = trimmed.match(/^[-*+]\s*\[([x\s])\]\s*(.+)$/i);
      if (checkboxMatch) {
        const isChecked = checkboxMatch[1].toLowerCase() === 'x';
        const taskText = checkboxMatch[2];
        
        // Determine indentation level
        const indentMatch = line.match(/^(\s*)/);
        const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) + 6 : 6; // Start after headers
        
        const checkboxItem: CheckboxItem = {
          label: taskText,
          line: i,
          checked: isChecked,
          level: indentLevel,
          children: []
        };
        
        // Find appropriate parent
        let parent: CheckboxItem | undefined;
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].level < indentLevel) {
            parent = stack[j];
            break;
          }
        }
        
        if (parent) {
          parent.children.push(checkboxItem);
          checkboxItem.parent = parent;
        } else {
          items.push(checkboxItem);
        }
      }
    }
    
    this.checkboxItems = items;
  }

  async toggleCheckbox(item: CheckboxItem): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    const document = activeEditor.document;
    const line = document.lineAt(item.line);
    const lineText = line.text;
    
    // Toggle checkbox state
    let updatedText = lineText;
    if (lineText.includes('[ ]')) {
      updatedText = lineText.replace(/\[ \]/, '[x]');
    } else if (lineText.match(/\[[xX]\]/)) {
      updatedText = lineText.replace(/\[[xX]\]/, '[ ]');
    }
    
    if (updatedText !== lineText) {
      await activeEditor.edit(editBuilder => {
        editBuilder.replace(line.range, updatedText);
      });
    }
  }

  getCompletionStats(): { completed: number; total: number } {
    let completed = 0;
    let total = 0;
    
    const countItems = (items: CheckboxItem[]) => {
      for (const item of items) {
        // Only count actual checkboxes, not headers
        if (item.level >= 6) { // Checkboxes have level 6+
          total++;
          if (item.checked) {
            completed++;
          }
        }
        countItems(item.children);
      }
    };
    
    countItems(this.checkboxItems);
    return { completed, total };
  }
}

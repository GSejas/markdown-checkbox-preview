import * as vscode from 'vscode';

export interface CheckboxItem {
  label: string;
  line: number;
  checked: boolean;
  level: number;
  parent?: CheckboxItem;
  children: CheckboxItem[];
}

/**
 * Tree view item that adapts a CheckboxItem model into a VS Code TreeItem.
 *
 * The constructor initializes the TreeItem label, tooltip and then configures
 * the visual appearance and click behavior based on whether the underlying
 * item represents a header (item.level < 6) or a checkbox (item.level >= 6).
 *
 * Remarks:
 * - For header items:
 *   - description is set to `H<level>`.
 *   - contextValue is set to `"header"`.
 *   - a file-like ThemeIcon (`symbol-file`) with the theme color
 *     `symbolIcon.textForeground` is used.
 *   - clicking the item triggers the `checkboxTree.navigateToHeader` command
 *     with the CheckboxItem as the argument.
 *
 * - For checkbox items:
 *   - description shows a check mark (`✓`) when checked or an open circle (`○`)
 *     when unchecked.
 *   - contextValue is set to `"checkbox"`.
 *   - icon uses `check` (green) when checked or `circle-outline` (gray) when not.
 *   - clicking the item triggers the `checkboxTree.toggle` command with the
 *     CheckboxItem as the argument.
 *
 * @param item - The underlying CheckboxItem model. Expected to contain at least:
 *               `label` (string), `line` (number), `level` (number), and
 *               `checked` (boolean) for checkbox entries.
 * @param collapsibleState - The initial collapsible state for this TreeItem.
 */
export class CheckboxTreeItem extends vscode.TreeItem {
  constructor(
    public readonly item: CheckboxItem,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(item.label, collapsibleState);
    
    this.tooltip = `Line ${item.line + 1}: ${item.label}`;
    
    // Determine if this is a header (level < 6) or checkbox (level >= 6)
    const isHeader = item.level < 6;
    
    if (isHeader) {
      // Header item - clicking navigates to that line
      this.description = `H${item.level}`;
      this.contextValue = 'header';
      this.iconPath = new vscode.ThemeIcon('symbol-file', new vscode.ThemeColor('symbolIcon.textForeground'));
      
      // Command to navigate to header line when clicked
      this.command = {
        command: 'checkboxTree.navigateToHeader',
        title: 'Go to Header',
        arguments: [this.item]
      };
    } else {
      // Checkbox item - clicking toggles state
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
}

/**
 * Provides a VS Code TreeDataProvider that parses markdown headers and task list checkboxes
 * from the active editor and exposes them as hierarchical tree items.
 *
 * The provider:
 * - Listens to active editor changes and document edits to refresh its tree.
 * - Parses markdown headers (1–6 `#`) as hierarchical nodes and task list items
 *   (`- [ ]`, `- [x]`, `* [ ]`, `+ [x]`, case-insensitive) as leaf or nested nodes.
 * - Uses a simple indentation and header-level heuristic to determine parent/child
 *   relationships between headers and checkboxes.
 *
 * Events:
 * - onDidChangeTreeData: Fired whenever the parsed tree changes (refresh).
 *
 * Parsing details / heuristics:
 * - Headers: lines matching /^(#{1,6})\s+(.+)$/ are converted to nodes where the header's
 *   level (1–6) is taken from the number of `#` characters.
 * - Checkboxes: lines matching /^[-*+]\s*\[([x\s])\]\s*(.+)$/i are treated as tasks.
 *   The item's "checked" state is taken from the bracket content (`x` = checked).
 * - Hierarchy:
 *   - Header nodes are nested according to header level (higher `#` count = deeper).
 *   - Checkbox indentation is approximated by counting leading spaces and converting
 *     to an indentation level; the implementation offsets checkbox levels so that
 *     header levels and checkbox levels do not collide (checkboxes are treated as
 *     deeper than headers by default).
 *
 * Usage:
 * - refresh(): Re-parses the active markdown document and fires onDidChangeTreeData.
 * - getTreeItem(element): Returns a TreeItem for the provided CheckboxItem,
 *   expanding nodes that have children.
 * - getChildren(element?): Returns root nodes when element is undefined, otherwise
 *   returns the provided element's children.
 * - toggleCheckbox(item): Toggles the checkbox state in the active editor by editing
 *   the corresponding line (replaces "[ ]" with "[x]" and vice versa).
 * - navigateToHeader(item): Moves the active editor selection to the item's line
 *   and reveals it in the center of the editor.
 * - getCompletionStats(): Returns an object { completed, total } counting only
 *   parsed checkbox items (not header nodes).
 *
 * Notes and limitations:
 * - Only operates when the active editor's languageId is 'markdown'.
 * - The indentation-to-level mapping for checkboxes is heuristic-based and may not
 *   match all markdown styles (e.g., tabs, mixed indentation, or complex nesting).
 * - The provider stores and updates a private checkboxItems array representing the
 *   current parsed tree; methods operate against the active editor's document lines
 *   and the cached tree.
 *
 * Example markdown that will be parsed:
 *   # Project
 *   - [ ] Task A
 *     - [x] Subtask A.1
 *   ## Notes
 *   * [ ] Note task
 *
 * @public
 */
export class CheckboxTreeDataProvider implements vscode.TreeDataProvider<CheckboxItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CheckboxItem | undefined | null | void> = new vscode.EventEmitter<CheckboxItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CheckboxItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private checkboxItems: CheckboxItem[] = [];
  // Whether header nodes should be shown in the tree view. Default: true
  private showHeaders: boolean = true;
  // Optional extension context used to persist state across sessions
  private context?: vscode.ExtensionContext;

  constructor(context?: vscode.ExtensionContext) {
    this.context = context;

    // Initialize persisted showHeaders flag when available
    if (this.context) {
      try {
        const persisted = this.context.workspaceState.get<boolean>('checkboxTree.showHeaders');
        if (typeof persisted === 'boolean') {
          this.showHeaders = persisted;
        }
      } catch (e) {
        // ignore persistence errors
      }
    }

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

  async toggleShowHeaders(): Promise<void> {
    // Toggle the visibility of header items, persist to workspaceState if available
    this.showHeaders = !this.showHeaders;
    if (this.context) {
      try {
        await this.context.workspaceState.update('checkboxTree.showHeaders', this.showHeaders);
      } catch (e) {
        // ignore persistence errors
      }
    }
    this.refresh();
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
    // If headers are hidden, promote their children up into the root list.
    if (!this.showHeaders) {
      const flattenHeaders = (nodes: CheckboxItem[]): CheckboxItem[] => {
        const out: CheckboxItem[] = [];
        for (const node of nodes) {
          if (node.level < 6) {
            // header: promote its children (recursively) to this level
            const promoted = flattenHeaders(node.children);
            for (const p of promoted) {
              p.parent = undefined;
              out.push(p);
            }
          } else {
            // checkbox: keep it, but ensure its children are processed
            if (node.children && node.children.length > 0) {
              node.children = flattenHeaders(node.children);
              for (const c of node.children) {
                c.parent = node;
              }
            }
            out.push(node);
          }
        }
        return out;
      };

      this.checkboxItems = flattenHeaders(items);
    }
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

  async navigateToHeader(item: CheckboxItem): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    const position = new vscode.Position(item.line, 0);
    const range = new vscode.Range(position, position);
    
    activeEditor.selection = new vscode.Selection(range.start, range.end);
    activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    
    // Focus the editor
    await vscode.window.showTextDocument(activeEditor.document, activeEditor.viewColumn);
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

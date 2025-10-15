import MarkdownIt from 'markdown-it';

/**
 * Renders a Markdown string into an HTML string with custom enhancements.
 *
 * This function uses `markdown-it` to parse and render the Markdown text. It includes several custom rules to add interactivity and metadata to the output HTML:
 *
 * 1.  **Clickable Headers**: It identifies headers (e.g., `# Header`) and adds attributes (`id`, `data-line`, `class`, `style`, `title`) to make them clickable. Clicking a header is intended to navigate the user to the corresponding line in the source editor.
 *
 * 2.  **Task List Items**: It parses GitHub-style task list items (e.g., `- [ ] task` or `- [x] task`). It converts them into HTML labels containing a checkbox and the task text. The checkbox is given a `data-line` attribute to link it back to its source line, enabling interactive toggling.
 *
 * 3.  **Line Numbering for Scroll Sync**: It adds a `data-source-line` attribute to all block-level elements. This is used to synchronize the scroll position of the rendered preview with the source editor.
 *
 * @param text - The Markdown string to be rendered.
 * @returns The rendered HTML string with the custom enhancements.
 */
export function renderMarkdown(text: string): string {

  const md = new MarkdownIt({ 
    html: false,
    linkify: true,
    typographer: true
  });

  // Custom rule to add click handlers to headers
  md.core.ruler.after('inline', 'clickable_headers', (state: any) => {
    const tokens = state.tokens;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.type === 'heading_open') {
        const inlineToken = tokens[i + 1];
        if (inlineToken && inlineToken.type === 'inline') {
          const lineNumber = token.map ? token.map[0] : 0;
          const headerId = `header-${lineNumber}`;
          
          // Add click handler and cursor style to the header
          token.attrSet('id', headerId);
          token.attrSet('data-line', lineNumber.toString());
          token.attrSet('style', 'cursor: pointer; transition: color 0.2s ease;');
          token.attrSet('class', 'clickable-header');
          token.attrSet('title', 'Click to navigate to this section in the editor');
        }
      }
    }
  });

  // Custom rule to handle task list items
  md.core.ruler.after('clickable_headers', 'task_list_items', (state: any) => {
    const tokens = state.tokens;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Look for list items that contain checkboxes
      if (token.type === 'list_item_open') {
        const nextToken = tokens[i + 1];
        if (nextToken && nextToken.type === 'paragraph_open') {
          const inlineToken = tokens[i + 2];
          if (inlineToken && inlineToken.type === 'inline') {
            const content = inlineToken.content.trim();
            const checkboxMatch = content.match(/^\[([x\s])\]\s*(.*)/i);
            
            if (checkboxMatch) {
              const isChecked = checkboxMatch[1].toLowerCase() === 'x';
              const taskText = checkboxMatch[2];
              const lineNumber = inlineToken.map ? inlineToken.map[0] : 0;
              
              // Replace the inline content with our custom checkbox HTML
              inlineToken.type = 'html_inline';
              inlineToken.content = `
                <label class="task-list-item">
                  <input type="checkbox" 
                         class="md-checkbox" 
                         data-line="${lineNumber}" 
                         ${isChecked ? 'checked' : ''}>
                  <span class="task-text">${md.utils.escapeHtml(taskText)}</span>
                </label>
              `;
              
              // Mark the list item as a task list item
              token.attrSet('class', 'task-list-item-container');
            }
          }
        }
      }
    }
  });

  // Add line numbers to all block-level elements for scroll sync
  md.core.ruler.after('task_list_items', 'add_line_numbers', (state: any) => {
    const tokens = state.tokens;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Add data-line to block-level opening tags
      if (token.type.endsWith('_open') && token.map && token.map.length > 0) {
        const lineNumber = token.map[0];
        token.attrSet('data-source-line', lineNumber.toString());
      }
    }
  });

  return md.render(text);
}


export function getTaskListCount(text: string): { total: number; completed: number } {
  const lines = text.split('\n');
  let total = 0;
  let completed = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*+]\s*\[[\sx]\]/i)) {
      total++;
      if (trimmed.match(/^[-*+]\s*\[x\]/i)) {
        completed++;
      }
    }
  }
  
  return { total, completed };
}

/**
 * Extracts checkbox states from markdown text
 * Returns array of {line: number, checked: boolean}
 */
export function extractCheckboxStates(text: string): Array<{ line: number; checked: boolean }> {
  const lines = text.split('\n');
  const checkboxes: Array<{ line: number; checked: boolean }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const checkedMatch = line.match(/^[-*+]\s*\[x\]/i);
    const uncheckedMatch = line.match(/^[-*+]\s*\[\s\]/i);
    
    if (checkedMatch || uncheckedMatch) {
      checkboxes.push({
        line: i,
        checked: !!checkedMatch
      });
    }
  }
  
  return checkboxes;
}

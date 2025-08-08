# Markdown Interactive Checkbox Preview

A VS Code extension that provides an interactive preview for Markdown checkboxes with live editing capabilities and hierarchical tree view navigation.

## Features

- **Interactive checkboxes** that can be clicked to toggle state
- **Live sync** - Changes are immediately synced back to the source Markdown file  
- **Progress tracking** with visual progress bar
- **Hierarchical tree view** in the Explorer sidebar showing all checkboxes organized by headers
- **Status bar integration** showing completion statistics
- **Theme integration** matching VS Code colors
- **Keyboard support** for accessibility

## Usage

### Interactive Preview
1. Open a Markdown file containing checkboxes
2. Use Command Palette: "Open Interactive Checkbox Preview"
3. Click checkboxes in the preview to toggle them
4. Changes are automatically saved to your file

### Tree View Navigation
1. Open a Markdown file with checkboxes
2. Look for "Markdown Checkboxes" section in the Explorer sidebar
3. Browse your tasks organized by headers and hierarchy
4. Click any checkbox in the tree to toggle its state
5. Use the refresh button to update the tree view

## Supported Syntax

```markdown
# Header 1
## Header 2
### Header 3

- [x] Unchecked task
- [x] Checked task
  - [x] Nested subtask
  - [x] Completed subtask
    - [x] Deeply nested task
```

## Installation

Install from the VS Code Extension Marketplace or use the .vsix file.

## Requirements

VS Code 1.84.0 or higher

## New Features in v0.0.1

- **🆕 Hierarchical Tree View**: Navigate all checkboxes in the Explorer sidebar
- **🆕 Status Bar Integration**: See completion stats at a glance
- **🆕 Nested Checkbox Support**: Handle indented/nested task lists
- **🆕 Header Organization**: Tasks grouped under their respective headers

## Release Notes

### 0.0.1

Initial release with interactive checkbox functionality and hierarchical tree view.

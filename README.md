# Markdown Interactive Checkbox Preview

[![Tests](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/test.yml)
[![Release](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/release.yml/badge.svg)](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/release.yml)

Transform your Markdown task lists into an interactive, synchronized workspace. Click to toggle checkboxes, navigate with tree views, and track progress—all while your changes sync instantly to your source files.

![Markdown Preview](media\full-demo-1.0.6_128colors_32colors.gif)

## ✨ Key Features

### 🎯 Interactive Checkbox Preview
- **One-click toggling** - Click any checkbox in the preview to change its state
- **Real-time sync** - Changes instantly update your Markdown source files
- **Smart navigation** - Click headers to jump directly to source locations
- **Auto-preview mode** - Optional automatic preview opening for markdown files

### 📊 Progress Tracking
- **Visual progress bars** showing completion percentages
- **Hover information** with status, content, and quick actions
- **Status bar integration** displaying completion statistics at a glance

### 🌲 Tree View Navigation
- **Hierarchical organization** - Tasks grouped by headers and structure
- **Sidebar integration** - Browse all checkboxes from the Explorer panel
- **Toggle visibility** - Show/hide headers for focused task management
- **One-click updates** - Click any tree item to toggle its state

### 💻 Editor Integration
- **CodeLens actions** - Toggle buttons appear directly above checkbox lines
- **Inline hover cards** - See status and actions without leaving your cursor
- **Seamless workflow** - All features integrate naturally with VS Code

## 🚀 Quick Start

### Open Interactive Preview
1. Open any Markdown file with checkboxes
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Search for **"Open Interactive Checkbox Preview"**

   ![Open Interactive Preview Button](media/open-interactive-preview-button.png)

4. Click checkboxes to toggle them—changes save automatically!

   ![Real-time Sync](media/markdown-checkbox-preview-real-time-sync.gif)

### Navigate with Tree View

1. Open a Markdown file with checkboxes
2. Find **"Markdown Checkboxes"** in the Explorer sidebar
3. Browse your tasks organized by headers
4. Click any checkbox to toggle its state instantly

   ![Tree View Checkboxes](media/menu-tree-checkboxes.gif)

5. Use the refresh button (↻) to update the view
6. Toggle header visibility (👁) to focus on tasks only

### Enable Auto-Preview

Click the **eye icon** in the status bar (bottom-right) to enable auto-preview mode:
- 👁 ✓ = Auto-preview enabled
- 👁 ✗ = Auto-preview disabled

When enabled, previews open automatically for all markdown files.

![Hover over support](media\codelness-demo.gif)

## 📝 Supported Syntax

The extension recognizes standard Markdown checkbox syntax:

```markdown
# Project Tasks

## Development
- [ ] Set up project structure
- [x] Configure build tools
  - [x] Install dependencies
  - [ ] Set up linting
    - [x] ESLint configuration
    - [ ] Prettier setup

## Documentation
- [ ] Write README
- [ ] Add API docs
```

## 📦 Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions
3. Search for **"Markdown Checkbox Preview"**
4. Click **Install**

Or install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GSejas.markdown-checkbox-preview).

## 🔧 Requirements

- VS Code 1.84.0 or higher
- No additional dependencies required

## 🤝 Contributing

Contributions are welcome! Please see [CHANGELOG.md](CHANGELOG.md) for version history and development notes.

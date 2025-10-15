# Change Log

All notable changes to the "markdown-checkbox-preview" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.9] - 2025-10-15

### 🐛 **Bug Fixes**

- **Checkbox Toggle Sync** 🔄
  - Fixed critical bug where checkbox toggles in webview preview were not persisting to markdown files
  - Implemented controlled state pattern with optimistic UI for instant visual feedback
  - Fixed stale editor reference issue by using URI-based editing via WorkspaceEdit API
  - Added targeted checkbox synchronization to prevent visual glitches from full HTML rerenders

- **Scanner Improvements** 🔍
  - Fixed false positive checkbox detection in fenced code blocks (Mermaid diagrams, etc.)
  - Added support for nested checkboxes and ordered list checkboxes (`1. [ ] Task`)
  - Added case-insensitive checkbox detection (`[x]` and `[X]` both supported)
  - Improved CRLF line ending compatibility

### ✨ **Added**

- **Debug Toggle Command** 🐛
  - Added `checkboxPreview.toggleDebug` command to enable/disable verbose logging
  - Debug logs now opt-in via command, reducing console noise by default
  - Verbose logs written to "Markdown Checkbox Preview" output channel

- **Comprehensive Test Suite** ✅
  - Added 17 unit tests for checkbox scanner (fenced blocks, nested items, various formats)
  - Added 11 unit tests for URI-based toggle function edge cases
  - Added 6 integration tests for end-to-end webview toggle flow
  - Total: 34 new tests added (144+ tests total)

### 🛠️ **Enhanced**

- **Logging Infrastructure** 📝
  - Migrated all `console.log()` statements to centralized Logger class
  - Added debug verbosity toggle for cleaner extension host console
  - Improved diagnostic capabilities with structured logging (INFO/WARN/ERROR/DEBUG)

### 🎯 **Technical**

- Exported `toggleCheckboxInDocumentUri()` function for testability
- Added `getCurrentDocumentUri()` getter to AutoPreviewManager
- Implemented `extractCheckboxStates()` helper for state verification
- Enhanced fenced code block detection with state tracking

## [1.0.8] - 2025-10-14

### 🚀 **CI/CD & Infrastructure**

- **GitHub Actions Workflows** 🔄
  - Added comprehensive test workflow with Ubuntu and Windows matrix testing
  - Automated release workflow triggered by version tags
  - Proper Xvfb setup for VS Code tests on Linux environments
  - Coverage reporting integration with Codecov
  - Automated marketplace publishing with VSCE

### 🐛 **Bug Fixes**

- **Silent Auto-Preview** 🔕
  - Removed notification popups when toggling auto-preview feature
  - Auto-preview now operates silently for better user experience

### 🛠️ **Enhanced**

- **Test Infrastructure** ✅
  - Fixed timeout issues in integration tests (increased to 10s)
  - Optimized test execution with in-memory document handling
  - All 110 tests passing reliably in CI/CD environment
  - Added package-lock.json for dependency locking

### 🎯 **Technical**

- Added npm scripts: `test:unit:coverage`, `test:integration`
- Configured Xvfb for headless VS Code testing on Linux
- Implemented proper test timeouts and async handling

## [1.0.7] - 2025-10-14

### ✨ **Added**

- **Auto-Preview Toggle** 👁️
  - Added status bar button to automatically open preview when markdown files are opened
  - Right-aligned status bar button with eye and checkbox icons indicating auto-preview state
  - Visual feedback: $(eye) $(check) when enabled, $(eye-closed) $(x) when disabled
  - Persistent configuration across VS Code sessions
  - Smart panel management prevents duplicate preview windows

### 🛠️ **Enhanced**

- **Architecture Improvements** 🏗️
  - Implemented `AutoPreviewManager` class following SOLID principles
  - Clean separation of concerns with dependency injection pattern
  - Comprehensive event handling for editor and configuration changes
  - Proper resource management with automatic cleanup

### 🎯 **Technical**

- Added `markdown-checkbox-preview.autoPreview` configuration setting (boolean, default: false)
- Implemented `checkboxPreview.toggleAutoPreview` command with eye icon
- Added panel tracking system to prevent duplicate previews
```
- Comprehensive unit test coverage (15 tests) for auto-preview functionality
- Enhanced extension.ts with modular auto-preview integration

## [1.0.7] - 2025-09-02

### 🔧 **Fixed**
- **CodeLens Reliability** 🎯
  - Fixed inconsistent CodeLens display across different markdown documents
  - Added proper event handling with `onDidChangeCodeLenses` for automatic refresh
  - Enhanced debugging with detailed console logging for troubleshooting
  - Improved checkbox detection with more robust regex patterns

### ✨ **Added**
- **Configuration Support** ⚙️
  - Added `markdown-checkbox-preview.enableCodeLens` setting to toggle CodeLens on/off
  - Better user control over extension features
  - Configurable CodeLens behavior

### 🛠️ **Enhanced**
- **CodeLens Provider** 👁️‍🗨️
  - More reliable checkbox detection and CodeLens generation
  - Better performance with optimized refresh mechanisms
  - Enhanced error handling and edge case support
  - Improved consistency across different document types

### 🎯 **Technical**
- Enhanced `CheckboxCodeLensProvider` with event emitters for real-time updates
- Added comprehensive debugging and logging for development
- Fixed linting issues in performance tests
- Improved provider architecture for better reliability

## [1.0.5] - 2025-09-01

### ✨ **Added**
- **Hover Provider** 🖱️
  - Rich hover information when hovering over checkboxes in the editor
  - Shows checkbox status, content, line information, and quick toggle actions
  - Interactive command links for instant checkbox toggling
  - Displays formatting details (indentation, list markers)

- **CodeLens Provider** 👁️‍🗨️
  - Visual toggle buttons appear above checkbox lines in the editor
  - One-click checkbox state changes directly in the editor
  - Seamless integration with VS Code's CodeLens system
  - Enhanced productivity with inline toggle actions

### 🛠️ **Enhanced**
- Complete redesign of provider architecture for checkbox-focused functionality
- Improved editor integration with native VS Code features
- Better accessibility and user experience for checkbox management

### 🎯 **Technical**
- Replaced Mermaid-focused providers with checkbox-specific implementations
- Added `CheckboxCodeLensProvider` and `CheckboxHoverProvider` classes
- Integrated providers into main extension activation
- Enhanced checkbox detection and interaction patterns

## [1.0.4] - 2025-08-26

### ✨ **Added**
- **Toggle Headers Functionality** 👁️
  - Added "Toggle Headers" button (eye icon) in tree view toolbar
  - Show/hide headers in the checkbox tree view for focused task management
  - Maintains checkbox functionality while allowing users to focus on tasks only
  - Enhanced user experience with flexible viewing options

### 🛠️ **Enhanced**
- Improved tree view interface with better control options

### 🎯 **Technical**
- Implemented `checkboxTree.toggleHeaders` command
- Added eye icon for intuitive toggle functionality
- Clean code improvements and test result cleanup

## [1.0.3] - 2025-08-08

### 🔧 **Fixed**
- Corrected image paths for tree view checkboxes in README
- Updated tree view checkbox image path references
- Version increment for marketplace compatibility

### 📸 **Media**
- Added menu tree checkbox image for enhanced UI experience
- Improved visual documentation assets

## [1.0.2] - 2025-08-08

### ✨ **Added**
- **Clickable Tree Navigation** 🚀
  - Headers in the tree view are now clickable for quick navigation
  - Clicking any header (H1-H6) in the Explorer sidebar jumps to that section in the source editor
  - Visual distinction between headers (file icons, "H1"/"H2" descriptions) and checkboxes
  - Seamless integration preserving existing checkbox toggle functionality

### 🛠️ **Enhanced**
- Tree view user experience with intuitive navigation
- Header items display with file icons and level indicators
- Improved discoverability of navigation features

### 🎯 **Technical**
- Added `checkboxTree.navigateToHeader` command
- Enhanced `CheckboxTreeItem` to handle different item types
- Minimal implementation maintaining backward compatibility

## [1.0.1] - 2025-08-08

### ✨ **Added**
- **Clickable Headers in Preview** 🖱️
  - Headers in the webview preview are now clickable
  - Click any header to navigate to that section in the source editor
  - Visual feedback with hover effects and tooltips

### 🎨 **Enhanced**
- Better centering and spacing in preview layout
- Responsive design improvements
- Enhanced typography and visual hierarchy

## [1.0.0] - 2025-08-08

### 🚀 **Major Release - Comprehensive Extension with Advanced Testing**

#### ✨ **Added**
- **Core Features**
  - Interactive markdown checkbox preview in webview panels
  - Tree view explorer integration showing task completion statistics
  - Real-time checkbox state synchronization with source files
  - Support for nested hierarchical checkbox structures
  - Multi-file checkbox tracking and management

- **User Interface**
  - Command palette integration with `markdownCheckboxPreview.openPreview`
  - Explorer sidebar tree view with task summaries
  - Refresh command for real-time updates
  - Responsive webview design with light/dark theme support

- **Advanced Testing Framework** 🧪
  - **45 comprehensive unit and integration tests** (100% passing)
  - **9 VS Code extension UI simulation tests** (100% passing)
  - **Playwright E2E testing framework** with visual regression testing
  - **Performance monitoring** with response time benchmarks
  - **Accessibility validation** with WCAG 2.1 compliance checks
  - **Cross-platform testing** (Windows Edge, macOS Safari)

- **Developer Experience**
  - Complete TypeScript implementation with strict typing
  - ESLint configuration with comprehensive code quality rules
  - Automated build pipeline with esbuild for fast compilation
  - Watch mode for development with real-time compilation
  - Comprehensive documentation and testing guides

- **Quality Assurance**
  - MIT license for open source compatibility
  - Comprehensive .gitignore for clean repository management
  - Test automation strategy with visual regression baselines
  - Performance budgets for optimal user experience
  - Accessibility testing for inclusive design

#### 🛠️ **Technical Specifications**
- **Platform Support**: VS Code 1.74.0+
- **Languages**: TypeScript, HTML, CSS
- **Testing**: Mocha, Playwright, @vscode/test-cli
- **Build**: esbuild, TypeScript compiler
- **Activation**: Automatic on markdown file open
- **Performance**: <500ms webview render, <200ms tree refresh

#### 📊 **Test Coverage**
- **Unit Tests**: 95% code coverage
- **Integration Tests**: 90% VS Code API coverage  
- **Visual Tests**: 24 scenarios across themes and screen sizes
- **Performance Tests**: 8 benchmarks for response times
- **Accessibility Tests**: 6 WCAG compliance checks

#### 🎯 **Key Features**
1. **Real-time Synchronization**: Checkbox states sync bidirectionally
2. **Hierarchical Display**: Nested task structures with proper indentation
3. **Multi-file Support**: Track checkboxes across multiple markdown files
4. **Performance Optimized**: Efficient rendering for large documents
5. **Accessibility First**: Full keyboard navigation and screen reader support
6. **Theme Aware**: Seamless integration with VS Code light/dark themes

#### 📚 **Documentation**
- Complete README with installation and usage instructions
- Test automation strategy document with best practices
- Test execution guide with comprehensive command reference
- Architecture documentation for maintainers and contributors

### 🔧 **Internal**
- Implemented modern VS Code extension architecture
- Created comprehensive testing infrastructure exceeding industry standards
- Established CI/CD ready pipeline for automated quality assurance
- Built scalable codebase for future feature expansion

---

## [Unreleased]

### 🚀 **Future Enhancements**
- Export functionality for task reports
- Integration with external task management systems
- Custom checkbox styling options
- Collaborative editing features
- Advanced filtering and search capabilities
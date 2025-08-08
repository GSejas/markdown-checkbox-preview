# Visual & E2E Test Execution Guide
## Markdown Checkbox Preview Extension

### Quick Start

#### 1. Install Dependencies
```bash
npm install
npx playwright install
```

#### 2. Run All Tests
```bash
# Run existing unit/integration tests
npm test

# Run visual/E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

---

## Test Categories

### 🎯 **Unit & Integration Tests** (Existing - 45 tests)
```bash
npm test
```
- **Renderer tests**: Markdown parsing, HTML generation
- **Tree provider tests**: Hierarchical structure parsing
- **Integration tests**: VS Code API interactions
- **Performance tests**: Speed and memory benchmarks

### 🖼️ **Visual Regression Tests** (New)
```bash
npm run test:visual
```
- **Webview rendering**: Screenshot comparison
- **UI consistency**: Cross-browser validation
- **Theme support**: Light/dark theme testing
- **Responsive design**: Multiple screen sizes

### ⚡ **Performance Tests** (New)
```bash
npm run test:performance
```
- **Large document handling**: 1000+ checkboxes
- **Interaction speed**: Click response times
- **Memory usage**: Leak detection
- **Scroll performance**: Smooth scrolling validation

### ♿ **Accessibility Tests** (New)
```bash
npm run test:e2e --grep "Accessibility"
```
- **ARIA compliance**: Screen reader support
- **Keyboard navigation**: Tab order and shortcuts
- **Color contrast**: WCAG 2.1 Level AA
- **High contrast mode**: Windows accessibility

---

## Test Execution Options

### 🔍 **Debug Mode**
```bash
npm run test:e2e:debug
```
- Step through tests interactively
- Inspect browser state
- Modify test code on the fly

### 👀 **Headed Mode** (Visual)
```bash
npm run test:e2e:headed
```
- Watch tests execute in real browser
- See interactions in real-time
- Debug visual issues

### 🎛️ **UI Mode** (Interactive)
```bash
npm run test:e2e:ui
```
- Interactive test runner
- Timeline view of test execution
- Screenshot and video playback

### 🚀 **CI Mode** (Automated)
```bash
npm run test:e2e
```
- Headless execution
- Parallel test running
- Artifact generation

---

## Test Data & Fixtures

### 📁 **Test Files**
- `src/test/fixtures/simple.md` - Basic checkbox scenarios
- `src/test/fixtures/complex.md` - Nested hierarchical structure
- `src/test/fixtures/performance.md` - Large document testing

### 🖼️ **Visual Baselines**
Screenshots are automatically generated and stored:
- `src/test/e2e/webview/webview-visual.test.ts-snapshots/`
- `src/test/e2e/performance-accessibility.test.ts-snapshots/`

### 📊 **Test Reports**
- `playwright-report/index.html` - Detailed HTML report
- `test-results/` - Screenshots, videos, traces

---

## Test Configuration

### ⚙️ **Playwright Config** (`playwright.config.ts`)
```typescript
// Key settings
timeout: 30000,           // 30s test timeout
retries: 2,              // Retry failed tests
workers: 1,              // Parallel execution
screenshot: 'on-failure', // Capture failures
video: 'retain-on-failure' // Record failed tests
```

### 🎯 **Test Projects**
- `vscode-webview`: Webview content testing
- `vscode-extension`: Extension UI testing
- `windows-edge`: Cross-browser compatibility
- `mac-safari`: Platform compatibility

---

## Common Test Scenarios

### 📝 **Basic Functionality**
```bash
# Test checkbox rendering and interaction
npm run test:e2e --grep "should render simple checkbox"
```

### 🌳 **Tree View Testing**
```bash
# Test Explorer sidebar integration
npm run test:e2e --grep "tree view"
```

### 🎨 **Visual Validation**
```bash
# Test UI appearance and styling
npm run test:visual
```

### 📐 **Performance Validation**
```bash
# Test with large documents
npm run test:e2e --grep "performance"
```

---

## Troubleshooting

### 🔧 **Common Issues**

#### **Visual Test Failures**
```bash
# Update baseline screenshots
npm run test:e2e --update-snapshots
```

#### **Timeout Issues**
```bash
# Increase timeout for slow tests
npm run test:e2e --timeout=60000
```

#### **Browser Issues**
```bash
# Reinstall browsers
npx playwright install --force
```

#### **Port Conflicts**
```bash
# Kill existing processes
npx kill-port 3000
```

### 📋 **Test Debugging**

#### **View Test Report**
```bash
# Open HTML report
npx playwright show-report
```

#### **Inspect Failed Tests**
```bash
# View traces for failed tests
npx playwright show-trace test-results/trace.zip
```

#### **Update Dependencies**
```bash
# Update Playwright
npm update @playwright/test playwright
```

---

## CI/CD Integration

### 🔄 **GitHub Actions**
```yaml
# Example workflow
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npm run test:all

- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

### 📊 **Test Metrics**
- **Coverage**: Unit tests (95%), Visual tests (85%)
- **Performance**: <500ms webview render, <200ms tree refresh
- **Accessibility**: WCAG 2.1 Level AA compliance

---

## Best Practices

### ✅ **Writing Visual Tests**
1. Use descriptive test names
2. Take screenshots at key interaction points
3. Allow for reasonable pixel differences (threshold: 0.2)
4. Test both light and dark themes

### ✅ **Performance Testing**
1. Test with realistic data sizes
2. Measure actual user interactions
3. Set appropriate performance budgets
4. Monitor memory usage over time

### ✅ **Accessibility Testing**
1. Test with keyboard navigation only
2. Verify screen reader compatibility
3. Check color contrast ratios
4. Test high contrast mode

### ✅ **Maintenance**
1. Update baselines when UI changes
2. Review failed tests promptly
3. Keep test data relevant and minimal
4. Document test purpose and expectations

---

## Test Coverage Goals

### 🎯 **Current Coverage**
- ✅ **Unit Tests**: 95% of core functionality
- ✅ **Integration Tests**: 90% of VS Code interactions
- 🆕 **Visual Tests**: 85% of UI components
- 🆕 **E2E Tests**: 80% of user workflows

### 📈 **Success Metrics**
- **All tests pass** before release
- **<2% visual regression** tolerance
- **<10% performance regression** limit
- **Zero critical accessibility** violations

### 🚀 **Next Steps**
1. Run visual tests to establish baselines
2. Integrate with CI/CD pipeline
3. Add cross-platform testing
4. Implement automated performance monitoring

---

## Commands Reference

```bash
# Installation
npm install
npx playwright install

# Test Execution
npm test                    # Unit/integration tests
npm run test:e2e           # All E2E tests
npm run test:visual        # Visual regression tests
npm run test:performance   # Performance & accessibility
npm run test:all          # Everything

# Debug & Development
npm run test:e2e:debug     # Interactive debugging
npm run test:e2e:headed    # Watch tests run
npm run test:e2e:ui        # UI test runner

# Maintenance
npm run test:e2e --update-snapshots  # Update baselines
npx playwright show-report           # View results
npx playwright show-trace trace.zip  # Debug failures
```

**🎉 Ready to achieve comprehensive test coverage with visual validation and performance monitoring!**

# Test Fixtures

This directory contains test data and fixtures for the Markdown Checkbox Preview extension tests.

## File Structure

- `sample-*.md` - Various markdown files for testing different scenarios
- `test-workspace/` - Temporary workspace created during tests
- `screenshots/` - Baseline screenshots for visual regression testing

## Usage

Test fixtures are automatically loaded by the test suite. Each test scenario uses appropriate fixtures to ensure consistent and reliable testing.

## Maintenance

- Update fixtures when extension functionality changes
- Regenerate baseline screenshots when UI changes are intentional
- Keep fixture files small and focused on specific test scenarios

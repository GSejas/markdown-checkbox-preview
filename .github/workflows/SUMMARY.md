# CI/CD Summary

## What Changed

Created simplified GitHub Actions workflows by removing bloat from inspiration files:

### Removed (Bloat):
- ❌ Mermaid CLI verification (wrong extension)
- ❌ Duplicate lint/build jobs
- ❌ Re-running full test suite in releases
- ❌ Overly complex coverage splitting

### Kept (Smart):
- ✅ Matrix testing (Ubuntu + Windows)
- ✅ VS Code test caching
- ✅ Changelog extraction
- ✅ Graceful E2E test failures

## Files Created

```
.github/workflows/
├── test.yml       # CI - runs on push/PR
├── release.yml    # CD - runs on tags
└── README.md      # Documentation
```

## Quick Start

```bash
# Development: Push triggers tests
git push

# Release: Tag triggers publish
git tag v1.0.11
git push --tags
```

## Optional Secrets

Add in GitHub repo settings → Secrets:
- `CODECOV_TOKEN` - For coverage reports
- `VSCE_PAT` - For marketplace publishing

Both workflows work without secrets (they're optional).

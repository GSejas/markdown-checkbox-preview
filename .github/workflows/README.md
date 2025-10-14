# GitHub Actions CI/CD

Simple, focused workflows for automated testing and releases.

## Workflows

### 🧪 test.yml - Continuous Integration

**Runs on:** Push to master/main, Pull Requests

**Matrix:** Ubuntu + Windows (parallel)

**Steps:**
1. Type-check (TypeScript strict mode)
2. Lint (ESLint)
3. Compile extension
4. Unit tests with coverage
5. Integration tests (E2E with VS Code)
6. Upload coverage to Codecov

**Duration:** ~5-10 minutes per OS

### 🚀 release.yml - Automated Releases

**Runs on:** Git tags (`v*.*.*`)

**Steps:**
1. Build production bundle
2. Package `.vsix` file
3. Extract version from tag
4. Extract changelog section
5. Create GitHub Release with VSIX
6. Publish to VS Code Marketplace

**Duration:** ~3-5 minutes

## Setup

### Required (Free)

Nothing! Push code and it works.

### Optional

**Coverage Reports:**
1. Sign up at [codecov.io](https://codecov.io)
2. Add repo secret: `CODECOV_TOKEN`

**Marketplace Publishing:**
1. Get PAT from [Azure DevOps](https://dev.azure.com/)
2. Add repo secret: `VSCE_PAT`

## Making a Release

```bash
# Update package.json version and CHANGELOG.md
npm version 1.0.11
git add package.json CHANGELOG.md
git commit -m "chore: release 1.0.11"
git tag v1.0.11
git push && git push --tags
```

Done! GitHub Actions handles the rest.

## Key Simplifications

Compared to inspiration files, removed:
- ❌ Separate lint/build jobs (redundant)
- ❌ Mermaid CLI checks (wrong extension)
- ❌ Re-running tests in release (trust CI)
- ❌ Complex coverage merging (use simple upload)

Kept the smart parts:
- ✅ Matrix testing (cross-platform validation)
- ✅ VS Code test caching (speed)
- ✅ Changelog extraction (automation)
- ✅ Continue-on-error for flaky E2E tests

## Badge

```markdown
![Tests](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/test.yml/badge.svg)
```

### 🚀 Release Workflow (`release.yml`)

**Triggers:**
- Git tags matching `v*.*.*` (e.g., `v1.0.10`)

**What it does:**
1. Run full test suite
2. Build extension with production settings
3. Package VSIX file
4. Extract version from tag
5. Extract changelog section for this version
6. Create GitHub Release with VSIX attachment
7. Publish to VS Code Marketplace (if `VSCE_PAT` secret is set)

**Duration:** ~5-7 minutes

## Setup Instructions

### 1. Basic Setup (No secrets needed)

The test workflow works out of the box! Just push to master or create a PR.

### 2. Coverage Reports (Optional)

To enable Codecov integration:

1. Sign up at [codecov.io](https://codecov.io) with your GitHub account
2. Add your repository
3. Copy the upload token
4. Add it to GitHub: `Settings → Secrets → Actions → New repository secret`
   - Name: `CODECOV_TOKEN`
   - Value: Your token

### 3. Marketplace Publishing (Optional)

To enable automatic marketplace publishing on releases:

1. Get a Personal Access Token from Azure DevOps:
   - Go to https://dev.azure.com/
   - User Settings → Personal Access Tokens
   - Create new token with **Marketplace (Publish)** scope
   - Copy the token

2. Add it to GitHub secrets:
   - Name: `VSCE_PAT`
   - Value: Your token

## Making a Release

### Automatic Release Process

1. **Update version** in `package.json`:
   ```json
   {
     "version": "1.0.10"
   }
   ```

2. **Update CHANGELOG.md** with new section:
   ```markdown
   ## [1.0.10] - 2025-10-14

   ### Added
   - New feature description

   ### Fixed
   - Bug fix description
   ```

3. **Commit changes:**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to 1.0.10"
   ```

4. **Create and push tag:**
   ```bash
   git tag v1.0.10
   git push origin master
   git push origin v1.0.10
   ```

5. **Wait for automation:**
   - GitHub Actions will automatically:
     - Run tests
     - Build VSIX
     - Create GitHub Release
     - Publish to marketplace (if configured)

### Manual Release (Alternative)

If you prefer manual control:

```bash
# Build and test locally
npm run package
npm test

# Create VSIX
npx @vscode/vsce package

# Publish manually
npx @vscode/vsce publish
```

## Monitoring

### View Workflow Status

- **Repository page:** Check the badge at the top of README.md
- **Actions tab:** See detailed logs for each run
- **Pull requests:** See status checks before merging

### Debugging Failed Workflows

1. **Open Actions tab** in GitHub
2. **Click the failed workflow**
3. **Expand the failed step** to see logs
4. Common issues:
   - **Type errors:** Fix TypeScript issues locally first
   - **Test failures:** Run `npm test` locally to reproduce
   - **Coverage upload:** Check if `CODECOV_TOKEN` is set (optional)
   - **Marketplace publish:** Check if `VSCE_PAT` is set (optional)

## Badge for README

Add this to your README.md:

```markdown
[![Tests](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/test.yml/badge.svg)](https://github.com/GSejas/markdown-checkbox-preview/actions/workflows/test.yml)
```

## Performance Tips

### Cache Optimization

Both workflows use npm cache:
- **First run:** ~3-4 minutes to install dependencies
- **Cached runs:** ~30-60 seconds to restore cache
- Cache is shared across branches

### Test Optimization

- **Unit tests:** Run on both OS (fast, ~2 min)
- **Integration tests:** Run on both OS but allowed to fail (slow, ~5 min)
- **Coverage:** Only uploaded once per matrix to save time

### Parallel Execution

The test matrix runs in parallel:
- Ubuntu + Windows jobs run simultaneously
- Total wall time = longest job (~10 min)
- Not sum of all jobs

## Troubleshooting

### Integration Tests Timeout on Ubuntu

If you see "Failed to launch VS Code" errors:

**Cause:** Xvfb display server not available
**Solution:** Already handled with `xvfb-run -a` command

### Integration Tests Flaky on Windows

**Current status:** Tests marked as `continue-on-error: true`
**Reason:** E2E tests can be flaky in CI environments
**Impact:** Won't block PR merges, but logs are still available

### VSIX Package Not Found

**Cause:** Build failed before packaging step
**Solution:** Check the "Build extension" step logs

### Marketplace Publish Skipped

**Cause:** `VSCE_PAT` secret not configured
**Status:** This is optional - release still succeeds
**Solution:** See "Marketplace Publishing" setup above

## Advanced Configuration

### Change Node Version

Edit the matrix in `test.yml`:

```yaml
matrix:
  node-version: [20.x, 22.x]  # Test multiple versions
```

### Add More Operating Systems

Edit the matrix in `test.yml`:

```yaml
matrix:
  os: [ubuntu-latest, windows-latest, macos-latest]
```

### Require All Tests to Pass

Remove `continue-on-error: true` from integration tests:

```yaml
- name: Run integration tests (Windows)
  run: npm run test:integration
  # Remove: continue-on-error: true
```

### Change Coverage Threshold

Add to `test.yml`:

```yaml
- name: Check coverage threshold
  run: |
    COVERAGE=$(grep -oP 'All files[^|]*\|[^|]*\s+\K[\d\.]+' coverage/lcov-report/index.html)
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80%"
      exit 1
    fi
```

## Migration from GitLab CI

If you're coming from GitLab CI:

| GitLab CI | GitHub Actions |
|-----------|----------------|
| `.gitlab-ci.yml` | `.github/workflows/*.yml` |
| `stages:` | `jobs:` (parallel by default) |
| `script:` | `run:` |
| `cache:` | `actions/cache@v4` |
| `artifacts:` | `upload-artifact@v4` |
| `rules:` | `if:` |
| `$CI_COMMIT_TAG` | `${{ github.ref }}` |

See `docs/inspiration/GITLAB_CI_GUIDE.md` for detailed comparison.

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [vsce Publishing Tool](https://github.com/microsoft/vscode-vsce)
- [Codecov Integration](https://docs.codecov.com/docs/quick-start)

---

**Questions?** Check the workflow logs or open an issue!

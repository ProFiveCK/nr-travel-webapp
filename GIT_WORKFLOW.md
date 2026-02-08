# Git Workflow & Branching Strategy

This document outlines the git branching strategy and workflow for the NR Travel Webapp project.

## Branch Strategy

We follow the **Git Flow** model with the following main branches:

### Main Branches

- **`main`** - Production-ready code
  - Protected branch
  - Only accepts pull requests from `release/*` branches
  - Every commit is tagged with a version
  - Deployed to production

- **`develop`** - Development branch
  - Integration point for features
  - Pre-release testing
  - Used for staging deployments
  - Base branch for feature development

### Supporting Branches

#### Feature Branches (`feature/*`)
```bash
git checkout -b feature/feature-name develop
```
- Branch from: `develop`
- Must merge back into: `develop`
- Naming: `feature/brief-description` (e.g., `feature/user-authentication`, `feature/email-notifications`)
- Delete after merge: Yes

#### Bugfix Branches (`bugfix/*`)
```bash
git checkout -b bugfix/bug-name develop
```
- Branch from: `develop`
- Must merge back into: `develop`
- Naming: `bugfix/brief-description` (e.g., `bugfix/login-error`)
- Delete after merge: Yes

#### Hotfix Branches (`hotfix/*`)
```bash
git checkout -b hotfix/issue-name main
```
- Branch from: `main`
- Must merge back into: `main` AND `develop`
- Naming: `hotfix/brief-description` (e.g., `hotfix/security-patch`)
- Delete after merge: Yes
- Increment patch version (e.g., 1.0.0 → 1.0.1)

#### Release Branches (`release/*`)
```bash
git checkout -b release/1.0.0 develop
```
- Branch from: `develop`
- Must merge back into: `main` and `develop`
- Naming: `release/x.y.z` (e.g., `release/1.0.0`)
- Delete after merge: Yes
- For release testing and minor bug fixes only

## Workflow

### Starting a New Feature

```bash
# Update develop with latest changes
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-feature develop

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push to remote
git push origin feature/my-feature
```

### Creating a Pull Request

1. Push your branch to remote
2. Go to GitHub/GitLab and create a Pull Request
3. Fill in the PR template with:
   - Clear description of changes
   - Related issue numbers (if applicable)
   - Testing steps
   - Screenshots (if UI changes)
4. Request reviewers
5. Address review comments
6. Merge once approved

### Merging to Main (Release)

```bash
# Create release branch
git checkout -b release/1.0.0 develop

# Update version numbers in package.json files
# Update CHANGELOG.md
# Test thoroughly

# When ready, merge to main
git checkout main
git pull origin main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# Also merge back to develop
git checkout develop
git pull origin develop
git merge --no-ff release/1.0.0
git push origin develop

# Delete release branch
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Emergency Hotfixes

```bash
# Create hotfix from main
git checkout -b hotfix/critical-fix main

# Fix the issue
git add .
git commit -m "fix: critical issue description"

# Merge to main
git checkout main
git merge --no-ff hotfix/critical-fix
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# Also merge to develop
git checkout develop
git merge --no-ff hotfix/critical-fix
git push origin develop

# Delete hotfix branch
git branch -d hotfix/critical-fix
git push origin --delete hotfix/critical-fix
```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding or updating tests
- **ci**: Changes to CI configuration
- **chore**: Changes to build process or dependencies

### Examples

```bash
# Feature
git commit -m "feat: add user authentication"
git commit -m "feat(auth): add JWT token refresh"

# Bug fix
git commit -m "fix: resolve login validation"
git commit -m "fix(api): handle null response in users endpoint"

# Documentation
git commit -m "docs: update DEVELOPMENT.md with macOS setup"

# Refactoring
git commit -m "refactor: extract user validation logic"

# Performance
git commit -m "perf: optimize database query for reports"
```

## Code Review Checklist

Before merging, ensure:

- [ ] Branch is up to date with `develop`
- [ ] All tests pass locally
- [ ] No console errors or warnings
- [ ] Code follows project style guide
- [ ] No hardcoded credentials or secrets
- [ ] Documentation updated if needed
- [ ] Database migrations tested (if applicable)
- [ ] At least 2 approvals from maintainers
- [ ] CI/CD pipeline passes

## Useful Git Commands

```bash
# View all branches
git branch -a

# Switch branch
git checkout branch-name

# Create and switch
git checkout -b branch-name

# Update branch with latest from main branch
git fetch origin
git rebase origin/develop

# View commit log in graph format
git log --oneline --graph --all --decorate

# Stash changes temporarily
git stash
git stash pop

# Check what changed
git diff develop...feature/my-feature

# Squash commits before merging
git rebase -i HEAD~3  # For last 3 commits

# Rename local branch
git branch -m old-name new-name

# Delete branch
git branch -d branch-name        # Local
git push origin --delete branch-name  # Remote

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Reset to previous commit (discard changes)
git reset --hard HEAD~1
```

## Versioning

We follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH-PRERELEASE+BUILD
  1    .  2    .  3      -alpha      +001
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes
- **PRERELEASE**: alpha, beta, rc (optional)

### Version Examples

- `1.0.0` - Initial release
- `1.1.0` - Added new features
- `1.1.1` - Bug fix
- `2.0.0` - Breaking changes
- `2.0.0-alpha.1` - Pre-release version

## Protection Rules

### Repository Settings to Enable

```
Branch protection for:
- main:
  - Require pull request reviews (2 approvals)
  - Require status checks to pass
  - Require branches to be up to date
  - Require code reviews from code owners
  - Restrict who can push (admins only)
  
- develop:
  - Require pull request reviews (1 approval)
  - Require status checks to pass
  - Require branches to be up to date
```

## CI/CD Integration

### GitHub Actions / GitLab CI

Automated checks on pull requests:

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] ESLint/TSLint passes
- [ ] Code coverage meets threshold
- [ ] Build succeeds
- [ ] Security scan passes

See `.github/workflows/` or `.gitlab-ci.yml` for configuration.

## Team Guidelines

1. **Always pull before push**: `git pull --rebase before git push`
2. **Use descriptive branch names**: Not `fix/stuff`, use `fix/login-button-alignment`
3. **Keep commits atomic**: One logical change per commit
4. **Write clear commit messages**: Future you will thank present you
5. **Review before merging**: Don't merge your own code
6. **Delete merged branches**: Keep repository clean
7. **Tag releases**: Always tag main branch releases
8. **Document breaking changes**: In PR description and CHANGELOG.md

## Troubleshooting

### Merge Conflicts

```bash
# See what's conflicting
git diff

# Edit conflicted files manually

# After resolving
git add .
git commit -m "resolve merge conflicts"
git push
```

### Accidentally Committed to Wrong Branch

```bash
# Create new branch with your commits
git branch feature/my-feature

# Reset main branch
git reset --hard origin/main

# Switch to new branch
git checkout feature/my-feature
```

### Need to Update Branch with Latest Changes

```bash
git fetch origin
git rebase origin/develop
git push -f origin feature/my-feature
```

### Cherry-pick a Commit

```bash
# Apply a specific commit from another branch
git cherry-pick <commit-hash>
```

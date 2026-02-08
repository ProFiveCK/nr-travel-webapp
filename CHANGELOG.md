# Changelog

All notable changes to the NR Travel Webapp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-08

### Added
- Initial production release
- User authentication with email/LDAP
- Application workflow and management
- Admin control panel
- Reviewer dashboard
- Minister dashboard
- File attachment support

### Fixed
- API route double-proxy bug (VITE_API_URL)

### Security
- JWT token authentication
- Password hashing with bcrypt
---

## [0.1.0] - 2026-01-15

### Added
- Project setup and scaffolding
- Base frontend and backend structure
- Development environment configuration
- Docker setup

---

## Guidelines for Contributors

When adding changes to this file:

### Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for security updates

### Format

Each version should have a level-2 heading (`##`) with the version number and date.

```markdown
## [1.2.0] - 2026-02-15

### Added
- Feature description
- Another feature

### Fixed
- Bug description
- Another bug

### Security
- Security patch description
```

### When to Update

Update the CHANGELOG.md:
1. When creating a release branch (`release/x.y.z`)
2. Move items from [Unreleased] to new version section
3. Add the release date
4. Commit with the version bump commit

### Versioning

Follow Semantic Versioning:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
  - Use when: API changes incompatibly, database schema changes require migration
  - Example: Complete redesign, major workflow changes

- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
  - Use when: New features added, existing features enhanced
  - Example: New application status type, new report feature

- **PATCH** (1.0.0 → 1.0.1): Bug fixes
  - Use when: Bugs fixed, minor improvements
  - Example: Login bug fixed, typo corrected

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | 2026-02-08 | Released | Initial production release |
| 0.1.0 | 2026-01-15 | Archived | Development version |

---

## Links

- **GitHub**: https://github.com/your-org/nr-travel-webapp
- **Documentation**: See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- **Git Workflow**: See [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)

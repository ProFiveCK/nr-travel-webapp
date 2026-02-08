# Changelog

All notable changes to the NR Travel Webapp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Changes that are in development but not yet released.

### Added
- New features in development

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes for unreleased features

### Deprecated
- Features that will be removed in a future version

### Removed
- Features that were removed

### Security
- Security improvements and vulnerability patches

---

## [1.0.0] - 2026-02-08

### Added
- Initial release of NR Travel Webapp
- User authentication and role-based access control (RBAC)
- Application submission workflow
- Admin dashboard and management interface
- Reviewer dashboard for application review
- Email notification system
- Department management
- User management
- Application status tracking
- File attachment support
- Settings management
- Docker containerization
- PostgreSQL database
- Redis caching
- Comprehensive logging

### Changed
- N/A (Initial release)

### Fixed
- N/A (Initial release)

### Deprecated
- N/A

### Removed
- N/A

### Security
- Implemented JWT authentication
- Password hashing with Argon2
- CORS protection
- Input validation
- SQL injection prevention
- Rate limiting

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

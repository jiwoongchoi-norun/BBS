# Changelog

## 1.0.3 - 2026-06-20

- Reworked pentest seed data to look like realistic community activity.
- Added varied users, admin accounts, a suspended account, profiles, categories, posts, comments, reactions, bookmarks, reports, hidden content, and attachments.
- Updated README and test plan with the realistic seed account list and usage notes.

## 1.0.2 - 2026-06-20

- Added a production Dockerfile for the Node.js application.
- Updated Docker Compose to run the app and PostgreSQL together.
- Added CI workflow for lint, formatting, audit, app load, and Playwright UI smoke checks.
- Added release workflow for GitHub Releases and GHCR Docker image publishing.
- Updated README with Quick Start, Docker, and versioning documentation.

## 1.0.1 - 2026-06-20

- Fixed default post ordering to use newest posts first.
- Fixed post list reaction/count field mapping on PostgreSQL.
- Added three-state sort header behavior: default, descending, ascending.
- Added Playwright UI smoke checks for desktop and mobile views.
- Updated setup and contributor documentation for PostgreSQL and UI checks.

## 1.0.0 - 2026-06-19

- Migrated the project from OracleDB to PostgreSQL.
- Added PostgreSQL Docker setup, schema, and sample data.
- Added post, comment, file upload, reaction, bookmark, report, and admin workflows.
- Added bcrypt password storage with legacy SHA-512 migration.
- Added CSRF protection, security headers, rate limiting, and PostgreSQL-backed sessions.
- Added open source project files: MIT license, security policy, and contribution guide.
- Added local pentest seed data generation with `npm run db:seed`.

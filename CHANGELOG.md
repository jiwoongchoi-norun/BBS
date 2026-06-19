# Changelog

## 1.0.0 - 2026-06-19

- Migrated the project from OracleDB to PostgreSQL.
- Added PostgreSQL Docker setup, schema, and sample data.
- Added post, comment, file upload, reaction, bookmark, report, and admin workflows.
- Added bcrypt password storage with legacy SHA-512 migration.
- Added CSRF protection, security headers, rate limiting, and PostgreSQL-backed sessions.
- Added open source project files: MIT license, security policy, and contribution guide.
- Added local pentest seed data generation with `npm run db:seed`.

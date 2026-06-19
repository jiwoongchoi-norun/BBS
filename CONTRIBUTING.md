# Contributing

Thanks for considering a contribution to BBS.

## Development Setup

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and fill in PostgreSQL settings.
4. Start PostgreSQL with `docker compose up -d postgres` or provide your own PostgreSQL instance.
5. Apply `scripts/schema.sql` and `scripts/sample-data.sql` for a fresh database.
6. Start the app with `npm start`.

## Quality Checks

Run these before opening a pull request:

```bash
npm run verify:app
npm run lint
npm run format:check
npm run ui:check
npm run audit
```

For security-sensitive changes, also run any available secret and static-analysis checks:

```bash
npm run security:secrets
npm run security:semgrep
```

## Pull Request Guidelines

- Keep changes focused on one feature or fix.
- Do not commit `.env`, uploaded files, logs, database dumps, or local IDE settings.
- Prefer existing route, repository, validation, and view patterns.
- Use repository helpers and bind variables for SQL input.
- Add or update documentation when behavior or setup changes.
- Include manual test notes for UI and database flows.

## Security Changes

Security fixes should be small, reviewable, and include reproduction notes when possible. Do not include real credentials, tokens, or private user data in commits, issues, or pull requests.

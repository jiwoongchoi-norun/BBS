# Security Policy

## Supported Versions

Security fixes are handled on the `main` branch until a stable release branch is introduced.

| Version | Supported |
| ------- | --------- |
| main    | Yes       |
| < main  | No        |

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub private vulnerability reporting or contact the maintainer privately with:

- affected route or feature
- reproduction steps
- expected and actual impact
- any relevant logs, request samples, or screenshots with secrets removed

Reports are reviewed on a best-effort basis. Confirmed issues are fixed in `main` and documented in the release notes or commit history.

## Security Baseline

The project currently includes:

- bcrypt password hashing
- session cookies with `httpOnly` and production `secure` mode
- CSRF protection on `/bbs` forms
- Oracle bind variables for database queries
- upload extension and MIME allowlists
- path validation for stored file downloads
- role checks for administrator routes

Production deployments should also configure HTTPS, a production session store, secure environment variables, request rate limiting, centralized logs, backups, and dependency scanning.

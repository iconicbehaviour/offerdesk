# Security policy

Offerdesk is a single-owner, self-hosted app. See [docs/SECURITY.md](docs/SECURITY.md) for its security model and Gmail/OAuth limits.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** (Security tab, "Report a vulnerability") rather than a public issue. Do not include real credentials, resumes or mailbox content in a report.

## For people running their own copy

- Never commit `.env`, the `data/` directory or any database file. They are in `.gitignore`.
- Use your own provider API keys and Google OAuth client. Rotate any key that was ever pasted into a chat, issue or screenshot.
- Keep the server on loopback or behind an authenticated HTTPS proxy.

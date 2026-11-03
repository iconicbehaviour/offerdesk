# Deploying Offerdesk privately

This repository is a portable single-owner Node application with a web interface, server API, and persistent local data. It is separate from the private Sites-hosted version. Use a continuously running Node 24+ server with persistent disk for the full application.

## Choose a host

A small VM, a private home server, or a container host with persistent volume support is appropriate. For remote access, put an HTTPS reverse proxy in front of the Node service and keep the Node port private. Use a process manager or container restart policy so the server restarts after failure or host reboot.

GitHub can store the source repository. **GitHub Pages alone cannot run the backend**: GitHub describes Pages as static HTML/CSS/JavaScript hosting. Pages cannot directly provide this Node process, private provider credentials, OAuth token storage, SQLite persistence, or unattended server tasks. A static frontend with a separately hosted backend is a different deployment that also needs explicit authentication, origin controls, and API configuration.

Do not put personal resumes, mailbox exports, tokens, runtime databases, or secret files in a public repository. Keep the source repository private while reviewing its contents.

## Install and configure

1. Install Node 24 or later and obtain the source archive/repository.
2. Run `npm ci`, then the repository's setup command and review the generated local configuration. Store generated passwords/keys privately. Never paste secret values into screenshots or issue reports.
3. Configure the deployment environment using `.env.example` and the main README. Required startup values are `APP_PASSWORD`, `SESSION_SECRET`, and `ENCRYPTION_KEY` (base64 encoding of 32 random bytes). Keep development and production keys separate. Configure `APP_URL` to the exact app origin. `HOST` defaults to `127.0.0.1` and `PORT` to `3000`. Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` and the corresponding model setting for actual model calls; a ChatGPT subscription does not substitute for a provider API key.
4. Run `npm test` and `npm run typecheck`, then `npm run build` and `npm start`.
5. Sign in as the owner, verify the app's connection states, and run a manual bounded refresh before enabling unattended execution.

The commands above describe the intended installation workflow; they do not claim that this document's author has deployed your server or authorized your providers. Use the repository's current scripts if their names change.

## Google OAuth setup

Use a Google Cloud project you control. Enable the Gmail API and configure an OAuth consent screen. Create a **Web application** OAuth client, set the server's client ID/secret, and register the exact callback URI:

`https://YOUR_PRIVATE_APP_ORIGIN/api/email/callback`

For local development, use the exact localhost callback for the port you run. The application URL and registered callback must agree, including scheme, hostname, port where applicable, and path. Use HTTPS for remote use.

Request only Gmail read access. Add your account as a test user if the OAuth project is in Testing. Google classifies `gmail.readonly` as restricted; external Testing refresh tokens with Gmail scope normally expire in seven days. Expect to reconnect. Before offering the app to other users, assess current verification and security-assessment requirements rather than assuming a personal development configuration is suitable for public distribution.

Grant access from the app's owner session. Before granting consent, verify that the Google account you authorize is the intended account. Run a small sync and inspect review proposals before relying on daily tracking. No live Google consent or real mailbox read is established by mocked tests.

## Persistence, backups, and recovery

Mount the configured runtime-data directory on persistent storage. Ephemeral container filesystems will lose the database, session/configuration state, and saved artifacts on replacement. Keep the SQLite database and any companion files together using a safe SQLite backup procedure; do not blindly copy a database during active writes.

Back up the database, artifact storage, deployment configuration, and required encryption key using appropriate access controls. Keep the encryption key separately protected from encrypted tokens. A restored database without its key cannot decrypt saved credentials; reconnect Gmail if recovery is impossible. Test restoration into an isolated instance before treating backups as reliable.

Protect and rotate owner credentials and provider API keys. Key rotation for stored encrypted tokens requires a deliberate migration or reconnection; replacing a key silently is not a working rotation strategy.

## Scheduling and time

An 8 a.m. workflow in the profile’s chosen timezone needs the server and scheduler to be running while the browser is closed. An open-page refresh timer is insufficient. The built-in scheduler is controlled by `SCHEDULE_ENABLED` and defaults to disabled. Enable it only after a successful manual run. An external scheduler may make an authenticated `POST /api/daily` with `Authorization: Bearer <SCHEDULER_TOKEN>`; keep the actual credential in a secret store, not this document. `ADMIN_API_TOKEN` also grants administrative access and should be reserved for administration. The `/mcp` endpoint requires `ADMIN_API_TOKEN`; it is not an anonymous public interface. Preserve the IANA timezone so daylight saving changes do not shift the intended local schedule.

Use a dedicated server-side schedule credential where required. Do not put it in a public browser bundle or commit it in a cron file. Prevent overlapping runs and keep idempotency keys so retries do not duplicate job records or email events. Record the last completed run and partial-source failures. The Friday review should use a stated reporting window and actual application events.

If the server is asleep at the scheduled time, a periodic process cannot execute. Select an always-on host or an external scheduler with authenticated access. A schedule saved in configuration is not evidence that a scheduled run succeeded.

## Final readiness check

Verify HTTPS and private owner access, durable writes after restart, manual job refresh with source status, reviewed resume/answer changes, immutable submission snapshots, Gmail reconnection behavior, and a real unattended run. Confirm that missing model credentials and disconnected Gmail are clearly displayed. Check the generated resume/export before submitting it to an employer.

## Official references

- [GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [Google OAuth web-server setup](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail scope classification and verification](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Google refresh-token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)

References checked November 3, 2026.

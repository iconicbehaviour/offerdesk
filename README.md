# Offerdesk v0.2.0

A private hiring workspace you personalize and run yourself. Bring your own resume, role targets, work-authorization constraints, model API access, and Gmail account. Your data belongs to your instance, not to the template author.

**This is a self-hosted app plus an assistant setup skill.** The skill guides ChatGPT/Codex or Claude Code through configuration. The app runs the dashboard, storage, integrations and scheduler. A repository URL alone does not install software, authenticate your assistant, or connect your accounts.

## Start here

Requires **Node.js 24 or later** and npm. Extract this source archive or clone your own repository, then run these commands inside its directory:

```sh
npm ci
npm run setup
npm run dev
```

Open **http://localhost:3000**. Read the generated `APP_PASSWORD` privately from your local `.env` to sign in. Do not paste the file or password into a conversation. Complete onboarding. All provider connections are optional; the app works as a manual tracker without model or email credentials.

For a production build:

```sh
npm test
npm run typecheck
npm run build
npm start
```

The server defaults to loopback-only access. Follow [deployment instructions](docs/DEPLOYMENT.md) before exposing it remotely. `npm run setup` preserves an existing `.env`.

## Give it to your assistant

Open this repository in Codex/ChatGPT with coding tools or Claude Code and ask:

> Set up Offerdesk for me using this repository. Follow the setup-offerdesk skill and guide me through onboarding. Use my own resume and goals, configure only the connections I choose, and tell me which features you actually verified. Start locally before deploying to a host I choose. Never copy another person's information or print my credentials.

- Codex-compatible project skill: `.agents/skills/setup-offerdesk/SKILL.md`.
- Claude Code project skill: `.claude/skills/setup-offerdesk/SKILL.md`.
- Cross-assistant project guidance: `AGENTS.md` and `CLAUDE.md`.

An ordinary chat without code execution or a connected deployment environment can explain the steps but cannot install or host this app for you. A ChatGPT/Claude subscription is not a provider API key. Use a supported secret-entry flow for credentials; never extract a browser session or subscription credential.

## What onboarding collects

| Section | Information |
| --- | --- |
| Profile and evidence | Display name, professional email, timezone, master resume text, explicit evidence confirmation |
| Target roles | Role titles, experience level, demonstrable skills |
| Geography and compensation | Locations, remote preference, relocation, optional salary minimum and currency |
| Work authorization | Country, status in your words, current authorization and future sponsorship yes/no/unknown, known expiration, employer constraints |
| Hiring goal | Desired offer date, weekly application target, daily available time |
| Referrals | Company, optional contact and notes |
| Job sources | Company and exact public Greenhouse or Ashby board handle |
| Connections | Model provider or none; Gmail authorized separately; daily scheduler opt-in |

No passport numbers, SSNs, immigration-document scans, birth dates, or medical details are required. Resume files should be converted to verified text before being used as model evidence; the browser supports plain text/Markdown input. Unknown work-authorization facts remain unknown.

## Consolidated campaign release

Start in **Today** for prioritized applications, referral requests, overdue follow-ups, interviews and proof work. Use **Campaign** to maintain contacts, outreach, interview practice, reusable answers and weekly targets. Your actual submissions and dated activities drive the Friday funnel review.

The configurable baseline is 50 applications, 35 outreach contacts, 15 follow-ups, 5 conversations, 3 practice sessions and 1 proof item per week. Role allocation defaults to implementation 35%, support 30%, customer technical 20% and product 15%. These are planning targets, not promised outcomes.

See [release coverage and limitations](docs/RELEASE-v0.2.0.md).

## Included workflows

- Daily opportunity board grouped by implementation, technical support, customer-facing technical work and product; searchable and filterable.
- Configurable public Greenhouse/Ashby sources. Optional Brave web discovery supplements these feeds; reviewed JSON imports accept opportunities from other sources. Search excerpts require employer, full-JD and opening verification.
- Profile-based, explainable rules ranking with referral signals and uncertainty. Scores are not hiring probabilities. Sponsorship is never inferred from historical filings or a form question.
- Dual-pane job-description and resume workspace, saved revisions, editable application answers, text and DOCX downloads, plus browser PDF printing. DOCX exports include content warnings; page length depends on your content.
- Explicitly recorded submissions freeze the submitted resume, JD and answers. Later edits preserve that history. Optimistic concurrency rejects stale overwrites.
- Conditional manager → resume/answer specialists → grounding reviewer. OpenAI and Anthropic adapters use your own configured API key/model. Proposals show evidence IDs and traces and require your approval.
- Read-only Gmail OAuth connection, bounded job-related synchronization, deduplicated message proposals, and human-confirmed tracker updates. Pasted email updates are also supported.
- An opt-in 08:00 scheduler in your profile's timezone, while the Node process remains running. Manual refresh is available without scheduling.
- Friday review metrics and notes, referral management, workspace export, and explicit connection status.
- A bearer-protected MCP endpoint for compatible coding clients; see [assistant integration](docs/ASSISTANT-INTEGRATION.md).

## Connect your services

**Optional web discovery:** set `BRAVE_SEARCH_API_KEY` privately and optionally `BRAVE_COUNTRY` to a supported two-letter country code (default US). Search web makes up to six queries per request and may incur provider charges. Results are reviewable candidates, not verified vacancies. Follow the [Brave API documentation](https://api-dashboard.search.brave.com/api-reference/web/search/get). Web discovery is manual; the daily scheduler refreshes configured ATS sources and email.


**Models:** configure `OPENAI_API_KEY` plus `OPENAI_MODEL`, or `ANTHROPIC_API_KEY` plus an available `ANTHROPIC_MODEL`, in the private runtime environment. Choose the matching provider in Profile. Missing configuration stays visibly disconnected. Model requests transmit the selected resume evidence, relevant job text and editing request to your chosen provider. The application does not reuse a ChatGPT or Claude website session.

**Gmail:** create your own Google OAuth Web application client, enable Gmail API, configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and register the exact callback `http://localhost:3000/api/email/callback` (or your own HTTPS origin plus that path). Use Connect Gmail in Settings. The requested scope is read-only. See [security and Google setup limits](docs/SECURITY.md), including Google's restricted-scope and Testing-mode requirements. Do not assume every user's OAuth client is approved for public distribution.

**Other email providers:** Outlook/Microsoft Graph and IMAP adapters are not included. Keep them disconnected; use manual email-text import until an adapter is implemented and verified.

**Scheduling:** after a successful manual refresh, set `SCHEDULE_ENABLED=true` in your private environment and restart the server. Your browser may be closed, but the server must remain running. An optional external scheduler can call `/api/daily` using a server-side schedule credential. Never put schedule tokens in the browser or a public workflow file.

## Hosting

Use a private Node 24 service with persistent disk, or the included Docker/Compose files. After running setup:

```sh
docker compose up --build -d
```

The Compose service exposes only the local host port; use HTTPS and an authenticated private deployment for remote access. Keep `.env` and the persistent data volume private.

GitHub can hold the source. **GitHub Pages alone cannot run the full app**: the API, SQLite storage, OAuth callbacks, private keys and unattended work need a backend. A Pages frontend plus a separately hosted backend requires additional origin/authentication configuration; it is not a supported single-click deployment of this release.

## Verification status and limits

This consolidated release includes deterministic campaign planning and conditional model-assisted editing. Automated tests use synthetic people, isolated temporary databases and mocked provider responses. A passing mock is not proof that your own Gmail consent, provider billing, host, reverse proxy, or future schedule works. Verify those after setup and report each connection separately.

News fetching and automatic scraping of hiring stories are not configured in this portable release. Saved sourced notes remain usable. Automatic discovery of every referral company’s ATS handle, Outlook, employer-specific application-form extraction, binary attachment archiving, and native ChatGPT OAuth connector registration remain future integration work. A skills file does not supply those integrations by itself.

The original author's private dashboard, resume, referrals, runtime data, Site identity and credentials are not part of this template. The downloaded source contains no pre-authorized account. Every installation starts independently.

## Project layout

- `web/`: React interface and onboarding.
- `server/`: Node API, SQLite store, model agents, sources, Gmail adapter and scheduler.
- `scripts/`: local setup and release packaging.
- `tests/`: synthetic and mocked integration checks.
- `docs/`: deployment, security and assistant integration.
- `.agents/skills/` and `.claude/skills/`: portable setup instructions.

The application code is MIT licensed. Bundled Inter font files retain their separate SIL Open Font License in `public/fonts/OFL.txt`. Third-party dependencies retain their respective licenses.

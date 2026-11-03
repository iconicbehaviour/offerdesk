# Offerdesk starter

Help the current user personalize and deploy this self-hosted application. Read README.md and the setup-offerdesk skill before changing configuration.

- This repository is a template, never a source of candidate facts. Start with /api/profile onboarding. Do not copy the author's identity, work history, referrals, visa category, location, deadline, application records, deployment IDs, or accounts.
- Obtain each user's confirmed resume and preferences. Keep resume facts separate from role requirements. Ask for missing dates or claims rather than inventing them.
- Use the user's own API credentials via supported secret configuration. A ChatGPT or Claude subscription/session is not an application API credential. Never extract browser/session credentials. Never print .env, OAuth tokens or secrets in chat, logs, screenshots or source.
- Google email access is read-only and granted through the user's own OAuth client. Do not send email, apply to jobs, accept offers or modify employer forms without a concrete explicit request. Ambiguous email events require human review.
- Preserve submitted resume/JD/answer snapshots. Apply chat revisions only after a visible review and explicit click. Preserve unrelated profile and application data.
- Be exact about capabilities: coded, configured, mock-tested, live-verified and scheduled are different states. Missing credentials must remain visible; never fabricate successful syncs.
- Review docs/DEPLOYMENT.md before publishing. Static GitHub Pages cannot run this backend, keep API keys, store SQLite or perform unattended email synchronization. Do not publish personal data or secrets to a public repo.
- Run npm test, npm run typecheck and npm run build. Test only with synthetic people and mocked integrations unless the user authorizes an actual connection.

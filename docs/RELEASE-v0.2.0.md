# Offerdesk v0.2.0 — consolidated campaign release

This portable package combines the hiring workspace and campaign execution tools. It does not modify a separately hosted installation or connect accounts automatically.

| Strategy requirement | Release behavior | Verification / boundary |
| --- | --- | --- |
| Morning plan | Today prioritizes overdue work, interviews, referrals and applications | Deterministic; generated tasks reconcile when opportunities change |
| Broader sourcing | Greenhouse/Ashby feeds, reviewed JSON imports, optional Brave discovery | Credentials required for Brave; excerpts are unverified candidates; no guarantee of all jobs or last-24-hour publication |
| Referrals | Editable companies and contacts; referral-first discovery queries and tasks | No messages sent automatically |
| Eligibility | Separate current authorization, STEM OPT and future sponsorship evidence | Unknown until sourced and dated; future dates do not count as verified; no legal determination |
| Qualification | Evidence-based A/B/C analysis and next actions | Self-rated card tier may be downgraded by analysis |
| Application workspace | Editable JD/resume/answers; text, DOCX and browser PDF | Employer form opens externally; no automatic form extraction/filling |
| Submitted materials | Immutable resume, JD and answer snapshots | Does not archive arbitrary binary attachments |
| Outreach | Contacts, initial contacts, follow-ups, referrals and conversations | User records activity; sending remains manual |
| Friday review | Dated activity counts, targets, role allocation, cohort funnel and small-sample warnings | Saved jobs are not counted as applications; insufficient data stays explicit |
| Preparation | Interview/mock records, proof-work tracking and reusable answers | User supplies truthful evidence and approves reuse |
| Email | Gmail read-only OAuth and human-reviewed status proposals | User credentials, consent and live verification required; Outlook not implemented |
| AI | Manager, specialist and grounding-review workflow | User OpenAI or Anthropic API credentials required; tests use mocked responses |
| News | Saved sourced notes | Automated F1/visa, hiring news and similar-candidate story monitoring not implemented |
| Scheduling | Optional 08:00 profile-timezone ATS/email refresh | Running persistent server required; no scheduled Brave discovery |
| Distribution | One Node 24 app, setup instructions, assistant skills, Docker and release script | Private backend required; GitHub Pages alone is insufficient; native ChatGPT OAuth connector not included |

## Upgrade and data preservation

Back up your private data directory and `.env` together before upgrading; encrypted Gmail tokens require the existing encryption key. Stop the old process, replace application source, retain private configuration and data, run `npm ci`, `npm run build`, and restart. Campaign collections initialize additively; existing drafts and submitted snapshots remain. No downgrade migration is provided. Never place private backups in the release archive.

## Acceptance checks

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests cover synthetic workspaces, immutable submissions, qualification evidence, action reconciliation, cohort metrics, imported-job deduplication, mocked discovery, model/email boundaries and DOCX structure. Provider billing, OAuth consent, real mailbox synchronization, hosting and unattended schedule execution must be verified on the user's installation. No live integrations are bundled or pre-authorized.

## First morning

1. Complete profile, truthful resume evidence, authorization constraints and offer deadline.
2. Configure targets, role allocation, referral companies and exact ATS handles.
3. Refresh sources or review imported/discovered opportunities; verify the full JD and eligibility.
4. Generate Today; review edits, apply externally and record the actual submitted version.
5. Record outreach and follow-ups, prepare interviews and review the funnel every Friday.

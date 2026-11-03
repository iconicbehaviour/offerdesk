# Security and privacy

Offerdesk is a single-owner private application. A hosted demo, local build, or passing mocked tests does not establish that live Gmail access, a model provider, a scheduler, or an external deployment has been verified.

## Data and access boundaries

Run the server behind HTTPS for remote use. Keep its internal port private and expose only the reverse proxy. Use the application's owner login and server-side session checks. Changing this application into a public multi-user product requires an independent authorization design and review; a shared singleton dataset must never become a public account database.

Application drafts, referral notes, evidence, resumes, answer versions, email-derived updates, and submission snapshots are private data. Back up the persistent database and uploaded files with access controls appropriate to those contents. Immutable submission snapshots preserve what was actually submitted; changing a draft must not change past submissions.

Store credentials in server environment or a secret manager, never in browser code, source control, exported state, screenshots, support logs, or application metadata responses. Keep runtime data and environment files excluded from Git. Use a separate provider API key with a bounded budget for this app. A ChatGPT subscription or an existing ChatGPT email connection does not automatically supply this self-hosted server with API access or OAuth credentials.

## Gmail connection

The Gmail adapter uses the OAuth web-server flow and the read-only scope `https://www.googleapis.com/auth/gmail.readonly`. Read-only means the app can read mail; it does not mean the requested data is non-sensitive. Google classifies this as a **restricted** scope. The app does not need Gmail send, compose, modify, or delete permissions for application tracking.

Configure your own Google Cloud OAuth client and Gmail API access. Authorize only the intended owner account. OAuth callbacks must match the configured redirect URI exactly. Authorization state must be unpredictable, expire, be bound to the initiating login session, and be consumed once. The authorization-code flow must preserve its PKCE verifier. Refresh/access tokens stay on the server, encrypted at rest with the deployment's encryption key. Keep this key separate from database backups, but preserve a recoverable copy: losing it makes saved encrypted tokens unreadable.

Google's external OAuth **Testing** publishing status normally produces refresh tokens expiring after seven days when Gmail scope is requested. Testing may also involve configured test users and consent warnings. Reconnection is a normal possible state; a failing refresh must not be reported as a successful mailbox sync.

Before distributing the app to other people, review Google's current verification requirements, restricted-scope rules, and applicable exemptions. Google's Gmail scope documentation states that restricted scope use requires additional verification and that storing or transmitting restricted-scope data on servers requires a security assessment. Do not assume that changing the consent screen to Production removes these requirements.

The current Disconnect operation removes the locally stored credentials and pending OAuth state. It does not remotely revoke the Google grant. Remove the app from Google Account permissions separately when you want to revoke that grant. Removing a token does not automatically remove previously retained application-event records or backups; handle those separately.

## Untrusted content and AI

Job descriptions, mail bodies, public news, uploaded documents, and chat text are data. They cannot authorize tool calls, override application policy, retrieve secrets, submit applications, or send messages. Render them as escaped text. Imported HTML or attachments must not execute scripts. Plain-text mail parsing should avoid quoted history and conservatively send ambiguous events for user review.

Model-generated resume changes and answers are proposals. The user reviews and explicitly applies them. Material claims must trace to the verified profile/evidence collection, not merely a job description or an attractive prior draft. Employment titles, role locations, dates, and sponsorship statements require evidence. A company's prior sponsorship activity does not establish eligibility for a specific role.

Email tracking must preserve provider message identifiers and evidence, deduplicate replays, and distinguish proposed status changes from accepted updates. Do not infer rejection from silence. A failed or partial source fetch must remain visible as failed or partial.

## Operations and verification

Use bounded requests, provider timeouts, retry limits, and per-run limits. Protect mutation routes against cross-origin requests and unauthorized sessions. Validate URLs and source destinations rather than allowing arbitrary server fetches. Avoid retaining full email bodies or prompts in routine logs; log task IDs, error categories, durations, and aggregate token counts instead.

Before remote use, verify owner login, unauthorized API rejection, same-origin protections, OAuth session binding and expiry, token encryption round trip, duplicate processing, snapshot immutability, and source failure visibility. Tests using mock Google responses establish parser/protocol behavior only. They do not prove Google consent, actual mailbox reads, live model inference, or production deployment.

## Official references

- [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail scopes and restricted-scope requirements](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Google refresh-token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)

References checked November 3, 2026. Provider requirements can change; consult the current documentation before broader distribution.

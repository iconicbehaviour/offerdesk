# Onboarding requirements

Collect only information needed to select jobs and prepare supported materials. Do not collect passport numbers, SSNs, immigration-document scans, birth date, health information, or provider credentials in profile fields.

| Group | Fields | Why |
| --- | --- | --- |
| Identity | Display name, professional email, IANA timezone | Greeting, resume header, schedules |
| Evidence | Master resume text; explicit confirmation that the supplied content may be used as source evidence | Grounded resume and answer drafts |
| Target work | Target role titles, skills, experience level | Search and fit ranking |
| Geography | Locations, remote/hybrid/onsite preference, willingness to relocate | Avoid unsuitable openings |
| Compensation | Optional minimum salary and currency | Flag missing or incompatible compensation |
| Authorization | Country, status in the user's words, current authorization yes/no/unknown, expiration if known, future sponsorship yes/no/unknown, employer constraints | Keep present eligibility and future needs distinct |
| Goal | Desired offer date, weekly application target, daily available minutes | Dashboard and review goals |
| Referrals | Company; optional contact/notes | Prioritize available introductions, not presumed commitments |
| Sources | Public ATS provider, company, exact board handle | Explicit coverage; no guessed URLs or unrestricted scraping |
| Connections | Chosen model provider; Gmail connected separately through consent | User-owned services, no baked-in accounts |
| Cadence | 08:00 local refresh; opt-in running scheduler | Correct timezone and honest unattended execution |

Keep unanswered optional fields blank and represent uncertain booleans as null. A user may update goals later; do not rewrite old submission snapshots. Model credentials and OAuth tokens belong in protected runtime configuration/storage, never in the profile or a public repository.

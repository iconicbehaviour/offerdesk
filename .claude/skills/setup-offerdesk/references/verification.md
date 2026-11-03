# Verification

1. Start with an empty instance. No author name, email, resume, company referrals, location or deadline should be prefilled.
2. Complete onboarding using synthetic evidence for a person outside New York. Confirm greeting, goal, role targets, location filtering and sources follow that profile.
3. Save a job and answer, record a synthetic submission, edit the draft, reload and verify the old submitted resume/JD/answers remain unchanged.
4. Run two saves with the same stale revision. The second must report a conflict rather than overwrite.
5. With no provider key, request a model edit. The UI must report unconfigured. Mocked provider tests are not proof of a live connection.
6. With explicit authorization and a configured model, request one short edit. Confirm evidence-linked proposal/reviewer result before applying. Preserve other answers and the previous revision.
7. With explicit Gmail authorization, confirm the account shown during Google consent, sync bounded job-related messages and inspect evidence-backed proposals. Replay the sync and confirm no duplicates. Unrelated or ambiguous messages must not silently change application stages.
8. Enable a scheduler only when the process will remain running. Test its callable updater and idempotency now; report a future scheduled execution as unverified until it actually runs.
9. Check export/source packaging excludes .env, data, SQLite files, tokens, local session cookies and private logs. Publish only sanitized template code.

# Existing local test accounts

The owner explicitly asked on 17 October 2026 to retain local testing accounts and reuse them in later sessions. Two working member accounts, Alice and Bob, are retained in Docker `quintaste-dev-db` (local PostgreSQL on `127.0.0.1:54329`). Both sign-ins were verified after the review fixtures were removed.

Their usernames, passwords, IDs and local session cookies are in `.local/place-detail-reviews/accounts.json`. This file is gitignored and excluded from deployments. Read it programmatically when needed; do not print or copy credentials into documentation, logs, commits, release archives or production. Cookies expire: refresh them using the saved username and password. Keep the JSON file and the database; do not delete these accounts in routine cleanup.

Before any account-based QA, read this file and use these accounts. Do not run the older community validation/cleanup scripts without inspecting them: some truncate local tables or remove test members. Never point a local QA helper at production.

For the place-review helper, start the existing local API on `http://localhost:18948` with `.local/community-dev/dev.env`, then run from the app repository:

```powershell
node .local/place-detail-reviews/validate.mjs --reset-fixtures
node .local/place-detail-reviews/validate.mjs
```

The reset removes only this suite's generated reviews, reports, blocks, restrictions, review-write limits and pagination fixtures. It preserves both member accounts, refreshes their sign-ins and updates the saved local cookies. The default validator reuses them; it does not register replacements. `--cleanup` also preserves these accounts. Run the reset after testing to leave a clean dataset.

Account creation requires explicit `--create-accounts`; first investigate missing credentials or local database state rather than registering replacements. The optional `--test-account-deletion` uses one disposable account specifically to verify deletion/cascades; it never deletes Alice or Bob. The earlier disposable Carol account was deleted during that test and is not an available reusable account. Pagination fixtures are disposable database records, not reusable sign-in accounts, and are removed after testing.

Retention evidence: `.local/place-detail-reviews/account-retention.json`. Review/API/browser/release evidence is in the same ignored directory.

# SENQUARA ONE — Cloudflare Android deployment

## 1. GitHub
Commit the project files to the branch used by the Cloudflare Worker Build.

## 2. D1
Open Cloudflare → D1 → `senquara-one-db` → Console.

For the existing database, run:

`database/current_db_finalize.sql`

The earlier user/status/terms ALTER commands are already applied in this working copy. If setting up a fresh database, use `database/schema_v2.sql` instead.

## 3. Worker
`wrangler.toml` points to:

- Worker entry: `worker/index.js`
- Assets: `public/`
- D1 binding: `DB`

The duplicate `worker/worker.js` is kept synchronized as a reference; it is not the Wrangler entrypoint.

## 4. Test
Open:

`/api/health`

Expected JSON contains `"ok":true` and `"version":"V3"`.

## 5. Registration test
- Create the first account.
- The first account becomes `owner` / Master and is active.
- Create a second account.
- The second account receives the Pending Approval screen.
- Log in with the first account and open Master Panel.
- Approve the second account.
- The second account can then log in.

## 6. Email verification
This V3 package does not claim that transactional email is configured. Cloudflare Email Service requires an onboarded sending domain and a `send_email` binding. Add that only after the domain is configured; then the authentication step can add single-use expiring verification links.

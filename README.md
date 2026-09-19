# SENQUARA ONE — Cloudflare Worker + D1

This package connects the SENQUARA ONE frontend to a Cloudflare Worker API and Cloudflare D1 database.

## 1. Create D1
Cloudflare Dashboard → Workers & Pages → D1 → Create database → `senquara-one-db`.
Copy the database ID into `wrangler.toml`.

## 2. Install Wrangler
Use Node.js 20+ and run:

`npm install -g wrangler`
`wrangler login`

## 3. Create schema
From this folder:

`wrangler d1 execute senquara-one-db --remote --file=database/schema.sql`
`wrangler d1 execute senquara-one-db --remote --file=database/seed.sql`

## 4. Secret
Do NOT put a production secret in public source control. Set it with:

`wrangler secret put APP_SECRET`

Remove the placeholder APP_SECRET from wrangler.toml after the secret is created.

## 5. Deploy
`wrangler deploy`

The Worker will serve the website and `/api/*` from the same origin.

## 6. Important
D1 is SQLite-compatible, not MySQL. This package uses D1 SQL. Do not paste MySQL schema into D1.

UPI is provider-neutral. Production UPI requires an authorized PSP/bank/payment provider, server-side credentials, callback/webhook verification and reconciliation. This package does not claim a direct NPCI production connection.

## 7. Test
Open `/api/health`. Then register a test account and check the Dashboard cloud connection. Never use real customer/payment data until security, backups, privacy, tax and payment-provider requirements are completed.

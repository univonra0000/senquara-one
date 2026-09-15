# SENQUARA ONE Cloudflare D1 Setup — Android-friendly

1. Open Cloudflare Dashboard.
2. Open **Workers & Pages → D1**.
3. Create database: `senquara-one-db`.
4. Copy the D1 database ID.
5. On a computer/Termux, install Wrangler and run `wrangler login`.
6. Put the ID into `wrangler.toml`.
7. Run the two D1 schema commands in README.
8. Set `APP_SECRET` with `wrangler secret put APP_SECRET`.
9. Run `wrangler deploy`.
10. Open the Worker URL and test `/api/health`.
11. Register a TEST account.
12. Add a customer/product.
13. Press Sync. The record is then stored in D1.

Never send Cloudflare passwords, API tokens, database IDs plus secrets, or payment credentials in chat.

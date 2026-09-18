# SENQUARA ONE — Master Admin / Admin / Staff

## Files changed
- `worker/index.js` — active Cloudflare Worker (`wrangler.toml` points here). Adds authenticated role enforcement, registration approval, user creation, status, role and block/unblock APIs, presence protection, and audit logging.
- `public/js/senquara-auth.js` — single login/register flow using `senquara_access_token`, role badge, role-based navigation, Master Admin Users & Roles screen, add user, block/unblock, role change, logout.
- `public/index.html` — adds the Master Admin-only Users & Roles page and loads the auth module.
- `database/schema_v2.sql` — default role changed to `staff` for new schema installs.
- `database/roles_migration_v1.sql` — one-time migration for an existing D1 database; maps legacy roles to the new three-role model.
- `database/seed.sql` — seeds the three supported roles.

## Role model
- `master_admin`: full control, including users, roles, blocking, settings and audit.
- `admin`: normal business operations; cannot change roles or block users.
- `staff`: day-to-day operational access; cannot access Master Admin controls.

## First account
The first registration becomes `master_admin` and is active immediately. Later registrations become `staff` + `pending` and require Master Admin approval.

## Deployment
1. Apply the existing schema if this is a fresh database.
2. For an existing database, run `database/roles_migration_v1.sql` carefully. If an `ALTER TABLE ... duplicate column` message occurs, that column already exists; continue with the remaining statements.
3. Configure the Cloudflare Worker `APP_SECRET` secret.
4. Deploy with the existing `wrangler.toml`.

Business records in the current dashboard are still browser-local (`localStorage`). The role system protects the authenticated server APIs, but moving products/customers/invoices fully to D1 is a separate step if those records must be server-enforced across devices.

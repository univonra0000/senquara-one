FIRST MASTER ADMIN SETUP

No bootstrap endpoint is used.
No Bootstrap CSS framework is used.

1. Deploy the project.
2. In Cloudflare D1 Console, run:
   database/first_master_admin.sql
3. Open the login page.
4. Select Master Admin.
5. Email: admin@senquara.one
6. Temporary password: admin
7. After login, change the password immediately.

The SQL uses INSERT OR IGNORE and does not delete existing records.
If the admin email already exists, it will not overwrite that account.

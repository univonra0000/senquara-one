SENQUARA ONE — AUTHENTICATION

Authorized Master account configured in this package:
Email: univonra@gmail.com
Password: the authorized password supplied by the project owner.

The password is stored only as a PBKDF2-SHA256 hash + salt in D1.

IMPORTANT:
1. Run database/set_master_credentials.sql on the existing D1 database if you need to establish/update this Master account.
2. The Worker requires the APP_SECRET Cloudflare Worker Secret for login tokens.
3. Do not put APP_SECRET in public JavaScript or commit it to GitHub.
4. After deployment, select “Master Admin” on the login screen.

# SENQUARA ONE authentication v2

## First login
If the D1 users table is empty, the Worker accepts **admin@senquara.one / admin** once as the bootstrap Master Admin. It immediately sets `must_change_password=1`; the user must change the password. Do not reuse the default password in production.

## Google account linking
Create a Google OAuth Web Client ID and put it in the `google-client-id` meta tag in `public/index.html`. Also configure `GOOGLE_CLIENT_ID` as a Cloudflare Worker secret/variable. Google Identity Services supplies the credential; the Worker verifies the ID token audience before linking it.

## Live users
Presence stores the connecting IP and Cloudflare-provided approximate country/region/city/coordinates, timezone, colo and user-agent. Coordinates are approximate IP geolocation, not GPS. The dashboard provides a Google Maps link when coordinates are available.

SENQUARA ONE — Dashboard & Invoice Workspace Upgrade

The active public UI is upgraded while the existing database and Cloudflare Worker structure is retained.

Features:
- Clean responsive dashboard with sales, invoices, customers and inventory cards.
- Quick actions and monthly sales chart.
- Product master: SKU, HSN/SAC, price, GST, stock, edit/delete.
- Customer master: GSTIN, address, state/city, edit/delete.
- Guided GST invoice workflow with intra-state CGST/SGST and inter-state IGST.
- Invoice number/date/customer/place of supply/reverse charge.
- A4 GST invoice preview with header, item table, totals, amount in words and footer.
- Print / Save as PDF through the browser print dialog.
- Single and multiple invoice printing.
- Word (.doc) and Excel (.xls) exports.
- Invoice search, detail view and payment status.
- Inventory alerts and stock adjustment.
- Finance and GST reporting.
- Business/tax settings and JSON backup/clear tools.
- Live user count in the top bar.
- Live users page with green online, white offline, red problem and pink 6+ months status.
- Approximate Cloudflare IP/Geo location map when coordinates are available.
- Owner-only Block/Unblock controls backed by the Worker API.
- Presence heartbeat and blocked-login protection.

Important:
- Browser PDF export uses Print -> Save as PDF; no server-side PDF binary dependency is added.
- IP geolocation is approximate and may identify an ISP/city rather than a person's exact location.
- Existing legacy files are retained in the package, but public/index.html now loads dashboard-v2.css and dashboard-v2.js.
- Presence routes are active in worker/index.js and create/upgrade the presence table automatically.

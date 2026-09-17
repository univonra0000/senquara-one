SENQUARA ONE — MERGED UI + GST PRINT/EXPORT UPGRADE

Files to commit:
- public/index.html  (merged script link; existing app structure preserved)
- public/css/app.css (existing CSS + light shadows/responsive modal polish)
- public/js/print-tools.js (printer, paper size, copies, single/multiple invoice, PDF, Word, Excel)

Important:
- Existing app.js is NOT replaced.
- Existing country/state/tax/master values are not duplicated.
- Printer selection is saved locally.
- Actual printing uses Android/Chrome's print dialog.
- Bluetooth/network printer options are preferences; direct ESC/POS support varies by printer/browser.
- Word export is .doc HTML-compatible; Excel export is .xls HTML-table compatible.
- For multiple invoices, select invoice checkboxes before Print/PDF/Word/Excel.

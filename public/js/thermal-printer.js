/* SENQUARA ONE — Invoice + QR + Thermal Printer helper
   Add after app.js in public/index.html.
*/
(function () {
  "use strict";

  const STYLE_ID = "senquara-thermal-printer-style";
  const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/";

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getBusiness() {
    try {
      const raw = localStorage.getItem("senquara_one_workspace_v3");
      const s = raw ? JSON.parse(raw) : {};
      return s.business || {};
    } catch (_) {
      return {};
    }
  }

  function qrUrl(text) {
    return QR_BASE + "?size=240x240&data=" + encodeURIComponent(text);
  }

  function invoiceFromRow(row) {
    const cells = Array.from(row.querySelectorAll("td"))
      .map(td => (td.textContent || "").trim());
    if (!cells.length || row.textContent.includes("No records yet.")) return null;
    return {
      reference: cells[0] || "Invoice",
      mode: cells[1] || "",
      amount: cells[2] || "0",
      status: cells[3] || ""
    };
  }

  function printInvoice(invoice, width) {
    const b = getBusiness();
    const mm = width === 58 ? 58 : 80;
    const amount = String(invoice.amount || "0").replace(/[^\d.]/g, "");
    const upi = "upi://pay?pa=&pn=" +
      encodeURIComponent(b.name || "SENQUARA ONE") +
      "&am=" + encodeURIComponent(amount) +
      "&cu=INR&tn=" + encodeURIComponent(invoice.reference || "Invoice");

    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow pop-ups for SENQUARA ONE printing.");
      return;
    }

    win.document.write(`<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(invoice.reference)}</title>
<style>
@page{size:${mm}mm auto;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000}
body{width:${mm}mm;padding:3mm;font-family:monospace;font-size:11px;line-height:1.35}
.center{text-align:center}.row{display:flex;justify-content:space-between;gap:3mm}
.logo{font-size:17px;font-weight:800}
hr{border:0;border-top:1px dashed #000;margin:2mm 0}
.qr{display:block;width:34mm;height:34mm;margin:3mm auto 1mm}
.small{font-size:9px}
.no-print{margin-top:4mm;font-family:Arial,sans-serif}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="center logo">${esc(b.name || "SENQUARA ONE")}</div>
<div class="center">${esc(b.owner || "")}</div>
<hr>
<div class="row"><span>INVOICE</span><b>${esc(invoice.reference)}</b></div>
<div class="row"><span>Mode</span><span>${esc(invoice.mode)}</span></div>
<div class="row"><span>Status</span><span>${esc(invoice.status)}</span></div>
<hr>
<div class="row"><b>TOTAL</b><b>₹${esc(invoice.amount)}</b></div>
<hr>
<div class="center">
<img class="qr" src="${esc(qrUrl(upi))}" alt="UPI QR">
<div class="small">Scan to pay</div>
<div class="small">${esc(invoice.reference)}</div>
</div>
<hr>
<div class="center small">Thank you</div>
<div class="no-print center">
<button onclick="window.print()">Print</button>
<button onclick="window.close()">Close</button>
</div>
</body></html>`);
    win.document.close();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/css/thermal-printer.css";
    document.head.appendChild(link);
  }

  function mount() {
    ensureStyle();
    const table = document.querySelector(".table");
    if (!table || !table.tBodies.length) return;

    table.querySelectorAll("tbody tr").forEach(row => {
      if (row.querySelector(".senquara-print-cell")) return;

      const cells = row.querySelectorAll("td");
      if (!cells.length) return;

      const actionCell = cells[cells.length - 1];
      const invoice = invoiceFromRow(row);
      if (!actionCell || !invoice) return;

      const wrap = document.createElement("span");
      wrap.className = "senquara-print-cell";

      [58, 80].forEach(mm => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "soft-btn";
        btn.textContent = mm + "mm Print";
        btn.onclick = () => printInvoice(invoice, mm);
        wrap.appendChild(btn);
      });

      actionCell.appendChild(wrap);
    });
  }

  window.SENQUARA_PRINT_INVOICE = printInvoice;
  window.SENQUARA_THERMAL_MOUNT = mount;

  new MutationObserver(() => requestAnimationFrame(mount))
    .observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", mount);
  setInterval(mount, 1500);
})();

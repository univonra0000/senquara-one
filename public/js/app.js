const KEY="senquara_one_v2";
const state=JSON.parse(localStorage.getItem(KEY)||'{"products":[],"customers":[],"invoices":[],"settings":{"businessName":"SENQUARA ONE","businessContact":"One Platform. Everything Connected."}}');
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(Number(n)||0);
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

function today(){return new Date().toISOString().slice(0,10)}
function nextInvoice(){return "INV-"+String(state.invoices.length+1).padStart(5,"0")}
$("invoiceDate").value=today(); $("invoiceNo").value=nextInvoice();

function openView(id){
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 $(id).classList.add("active");
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
 closeDrawer(); if(id==="billing") renderItems(); if(id==="products") renderProducts(); if(id==="customers") renderCustomers(); if(id==="invoices") renderInvoices(); if(id==="ipmodel") loadIP(); updateDashboard();
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>openView(b.dataset.view));
document.querySelectorAll("[data-open-billing]").forEach(b=>b.onclick=()=>openView("billing"));
$("menuBtn").onclick=()=>{ $("drawer").classList.add("open"); $("scrim").classList.add("show") };
$("closeMenu").onclick=$("scrim").onclick=closeDrawer;
function closeDrawer(){$("drawer").classList.remove("open");$("scrim").classList.remove("show")}

function productOptions(){
 return '<option value="">Select product</option>'+state.products.map((p,i)=>`<option value="${i}">${esc(p.name)} — ${money(p.rate)} — GST ${p.gst}%</option>`).join("");
}
function renderItems(){
 const wrap=$("items");
 if(!wrap.children.length) addItem();
 [...wrap.children].forEach(row=>{
   const sel=row.querySelector(".product");
   const idx=sel.value;
   if(idx!=="" && state.products[idx]){
     const p=state.products[idx];
     row.querySelector(".rate").value=p.rate;
     row.querySelector(".gst").value=p.gst;
   }
 });
 calc();
}
function addItem(){
 const row=document.createElement("div"); row.className="item";
 row.innerHTML=`<div class="item-grid">
   <label class="wide">Product<select class="product">${productOptions()}</select></label>
   <label>Qty<input class="qty" type="number" min="0.01" step="0.01" value="1"></label>
   <label>Rate<input class="rate" type="number" min="0" step="0.01" value="0"></label>
   <label>GST %<input class="gst" type="number" min="0" max="100" step="0.01" value="18"></label>
   <button type="button" class="remove">Remove</button>
 </div>`;
 row.querySelector(".product").onchange=()=>{
   const p=state.products[row.querySelector(".product").value];
   if(p){row.querySelector(".rate").value=p.rate;row.querySelector(".gst").value=p.gst}
   calc()
 };
 row.querySelectorAll("input").forEach(x=>x.oninput=calc);
 row.querySelector(".remove").onclick=()=>{row.remove();if(!wrap.children.length)addItem();calc()};
 wrap.appendChild(row); calc();
}
$("addItem").onclick=addItem;

function calc(){
 let taxable=0,cg=0,sg=0,ig=0;
 document.querySelectorAll("#items .item").forEach(r=>{
  const q=+r.querySelector(".qty").value||0, rate=+r.querySelector(".rate").value||0, gst=+r.querySelector(".gst").value||0;
  const base=q*rate; taxable+=base;
  const mode=$("taxMode").value;
  if(mode==="intra" || (mode==="auto" && gst>0 && $("placeSupply").value.trim())){
    cg+=base*gst/200; sg+=base*gst/200;
  }else if(mode==="inter" || (mode==="auto" && gst>0)){
    ig+=base*gst/100;
  }
 });
 $("taxable").textContent=money(taxable);$("cgst").textContent=money(cg);$("sgst").textContent=money(sg);$("igst").textContent=money(ig);$("grand").textContent=money(taxable+cg+sg+ig);
}
$("taxMode").onchange=calc;$("placeSupply").oninput=calc;

$("billForm").onsubmit=e=>{
 e.preventDefault(); calc();
 const items=[...document.querySelectorAll("#items .item")].map(r=>({product:r.querySelector(".product").value,qty:+r.querySelector(".qty").value||0,rate:+r.querySelector(".rate").value||0,gst:+r.querySelector(".gst").value||0})).filter(x=>x.qty>0);
 if(!items.length){$("billMsg").textContent="Add at least one item.";return}
 const inv={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),no:$("invoiceNo").value,date:$("invoiceDate").value,customer:$("customer").value,place:$("placeSupply").value,type:$("invoiceType").value,mode:$("taxMode").value,items,total:parseFloat($("grand").textContent.replace(/[₹,]/g,""))||0};
 state.invoices.push(inv);save();$("billMsg").textContent="Bill saved successfully."; $("invoiceNo").value=nextInvoice(); updateDashboard(); renderInvoices();
};

function renderProducts(){
 $("productList").innerHTML=state.products.length?state.products.map((p,i)=>`<div class="list-row"><span><b>${esc(p.name)}</b><br><small>${esc(p.sku||"")} · GST ${p.gst}% · Stock ${p.stock}</small></span><b>${money(p.rate)}</b></div>`).join(""):"<p class='hint'>No products yet.</p>";
}
$("productForm").onsubmit=e=>{
 e.preventDefault();state.products.push({name:$("pName").value.trim(),sku:$("pSku").value.trim(),rate:+$("pRate").value||0,gst:+$("pGst").value||0,stock:+$("pStock").value||0});save();e.target.reset();$("pGst").value=18;renderProducts();refreshCustomerProductOptions()
};

function renderCustomers(){
 $("customerList").innerHTML=state.customers.length?state.customers.map(c=>`<div class="list-row"><span><b>${esc(c.name)}</b><br><small>${esc(c.mobile||"")} · ${esc(c.email||"")} · ${esc(c.tax||"")}</small></span></div>`).join(""):"<p class='hint'>No customers yet.</p>";
}
$("customerForm").onsubmit=e=>{
 e.preventDefault();state.customers.push({name:$("cName").value.trim(),mobile:$("cMobile").value.trim(),email:$("cEmail").value.trim(),tax:$("cTax").value.trim()});save();e.target.reset();renderCustomers();refreshCustomerProductOptions()
};
function refreshCustomerProductOptions(){
 $("customer").innerHTML='<option>Cash Sale / Walk-in</option>'+state.customers.map(c=>`<option>${esc(c.name)}</option>`).join("");
 const old=[...document.querySelectorAll(".product")];old.forEach(s=>{const v=s.value;s.innerHTML=productOptions();s.value=v});
}
function renderInvoices(){
 $("invoiceList").innerHTML=state.invoices.length?`<table class="table"><thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>Total</th></tr></thead><tbody>${state.invoices.slice().reverse().map(i=>`<tr><td>${esc(i.no)}</td><td>${esc(i.date)}</td><td>${esc(i.customer)}</td><td>${money(i.total)}</td></tr>`).join("")}</tbody></table>`:"<p>No saved invoices.</p>";
}
function updateDashboard(){
 const sales=state.invoices.reduce((a,i)=>a+i.total,0);
 $("dashSales").textContent=money(sales);$("dashPayments").textContent=money(0);$("dashCustomers").textContent=state.customers.length;$("dashProducts").textContent=state.products.length;$("dashStock").textContent=state.products.reduce((a,p)=>a+p.stock,0);$("dashInvoices").textContent=state.invoices.length;$("dashReceivables").textContent=money(sales);$("dashSync").textContent=0;
}
function preview(){
 calc();
 const rows=[...document.querySelectorAll("#items .item")].map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.querySelector(".product").selectedOptions[0]?.text||"Item")}</td><td>${r.querySelector(".qty").value}</td><td>${money(+r.querySelector(".rate").value)}</td><td>${money((+r.querySelector(".qty").value||0)*(+r.querySelector(".rate").value||0))}</td></tr>`).join("");
 $("invoicePreview").innerHTML=`<div class="invoice-paper"><h2>${esc(state.settings.businessName)}</h2><p>${esc(state.settings.businessContact)}</p><hr><h3>TAX INVOICE</h3><p><b>Invoice:</b> ${esc($("invoiceNo").value)} &nbsp; <b>Date:</b> ${esc($("invoiceDate").value)}</p><p><b>Customer:</b> ${esc($("customer").value)}</p><p><b>Place:</b> ${esc($("placeSupply").value||"—")}</p><table><tr><th>#</th><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${rows}</table><h3 style="text-align:right">Total: ${esc($("grand").textContent)}</h3><p>CGST ${esc($("cgst").textContent)} · SGST ${esc($("sgst").textContent)} · IGST ${esc($("igst").textContent)}</p><p style="margin-top:35px">QR / Barcode area</p></div>`;
 $("previewModal").classList.add("show")
}
$("previewBtn").onclick=preview;$("previewClose").onclick=()=> $("previewModal").classList.remove("show");$("printBtn").onclick=()=>{preview();setTimeout(()=>window.print(),300)};

async function loadIP(){
 $("onlineState").textContent=navigator.onLine?"Online":"Offline";$("platform").textContent=navigator.platform||"Unknown";$("browser").textContent=navigator.userAgent.slice(0,80);
 if(!$("publicIp").dataset.loaded)$("publicIp").textContent="Not loaded";
}
async function refreshIP(){
 $("publicIp").textContent="Loading…";
 try{const r=await fetch("https://api.ipify.org?format=json",{cache:"no-store"});const j=await r.json();$("publicIp").textContent=j.ip;$("publicIp").dataset.loaded="1"}
 catch(e){$("publicIp").textContent="Unavailable (offline or blocked)"}
}
$("ipRefresh").onclick=refreshIP;window.addEventListener("online",loadIP);window.addEventListener("offline",loadIP);

$("saveSettings").onclick=()=>{state.settings.businessName=$("businessName").value.trim()||"SENQUARA ONE";state.settings.businessContact=$("businessContact").value;save();alert("Settings saved.")};
$("clearData").onclick=()=>{if(confirm("Delete all local products, customers and invoices?")){localStorage.removeItem(KEY);location.reload()}};

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function init(){refreshCustomerProductOptions();renderProducts();renderCustomers();renderInvoices();updateDashboard();loadIP();calc()}
init();

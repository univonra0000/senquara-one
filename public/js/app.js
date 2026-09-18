const KEY="senquara_one_v2";

const state=JSON.parse(
  localStorage.getItem(KEY) ||
  '{"products":[],"customers":[],"invoices":[],"settings":{"businessName":"SENQUARA ONE","businessContact":"One Platform. Everything Connected."}}'
);

const $=id=>document.getElementById(id);

const money=n=>new Intl.NumberFormat("en-IN",{
  style:"currency",
  currency:"INR"
}).format(Number(n)||0);

const save=()=>localStorage.setItem(KEY,JSON.stringify(state));

function today(){
  return new Date().toISOString().slice(0,10);
}

function nextInvoice(){
  return "INV-"+String(state.invoices.length+1).padStart(5,"0");
}

$("invoiceDate").value=today();
$("invoiceNo").value=nextInvoice();


/* =========================================================
   VIEW / NAVIGATION
========================================================= */

function openView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));

  const page=$(id);
  if(page) page.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(b=>{
    b.classList.toggle("active",b.dataset.view===id);
  });

  closeDrawer();

  if(id==="billing") renderItems();
  if(id==="products") renderProducts();
  if(id==="customers") renderCustomers();
  if(id==="invoices") renderInvoices();
  if(id==="ipmodel") loadIP();

  updateDashboard();
}

document.querySelectorAll(".nav-item").forEach(b=>{
  b.onclick=()=>openView(b.dataset.view);
});

document.querySelectorAll("[data-open-billing]").forEach(b=>{
  b.onclick=()=>openView("billing");
});


/* =========================================================
   MOBILE DRAWER
========================================================= */

if($("menuBtn")){
  $("menuBtn").onclick=()=>{
    $("drawer").classList.add("open");
    $("scrim").classList.add("show");
  };
}

if($("closeMenu")){
  $("closeMenu").onclick=closeDrawer;
}

if($("scrim")){
  $("scrim").onclick=closeDrawer;
}

function closeDrawer(){
  if($("drawer")) $("drawer").classList.remove("open");
  if($("scrim")) $("scrim").classList.remove("show");
}


/* =========================================================
   PRODUCT OPTIONS
========================================================= */

function productOptions(){
  return '<option value="">Select product</option>'+
    state.products.map((p,i)=>
      `<option value="${i}">
        ${esc(p.name)} — ${money(p.rate)} — GST ${Number(p.gst)||0}%
      </option>`
    ).join("");
}


/* =========================================================
   BILL ITEMS
========================================================= */

function renderItems(){

  const wrap=$("items");
  if(!wrap) return;

  if(!wrap.children.length){
    addItem();
  }

  [...wrap.children].forEach(row=>{
    const sel=row.querySelector(".product");
    if(!sel) return;

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

  const wrap=$("items");
  if(!wrap) return;

  const row=document.createElement("div");

  row.className="item";

  row.innerHTML=`
    <div class="item-grid">

      <label class="wide">
        Product
        <select class="product">
          ${productOptions()}
        </select>
      </label>

      <label>
        Qty
        <input class="qty"
          type="number"
          min="0.01"
          step="0.01"
          value="1">
      </label>

      <label>
        Rate
        <input class="rate"
          type="number"
          min="0"
          step="0.01"
          value="0">
      </label>

      <label>
        GST %
        <input class="gst"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value="18">
      </label>

      <button type="button" class="remove">
        Remove
      </button>

    </div>
  `;

  row.querySelector(".product").onchange=()=>{
    const p=state.products[
      row.querySelector(".product").value
    ];

    if(p){
      row.querySelector(".rate").value=p.rate;
      row.querySelector(".gst").value=p.gst;
    }

    calc();
  };

  row.querySelectorAll("input").forEach(x=>{
    x.oninput=calc;
  });

  row.querySelector(".remove").onclick=()=>{
    row.remove();

    if(!wrap.children.length){
      addItem();
    }

    calc();
  };

  wrap.appendChild(row);

  calc();
}


if($("addItem")){
  $("addItem").onclick=addItem;
}


/* =========================================================
   GST CALCULATION
========================================================= */

function calc(){

  let taxable=0;
  let cg=0;
  let sg=0;
  let ig=0;

  document.querySelectorAll("#items .item").forEach(r=>{

    const q=Number(r.querySelector(".qty")?.value)||0;
    const rate=Number(r.querySelector(".rate")?.value)||0;
    const gst=Number(r.querySelector(".gst")?.value)||0;

    const base=q*rate;

    taxable+=base;

    const mode=$("taxMode")?.value;

    if(
      mode==="intra" ||
      (
        mode==="auto" &&
        gst>0 &&
        $("placeSupply")?.value.trim()
      )
    ){

      cg+=base*gst/200;
      sg+=base*gst/200;

    }else if(
      mode==="inter" ||
      (
        mode==="auto" &&
        gst>0
      )
    ){

      ig+=base*gst/100;
    }

  });

  if($("taxable"))
    $("taxable").textContent=money(taxable);

  if($("cgst"))
    $("cgst").textContent=money(cg);

  if($("sgst"))
    $("sgst").textContent=money(sg);

  if($("igst"))
    $("igst").textContent=money(ig);

  if($("grand"))
    $("grand").textContent=money(
      taxable+cg+sg+ig
    );
}


if($("taxMode")){
  $("taxMode").onchange=calc;
}

if($("placeSupply")){
  $("placeSupply").oninput=calc;
}


/* =========================================================
   SAVE BILL
========================================================= */

if($("billForm")){

  $("billForm").onsubmit=e=>{

    e.preventDefault();

    calc();

    const items=[
      ...document.querySelectorAll("#items .item")
    ].map(r=>({

      product:r.querySelector(".product").value,

      qty:Number(
        r.querySelector(".qty").value
      )||0,

      rate:Number(
        r.querySelector(".rate").value
      )||0,

      gst:Number(
        r.querySelector(".gst").value
      )||0

    })).filter(x=>x.qty>0);


    if(!items.length){

      if($("billMsg"))
        $("billMsg").textContent=
          "Add at least one item.";

      return;
    }


    const total=
      parseFloat(
        ($("grand")?.textContent||"0")
          .replace(/[₹,]/g,"")
      )||0;


    const inv={

      id:crypto.randomUUID
        ?crypto.randomUUID()
        :String(Date.now()),

      no:$("invoiceNo").value,

      date:$("invoiceDate").value,

      customer:$("customer").value,

      place:$("placeSupply").value,

      type:$("invoiceType").value,

      mode:$("taxMode").value,

      items:items,

      total:total
    };


    state.invoices.push(inv);

    save();


    if($("billMsg"))
      $("billMsg").textContent=
        "Bill saved successfully.";


    $("invoiceNo").value=nextInvoice();

    updateDashboard();

    renderInvoices();
  };
}


/* =========================================================
   PRODUCTS
========================================================= */

function renderProducts(){

  if(!$("productList")) return;

  $("productList").innerHTML=

    state.products.length

    ?

    state.products.map((p,i)=>`

      <div class="list-row">

        <span>

          <b>${esc(p.name)}</b>

          <br>

          <small>
            ${esc(p.sku||"")}
            · GST ${Number(p.gst)||0}%
            · Stock ${Number(p.stock)||0}
          </small>

        </span>

        <b>${money(p.rate)}</b>

      </div>

    `).join("")

    :

    "<p class='hint'>No products yet.</p>";
}


if($("productForm")){

  $("productForm").onsubmit=e=>{

    e.preventDefault();

    state.products.push({

      name:$("pName").value.trim(),

      sku:$("pSku").value.trim(),

      hsn:$("pHsn")?.value.trim()||"",

      unit:$("pUnit")?.value||"No",

      rate:Number($("pRate").value)||0,

      gst:Number($("pGst").value)||0,

      stock:Number($("pStock").value)||0

    });

    save();

    e.target.reset();

    if($("pGst"))
      $("pGst").value=18;

    renderProducts();

    refreshCustomerProductOptions();
  };
}


/* =========================================================
   CUSTOMERS
========================================================= */

function renderCustomers(){

  if(!$("customerList")) return;

  $("customerList").innerHTML=

    state.customers.length

    ?

    state.customers.map(c=>`

      <div class="list-row">

        <span>

          <b>${esc(c.name)}</b>

          <br>

          <small>
            ${esc(c.mobile||"")}
            · ${esc(c.email||"")}
            · ${esc(c.tax||"")}
          </small>

        </span>

      </div>

    `).join("")

    :

    "<p class='hint'>No customers yet.</p>";
}


if($("customerForm")){

  $("customerForm").onsubmit=e=>{

    e.preventDefault();

    state.customers.push({

      name:$("cName").value.trim(),

      mobile:$("cMobile").value.trim(),

      email:$("cEmail").value.trim(),

      tax:$("cTax").value.trim(),

      address:$("cAddress")?.value.trim()||"",

      state:$("cState")?.value.trim()||""

    });

    save();

    e.target.reset();

    renderCustomers();

    refreshCustomerProductOptions();
  };
}


function refreshCustomerProductOptions(){

  if($("customer")){

    $("customer").innerHTML=
      '<option>Cash Sale / Walk-in</option>'+
      state.customers.map(c=>
        `<option>${esc(c.name)}</option>`
      ).join("");
  }


  const old=[
    ...document.querySelectorAll(".product")
  ];

  old.forEach(s=>{

    const v=s.value;

    s.innerHTML=productOptions();

    s.value=v;

  });
}


/* =========================================================
   INVOICE LIST
========================================================= */

function renderInvoices(){

  if(!$("invoiceList")) return;

  if(!state.invoices.length){

    $("invoiceList").innerHTML=
      "<p>No saved invoices.</p>";

    return;
  }


  $("invoiceList").innerHTML=`

    <table class="table">

      <thead>

        <tr>
          <th>No.</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Total</th>
        </tr>

      </thead>

      <tbody>

        ${state.invoices.slice().reverse().map(i=>`

          <tr>

            <td>

              <button
                type="button"
                class="sq-invoice-link"
                data-invoice-id="${esc(i.id)}">

                ${esc(i.no)}

              </button>

            </td>

            <td>${esc(i.date)}</td>

            <td>${esc(i.customer)}</td>

            <td>${money(i.total)}</td>

          </tr>

        `).join("")}

      </tbody>

    </table>
  `;


  document.querySelectorAll(".sq-invoice-link")
    .forEach(btn=>{

      btn.onclick=()=>{

        const inv=state.invoices.find(
          x=>x.id===btn.dataset.invoiceId
        );

        if(inv){

          openSavedInvoice(inv);

        }

      };

    });
}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard(){

  const sales=
    state.invoices.reduce(
      (a,i)=>a+(Number(i.total)||0),
      0
    );


  if($("dashSales"))
    $("dashSales").textContent=money(sales);

  if($("dashPayments"))
    $("dashPayments").textContent=money(0);

  if($("dashCustomers"))
    $("dashCustomers").textContent=
      state.customers.length;

  if($("dashProducts"))
    $("dashProducts").textContent=
      state.products.length;

  if($("dashStock"))
    $("dashStock").textContent=
      state.products.reduce(
        (a,p)=>a+(Number(p.stock)||0),
        0
      );

  if($("dashInvoices"))
    $("dashInvoices").textContent=
      state.invoices.length;

  if($("dashReceivables"))
    $("dashReceivables").textContent=
      money(sales);

  if($("dashSync"))
    $("dashSync").textContent=0;
}


/* =========================================================
   AMOUNT IN WORDS
========================================================= */

function amountWords(number){

  const ones=[
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen"
  ];

  const tens=[
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety"
  ];


  function under1000(n){

    let s="";

    if(n>=100){

      s+=ones[Math.floor(n/100)]
        +" Hundred";

      n%=100;

      if(n) s+=" ";
    }


    if(n>=20){

      s+=tens[Math.floor(n/10)];

      if(n%10)
        s+=" "+ones[n%10];

    }else if(n){

      s+=ones[n];
    }


    return s;
  }


  let n=Math.round(
    Number(number)||0
  );


  if(n===0)
    return "Zero Only";


  let result="";


  if(n>=10000000){

    result+=under1000(
      Math.floor(n/10000000)
    )+" Crore ";

    n%=10000000;
  }


  if(n>=100000){

    result+=under1000(
      Math.floor(n/100000)
    )+" Lakh ";

    n%=100000;
  }


  if(n>=1000){

    result+=under1000(
      Math.floor(n/1000)
    )+" Thousand ";

    n%=1000;
  }


  if(n)
    result+=under1000(n);


  return result.trim()+" Only";
}


/* =========================================================
   FIRE SHADOW + INVOICE UI
========================================================= */

function installInvoiceStyles(){

  if(document.getElementById("sqInvoiceStyles"))
    return;


  const style=document.createElement("style");

  style.id="sqInvoiceStyles";

  style.textContent=`

    /* Fire-shadow buttons */

    .sq-fire-btn,
    .sq-invoice-link{

      border:1px solid rgba(255,100,55,.35);

      border-radius:10px;

      background:
        linear-gradient(
          135deg,
          #ff6b35,
          #e53935 55%,
          #ff9f43
        );

      color:#fff;

      font-weight:800;

      box-shadow:
        0 3px 0 #9f2d25,
        0 7px 16px rgba(255,75,35,.25),
        0 0 12px rgba(255,115,50,.15);

      transition:
        transform .12s ease,
        box-shadow .12s ease;
    }


    .sq-fire-btn{

      padding:9px 14px;

      cursor:pointer;
    }


    .sq-fire-btn:active,
    .sq-invoice-link:active{

      transform:translateY(3px);

      box-shadow:
        0 1px 0 #9f2d25,
        0 3px 8px rgba(255,75,35,.18);
    }


    .sq-invoice-link{

      padding:5px 9px;

      cursor:pointer;

      text-decoration:none;
    }


    /* Invoice preview */

    .sq-gst-paper{

      background:#fff;

      color:#111;

      width:min(920px,100%);

      margin:auto;

      padding:18px;

      font:
        12px Arial,
        Helvetica,
        sans-serif;

      line-height:1.25;

      border:1px solid #888;

      box-shadow:
        0 8px 28px rgba(0,0,0,.18);
    }


    .sq-gst-paper *{
      box-sizing:border-box;
    }


    .sq-gst-paper table{

      width:100%;

      border-collapse:collapse;
    }


    .sq-gst-paper th,
    .sq-gst-paper td{

      border:1px solid #777;

      padding:5px;

      vertical-align:top;
    }


    .sq-gst-paper th{

      font-weight:700;

      background:#f3f3f3;
    }


    .sq-head{

      text-align:center;

      font-size:18px;

      font-weight:800;

      margin-bottom:8px;
    }


    .sq-einvoice{

      float:right;

      font-size:12px;

      font-weight:700;
    }


    .sq-grid{

      display:grid;

      grid-template-columns:
        1fr 1fr;

      border:1px solid #777;
    }


    .sq-cell{

      padding:6px;

      border-bottom:1px solid #777;

      min-height:32px;
    }


    .sq-cell:nth-child(odd){

      border-right:1px solid #777;
    }


    .sq-seller{

      font-size:13px;

      font-weight:700;
    }


    .sq-cell b{

      display:block;
    }


    .sq-blank{

      min-height:16px;

      display:block;
    }


    .sq-right{
      text-align:right;
    }


    .sq-center{
      text-align:center;
    }


    .sq-qr{

      width:92px;

      height:92px;

      margin:auto;

      border:1px solid #555;

      display:grid;

      place-items:center;

      text-align:center;

      font-size:9px;

      background:
        repeating-conic-gradient(
          #111 0 25%,
          #fff 0 50%
        )
        50%/10px 10px;
    }


    .sq-note{

      padding:7px;

      border:1px solid #777;

      border-top:0;
    }


    .sq-sign{

      min-height:85px;

      display:flex;

      justify-content:space-between;

      align-items:end;

      padding:8px 4px;
    }


    .sq-actions{

      display:flex;

      gap:8px;

      justify-content:flex-end;

      flex-wrap:wrap;

      margin-bottom:12px;
    }


    .sq-tax-title{

      margin-top:0;

      padding:7px;

      border:1px solid #777;

      border-bottom:0;

      font-weight:700;
    }


    @media(max-width:600px){

      .sq-gst-paper{

        padding:8px;

        font-size:10px;
      }


      .sq-gst-paper th,
      .sq-gst-paper td{

        padding:4px;
      }


      .sq-grid{

        grid-template-columns:1fr;
      }


      .sq-cell:nth-child(odd){

        border-right:0;
      }


      .sq-cell{

        border-right:0!important;
      }


      .sq-gst-paper table{

        min-width:650px;
      }


      .sq-gst-paper{

        overflow-x:auto;
      }


      .sq-sign{

        min-height:90px;
      }
    }


    @media print{

      body>*{

        display:none!important;
      }


      #invoicePreview{

        display:block!important;

        position:static!important;

        background:#fff!important;
      }


      .modal{

        position:static!important;

        background:#fff!important;

        padding:0!important;
      }


      .sq-actions{

        display:none!important;
      }


      .sq-gst-paper{

        width:210mm;

        max-width:none;

        min-height:297mm;

        margin:0;

        padding:10mm;

        border:0;

        box-shadow:none;

        font-size:10.5px;
      }


      .sq-gst-paper thead{

        display:table-header-group;
      }


      .sq-gst-paper tr{

        break-inside:avoid;

        page-break-inside:avoid;
      }
    }

  `;


  document.head.appendChild(style);
}


installInvoiceStyles();


/* =========================================================
   GST INVOICE PREVIEW
========================================================= */

function buildInvoiceHTML(inv){

  const seller=state.settings||{};

  const customerName=
    inv.customer ||
    "Cash Sale / Walk-in";


  const customer=
    state.customers.find(
      c=>c.name===customerName
    )||{};


  const rows=(inv.items||[]).map(
    (x,i)=>{

      const p=
        state.products[
          Number(x.product)
        ]||{};


      const name=
        p.name ||
        x.name ||
        "Item";


      const hsn=
        p.hsn ||
        x.hsn ||
        "";


      const unit=
        p.unit ||
        x.unit ||
        "No";


      const qty=
        Number(x.qty)||0;


      const rate=
        Number(x.rate)||0;


      const gst=
        Number(x.gst)||0;


      const base=
        qty*rate;


      const tax=
        base*gst/100;


      return{
        no:i+1,
        name,
        hsn,
        unit,
        qty,
        rate,
        gst,
        base,
        tax
      };
    }
  );


  const taxable=
    rows.reduce(
      (a,x)=>a+x.base,
      0
    );


  const intra=
    inv.mode==="intra";


  const cgst=
    intra
      ?rows.reduce(
        (a,x)=>a+x.tax/2,
        0
      )
      :0;


  const sgst=
    intra
      ?rows.reduce(
        (a,x)=>a+x.tax/2,
        0
      )
      :0;


  const igst=
    !intra
      ?rows.reduce(
        (a,x)=>a+x.tax,
        0
      )
      :0;


  const grand=
    taxable+
    cgst+
    sgst+
    igst;


  const grouped={};


  rows.forEach(x=>{

    const key=x.hsn||"—";

    if(!grouped[key]){

      grouped[key]={
        hsn:key,
        taxable:0,
        gst:x.gst,
        cgst:0,
        sgst:0,
        igst:0
      };
    }


    grouped[key].taxable+=x.base;


    if(intra){

      grouped[key].cgst+=x.tax/2;

      grouped[key].sgst+=x.tax/2;

    }else{

      grouped[key].igst+=x.tax;

    }

  });


  return`

    <div class="sq-gst-paper">

      <div class="sq-actions">

        <button
          class="sq-fire-btn"
          onclick="window.print()">

          🖨 Print / Save PDF

        </button>

        <button
          class="sq-fire-btn"
          onclick="
            document
              .getElementById('previewModal')
              .classList.remove('show')
          ">

          Close

        </button>

      </div>


      <div class="sq-head">

        TAX INVOICE

        <span class="sq-einvoice">
          e-Invoice
        </span>

      </div>


      <div class="sq-grid">

        <!-- SELLER -->

        <div class="sq-cell">

          <div class="sq-seller">

            ${esc(
              seller.businessName ||
              "SENQUARA ONE"
            )}

          </div>

          <div>
            ${esc(
              seller.businessContact||""
            )}
          </div>

          <div>
            GSTIN/UIN:
            ${esc(
              seller.gstin||""
            )}
          </div>

          <div>
            State / Country:
            ${esc(
              seller.country||"India"
            )}
          </div>

          <div>
            Address:
            ${esc(
              seller.address||""
            )}
          </div>

        </div>


        <!-- QR ON HOLD -->

        <div class="sq-cell">

          <div class="sq-qr">

            e-Invoice

            <br>

            QR ON HOLD

          </div>

        </div>


        <!-- IRN -->

        <div class="sq-cell">

          <b>IRN</b>

          <span class="sq-blank">

            ${esc(
              seller.irn||""
            )}

          </span>

        </div>


        <!-- ACK -->

        <div class="sq-cell">

          <b>
            Ack No. / Ack Date
          </b>

          <span class="sq-blank">

            ${esc(
              seller.ackNo||""
            )}
            /
            ${esc(
              seller.ackDate||""
            )}

          </span>

        </div>


        <!-- INVOICE -->

        <div class="sq-cell">

          <b>Invoice No.</b>

          ${esc(inv.no)}

        </div>


        <div class="sq-cell">

          <b>Dated</b>

          ${esc(inv.date)}

        </div>


        <div class="sq-cell">

          <b>Delivery Note</b>

          ${esc(
            seller.deliveryNote||""
          )}

        </div>


        <div class="sq-cell">

          <b>
            Mode / Terms of Payment
          </b>

          ${esc(
            seller.paymentTerms||""
          )}

        </div>


        <div class="sq-cell">

          <b>
            Reference No. & Date
          </b>

          ${esc(
            seller.reference||""
          )}

        </div>


        <div class="sq-cell">

          <b>
            Other References
          </b>

          ${esc(
            seller.otherReferences||""
          )}

        </div>


        <div class="sq-cell">

          <b>
            Buyer's Order No.
          </b>

          ${esc(
            seller.orderNo||""
          )}

        </div>


        <div class="sq-cell">

          <b>Dated</b>

          ${esc(
            seller.orderDate||""
          )}

        </div>


        <div class="sq-cell">

          <b>
            Dispatch / Destination
          </b>

          ${esc(
            seller.dispatchThrough||""
          )}

          /

          ${esc(
            inv.place||""
          )}

        </div>


        <div class="sq-cell">

          <b>
            Terms of Delivery
          </b>

          ${esc(
            seller.deliveryTerms||""
          )}

        </div>


        <!-- BUYER -->

        <div class="sq-cell">

          <b>
            Buyer (Bill to)
          </b>

          <strong>
            ${esc(customerName)}
          </strong>

          <div>
            ${esc(
              customer.address||""
            )}
          </div>

          <div>
            GSTIN/UIN:
            ${esc(
              customer.tax||""
            )}
          </div>

          <div>
            State:
            ${esc(
              customer.state||
              inv.place||
              ""
            )}
          </div>

        </div>


        <!-- CONSIGNEE -->

        <div class="sq-cell">

          <b>
            Consignee (Ship to)
          </b>

          <strong>
            ${esc(customerName)}
          </strong>

          <div>
            ${esc(
              customer.address||""
            )}
          </div>

          <div>
            GSTIN/UIN:
            ${esc(
              customer.tax||""
            )}
          </div>

          <div>
            Place of Supply:
            ${esc(inv.place||"")}
          </div>

        </div>

      </div>


      <!-- ITEMS -->

      <div style="overflow-x:auto">

        <table>

          <thead>

            <tr>

              <th>
                Sl<br>No.
              </th>

              <th>
                Description of Goods / Services
              </th>

              <th>
                HSN/SAC
              </th>

              <th>
                Quantity
              </th>

              <th>
                Rate
              </th>

              <th>
                per
              </th>

              <th>
                Disc. %
              </th>

              <th>
                Amount
              </th>

            </tr>

          </thead>


          <tbody>

            ${
              rows.map(x=>`

                <tr>

                  <td class="sq-center">
                    ${x.no}
                  </td>

                  <td>
                    <b>
                      ${esc(x.name)}
                    </b>
                  </td>

                  <td>
                    ${esc(x.hsn)}
                  </td>

                  <td class="sq-right">
                    ${x.qty}
                  </td>

                  <td class="sq-right">
                    ${money(x.rate)}
                  </td>

                  <td class="sq-center">
                    ${esc(x.unit)}
                  </td>

                  <td class="sq-right">
                    0
                  </td>

                  <td class="sq-right">
                    ${money(x.base)}
                  </td>

                </tr>

              `).join("")
            }


            <tr>

              <td
                colspan="7"
                class="sq-right">

                <b>
                  Taxable Value
                </b>

              </td>

              <td class="sq-right">

                <b>
                  ${money(taxable)}
                </b>

              </td>

            </tr>


            ${
              intra

              ?

              `
              <tr>

                <td colspan="7"
                    class="sq-right">
                  CGST
                </td>

                <td class="sq-right">
                  ${money(cgst)}
                </td>

              </tr>

              <tr>

                <td colspan="7"
                    class="sq-right">
                  SGST
                </td>

                <td class="sq-right">
                  ${money(sgst)}
                </td>

              </tr>
              `

              :

              `
              <tr>

                <td colspan="7"
                    class="sq-right">
                  IGST
                </td>

                <td class="sq-right">
                  ${money(igst)}
                </td>

              </tr>
              `
            }


            <tr>

              <td
                colspan="7"
                class="sq-right">

                <b>
                  Total
                </b>

              </td>

              <td class="sq-right">

                <b>
                  ${money(grand)}
                </b>

              </td>

            </tr>

          </tbody>

        </table>

      </div>


      <!-- AMOUNT WORDS -->

      <div class="sq-note">

        <b>
          Amount Chargeable (in words):
        </b>

        Indian Rupee
        ${esc(amountWords(grand))}

      </div>


      <!-- TAX SUMMARY -->

      <div class="sq-tax-title">

        HSN/SAC-wise Tax Summary

      </div>


      <div style="overflow-x:auto">

        <table>

          <thead>

            <tr>

              <th>HSN/SAC</th>

              <th>
                Taxable Value
              </th>

              <th>
                Central Tax Rate
              </th>

              <th>
                Central Tax Amount
              </th>

              <th>
                State Tax Rate
              </th>

              <th>
                State Tax Amount
              </th>

              <th>
                IGST Amount
              </th>

            </tr>

          </thead>


          <tbody>

            ${
              Object.values(grouped)
                .map(x=>`

                <tr>

                  <td>
                    ${esc(x.hsn)}
                  </td>

                  <td class="sq-right">
                    ${money(x.taxable)}
                  </td>

                  <td class="sq-right">
                    ${intra
                      ?(x.gst/2)+"%"
                      :"0%"
                    }
                  </td>

                  <td class="sq-right">
                    ${money(x.cgst)}
                  </td>

                  <td class="sq-right">
                    ${intra
                      ?(x.gst/2)+"%"
                      :"0%"
                    }
                  </td>

                  <td class="sq-right">
                    ${money(x.sgst)}
                  </td>

                  <td class="sq-right">
                    ${money(x.igst)}
                  </td>

                </tr>

              `).join("")
            }


            <tr>

              <td>
                <b>Total</b>
              </td>

              <td class="sq-right">

                <b>
                  ${money(taxable)}
                </b>

              </td>

              <td></td>

              <td class="sq-right">

                <b>
                  ${money(cgst)}
                </b>

              </td>

              <td></td>

              <td class="sq-right">

                <b>
                  ${money(sgst)}
                </b>

              </td>

              <td class="sq-right">

                <b>
                  ${money(igst)}
                </b>

              </td>

            </tr>

          </tbody>

        </table>

      </div>


      <!-- TAX WORDS -->

      <div class="sq-note">

        <b>
          Tax Amount (in words):
        </b>

        Indian Rupee
        ${esc(
          amountWords(
            grand-taxable
          )
        )}

      </div>


      <!-- DECLARATION -->

      <div class="sq-note">

        <b>
          Declaration:
        </b>

        We declare that this invoice
        shows the actual price of the
        goods/services described and
        that all particulars are true
        and correct.

      </div>


      <!-- SIGNATURE -->

      <div class="sq-sign">

        <span>
          This is a Computer Generated Invoice
        </span>

        <b>

          for
          ${esc(
            seller.businessName||
            "SENQUARA ONE"
          )}

          <br><br>

          Authorised Signatory

        </b>

      </div>

    </div>
  `;
}


/* =========================================================
   PREVIEW CURRENT BILL
========================================================= */

function preview(){

  calc();


  const inv={

    id:"preview",

    no:$("invoiceNo")?.value||nextInvoice(),

    date:$("invoiceDate")?.value||today(),

    customer:$("customer")?.value||
      "Cash Sale / Walk-in",

    place:$("placeSupply")?.value||"",

    type:$("invoiceType")?.value||
      "Domestic Invoice",

    mode:$("taxMode")?.value||
      "intra",

    items:[
      ...document.querySelectorAll(
        "#items .item"
      )
    ].map(r=>({

      product:
        r.querySelector(".product")?.value||"",

      qty:
        Number(
          r.querySelector(".qty")?.value
        )||0,

      rate:
        Number(
          r.querySelector(".rate")?.value
        )||0,

      gst:
        Number(
          r.querySelector(".gst")?.value
        )||0

    })),

    total:0

  };


  if($("invoicePreview")){

    $("invoicePreview").innerHTML=
      buildInvoiceHTML(inv);

    $("previewModal")?.classList.add("show");
  }
}


/* =========================================================
   OPEN SAVED INVOICE
========================================================= */

function openSavedInvoice(inv){

  if(!$("invoicePreview"))
    return;


  $("invoicePreview").innerHTML=
    buildInvoiceHTML(inv);


  $("previewModal")?.classList.add("show");
}


/* =========================================================
   PREVIEW / PRINT BUTTONS
========================================================= */

if($("previewBtn")){
  $("previewBtn").onclick=preview;
}


if($("previewClose")){
  $("previewClose").onclick=()=>{
    $("previewModal")?.classList.remove("show");
  };
}


if($("printBtn")){

  $("printBtn").onclick=()=>{

    preview();

    setTimeout(
      ()=>window.print(),
      300
    );

  };
}


/* =========================================================
   IP MODEL
========================================================= */

async function loadIP(){

  if($("onlineState"))
    $("onlineState").textContent=
      navigator.onLine
        ?"Online"
        :"Offline";


  if($("platform"))
    $("platform").textContent=
      navigator.platform||"Unknown";


  if($("browser"))
    $("browser").textContent=
      navigator.userAgent.slice(0,80);


  if($("publicIp") &&
     !$("publicIp").dataset.loaded){

    $("publicIp").textContent=
      "Not loaded";
  }
}


async function refreshIP(){

  if(!$("publicIp"))
    return;


  $("publicIp").textContent=
    "Loading…";


  try{

    const r=
      await fetch(
        "https://api.ipify.org?format=json",
        {cache:"no-store"}
      );


    const j=await r.json();


    $("publicIp").textContent=
      j.ip;


    $("publicIp").dataset.loaded="1";

  }catch(e){

    $("publicIp").textContent=
      "Unavailable (offline or blocked)";
  }
}


if($("ipRefresh")){
  $("ipRefresh").onclick=refreshIP;
}


window.addEventListener(
  "online",
  loadIP
);


window.addEventListener(
  "offline",
  loadIP
);


/* =========================================================
   SETTINGS
========================================================= */

if($("saveSettings")){

  $("saveSettings").onclick=()=>{

    state.settings.businessName=
      $("businessName").value.trim()||
      "SENQUARA ONE";


    state.settings.businessContact=
      $("businessContact").value;


    /* Optional additional invoice fields */

    if($("gstin"))
      state.settings.gstin=
        $("gstin").value.trim();


    if($("businessAddress"))
      state.settings.address=
        $("businessAddress").value.trim();


    if($("address"))
      state.settings.address=
        $("address").value.trim();


    if($("country"))
      state.settings.country=
        $("country").value;


    save();

    alert("Settings saved.");
  };
}


/* =========================================================
   CLEAR DATA
========================================================= */

if($("clearData")){

  $("clearData").onclick=()=>{

    if(
      confirm(
        "Delete all local products, customers and invoices?"
      )
    ){

      localStorage.removeItem(KEY);

      location.reload();
    }

  };
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function esc(s){

  return String(s??"").replace(
    /[&<>"']/g,
    c=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[c])
  );
}


/* =========================================================
   INITIALIZE
========================================================= */

function init(){

  refreshCustomerProductOptions();

  renderProducts();

  renderCustomers();

  renderInvoices();

  updateDashboard();

  loadIP();

  calc();
}


init();

/* SENQUARA ONE — Step 3 authentication UI
   Connects the existing shell to /api/auth/register and /api/auth/login.
*/
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TOKEN_KEY='senquara_session_v3';
  const USER_KEY='senquara_cloud_user_v3';
  const pendingKey='senquara_pending_registration_v3';
  const api=async(path,options={})=>{
    const token=localStorage.getItem(TOKEN_KEY)||''; const r=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{}),...(options.headers||{})}});
    let d={}; try{d=await r.json()}catch{}
    if(!r.ok) throw Object.assign(new Error(d.error||'Request failed'),d,{status:r.status});
    return d;
  };
  function style(){
    if($('sqAuthCss'))return;
    const s=document.createElement('style');s.id='sqAuthCss';s.textContent=`
      .sq-auth-card{width:min(500px,100%);background:rgba(17,23,51,.98);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:0 18px 60px rgba(0,0,0,.28)}
      .sq-auth-head{text-align:center;margin-bottom:18px}.sq-auth-head .brand{font-size:24px}.sq-auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sq-auth-grid .full{grid-column:1/-1}
      .sq-auth-card label{display:grid;gap:6px;color:var(--muted);font-size:12px;font-weight:700}.sq-auth-card input{width:100%;min-height:46px;padding:12px;border:1px solid var(--border);border-radius:12px;background:#0c1026;color:#fff}
      .sq-auth-card input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(139,124,255,.16)}
      .sq-auth-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.sq-auth-actions button{min-height:46px}.sq-auth-msg{min-height:22px;margin-top:10px;font-size:13px}.sq-auth-check{display:flex!important;grid-template-columns:auto 1fr;display:flex!important;align-items:flex-start;gap:9px!important;line-height:1.45}.sq-auth-check input{width:18px!important;min-height:18px!important;margin-top:1px}.sq-auth-link{border:0;background:transparent;color:#bfc5ff;text-decoration:underline;padding:8px;font-weight:700}.sq-pending{margin-top:12px;padding:18px;border:1px solid var(--border);border-radius:18px;background:rgba(124,140,255,.08);text-align:center}.sq-pending-icon{font-size:44px}.sq-status{display:inline-block;padding:6px 10px;border-radius:99px;background:#3a3214;color:#ffd166;font-size:11px;font-weight:900}.sq-master-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:rgba(54,215,196,.07)}
      @media(max-width:560px){.sq-auth-card{padding:18px;border-radius:20px}.sq-auth-grid{grid-template-columns:1fr}.sq-auth-grid .full{grid-column:auto}.sq-auth-actions{grid-template-columns:1fr}.sq-master-banner{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(s);
  }
  function authShell(mode='login',message=''){
    style(); const box=$('login'); if(!box)return;
    box.style.display='grid'; box.innerHTML=`<div class="sq-auth-card">
      <div class="sq-auth-head"><div class="brand">SENQUARA ONE</div><div class="muted">One Platform. Everything Connected.</div></div>
      <div id="sqAuthBody"></div><div id="sqAuthMsg" class="sq-auth-msg"></div>
    </div>`;
    mode==='register'?renderRegister():renderLogin(); if(message)setMsg(message);
  }
  function setMsg(t,bad=false){const x=$('sqAuthMsg');if(x){x.textContent=t;x.style.color=bad?'#ff8ca0':'var(--muted)'}}
  function renderLogin(){
    $('sqAuthBody').innerHTML=`<div class="sq-auth-grid">
      <label class="full">Email<input id="sqLoginEmail" type="email" autocomplete="email" placeholder="name@business.com"></label>
      <label class="full">Password<input id="sqLoginPassword" type="password" autocomplete="current-password" placeholder="Enter password"></label>
    </div>
    <div class="sq-auth-actions"><button class="btn" id="sqLoginBtn">Login</button><button class="btn alt" id="sqRegisterBtn">Create account</button></div>
    <div style="text-align:center;margin-top:10px"><button class="sq-auth-link" id="sqDemoBtn">Open Demo</button></div>`;
    $('sqLoginBtn').onclick=login; $('sqRegisterBtn').onclick=()=>authShell('register'); $('sqDemoBtn').onclick=window.demo;
  }
  function renderRegister(){
    $('sqAuthBody').innerHTML=`<div class="sq-auth-grid">
      <label>Full name<input id="sqRegName" autocomplete="name" placeholder="Your name"></label>
      <label>Business name<input id="sqRegBusiness" autocomplete="organization" placeholder="Business / company"></label>
      <label>Email<input id="sqRegEmail" type="email" autocomplete="email" placeholder="name@business.com"></label>
      <label>Mobile<input id="sqRegMobile" type="tel" autocomplete="tel" placeholder="Mobile number"></label>
      <label>Country<input id="sqRegCountry" autocomplete="country-name" value="India" placeholder="Country"></label>
      <label>Password<input id="sqRegPassword" type="password" autocomplete="new-password" placeholder="Minimum 8 characters"></label>
      <label class="sq-auth-check full"><input id="sqTermsAccept" type="checkbox"><span>I accept the SENQUARA ONE Registration Terms & Conditions.</span></label>
    </div>
    <div class="sq-auth-actions"><button class="btn" id="sqCreateBtn">Register</button><button class="btn alt" id="sqBackLogin">Back to Login</button></div>`;
    $('sqCreateBtn').onclick=register; $('sqBackLogin').onclick=()=>authShell('login');
  }
  function showPending(d){
    localStorage.setItem(pendingKey,JSON.stringify({email:d?.user?.email||'',at:new Date().toISOString()}));
    $('sqAuthBody').innerHTML=`<div class="sq-pending"><div class="sq-pending-icon">⏳</div><div class="sq-status">● PENDING APPROVAL</div><h2>Registration received</h2><p class="muted">${esc(d?.message||'Your account is waiting for Master/Admin approval.')}</p><p class="muted">Registered email: <b>${esc(d?.user?.email||'')}</b></p></div><div class="sq-auth-actions"><button class="btn" id="sqPendingLogin">Go to Login</button><button class="btn alt" id="sqPendingAgain">Register Another</button></div>`;
    $('sqPendingLogin').onclick=()=>authShell('login');$('sqPendingAgain').onclick=()=>authShell('register');
  }
  async function register(){
    const b={name:$('sqRegName')?.value.trim(),businessName:$('sqRegBusiness')?.value.trim(),email:$('sqRegEmail')?.value.trim(),mobile:$('sqRegMobile')?.value.trim(),country:$('sqRegCountry')?.value.trim(),password:$('sqRegPassword')?.value,termsAccepted:$('sqTermsAccept')?.checked,termsVersion:'1.0'};
    if(!b.name||!b.email||!b.mobile||!b.password)return setMsg('Please complete all required fields.',true);
    setMsg('Creating your account…');$('sqCreateBtn').disabled=true;
    try{const d=await api('/auth/register',{method:'POST',body:JSON.stringify(b)}); if(d.pending){showPending(d);return} if(d.token)localStorage.setItem(TOKEN_KEY,d.token); if(d.user){localStorage.setItem(USER_KEY,JSON.stringify(d.user));openApp(d.user);setMsg('')} }
    catch(e){setMsg(e.message,true)} finally{if($('sqCreateBtn'))$('sqCreateBtn').disabled=false}
  }
  async function login(){
    const email=$('sqLoginEmail')?.value.trim(),password=$('sqLoginPassword')?.value||''; if(!email||!password)return setMsg('Enter email and password.',true);
    setMsg('Signing in…');$('sqLoginBtn').disabled=true;
    try{const d=await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem(USER_KEY,JSON.stringify(d.user));openApp(d.user);setMsg('')}
    catch(e){if(e.pending){showPending(e);return}setMsg(e.message,true)} finally{if($('sqLoginBtn'))$('sqLoginBtn').disabled=false}
  }
  function openApp(user){$('login').style.display='none';$('app').classList.remove('hidden');const h=document.querySelector('#title');if(h)h.textContent='Dashboard';const sub=document.querySelector('.top .muted');if(sub)sub.textContent=`Welcome, ${user.name||'User'}${user.businessName?' • '+user.businessName:''}`;window.senquaraUser=user;}
  function masterPanel(){
    if($('sqMasterPanel')||!window.senquaraUser||window.senquaraUser.role!=='owner')return;
    const b=document.createElement('button');b.className='btn';b.textContent='👑 Master Panel';b.style.marginLeft='8px';b.id='sqMasterOpen';
    const top=document.querySelector('.top .top-actions')||document.querySelector('.top > div:last-child');if(top)top.appendChild(b);else document.body.appendChild(b);
    b.onclick=loadMaster;
  }
  async function loadMaster(){
    if($('sqMasterPanel'))$('sqMasterPanel').remove();
    const p=document.createElement('div');p.id='sqMasterPanel';p.className='modal';p.innerHTML=`<div class="modal-card sq-master-ui"><div class="page-head"><div><h2 style="margin:0">👑 Master Panel</h2><div class="muted">Users, registration terms and audit</div></div><button class="btn danger" id="sqMasterClose">Close</button></div><div class="master-control"><button class="btn" data-tab="users">👥 Users</button><button class="btn alt" data-tab="terms">📜 Terms</button><button class="btn alt" data-tab="audit">🧾 Audit</button></div><div id="sqMasterBody"></div></div>`;document.body.appendChild(p);$('sqMasterClose').onclick=()=>p.remove();p.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>masterTab(x.dataset.tab));masterTab('users');
  }
  async function masterTab(tab){const out=$('sqMasterBody');if(!out)return;out.innerHTML='<div class="empty">Loading…</div>';try{if(tab==='users'){const d=await api('/admin/users');out.innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${(d.users||[]).map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td><span class="pill">${esc(u.status)}</span></td><td>${u.status==='pending'?`<button class="btn success" data-approve="${esc(u.id)}">Approve</button>`:''} ${u.status==='active'&&u.role!=='owner'?`<button class="btn danger" data-block="${esc(u.id)}">Block</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;out.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{await api('/admin/users/status',{method:'POST',body:JSON.stringify({id:b.dataset.approve,status:'active'})});masterTab('users')});out.querySelectorAll('[data-block]').forEach(b=>b.onclick=async()=>{await api('/admin/users/status',{method:'POST',body:JSON.stringify({id:b.dataset.block,status:'blocked'})});masterTab('users')});}else if(tab==='terms'){const d=await api('/admin/terms');out.innerHTML=`<div class="sq-auth-grid"><label>Version<input id="sqTermVersion" value="${esc(d.version)}"></label><label class="full">Registration Terms<textarea id="sqTermText" rows="8">${esc(d.text)}</textarea></label></div><div class="sq-auth-actions"><button class="btn" id="sqSaveTerms">Save Terms</button></div>`;$('sqSaveTerms').onclick=async()=>{await api('/admin/terms',{method:'POST',body:JSON.stringify({version:$('sqTermVersion').value,text:$('sqTermText').value})});alert('Terms updated.');};}else{const d=await api('/admin/audit');out.innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>${(d.audit||[]).map(a=>`<tr><td>${esc(a.created_at)}</td><td>${esc(a.action)}</td><td>${esc(a.entity)}</td><td>${esc(a.details||'')}</td></tr>`).join('')}</tbody></table></div>`}}catch(e){out.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}}
  function afterOpen(){masterPanel()}
  const oldOpen=openApp; openApp=function(user){oldOpen(user);setTimeout(afterOpen,50)};
  window.register=register;
  window.demo=function(){localStorage.setItem(USER_KEY,JSON.stringify({id:'demo',name:'Demo User',businessName:'SENQUARA ONE Demo',email:'demo@senquara.one',role:'demo',status:'active'}));$('login').style.display='none';$('app').classList.remove('hidden');if(typeof notify==='function')notify('Demo mode opened');};
  window.logout=function(){localStorage.removeItem(USER_KEY);localStorage.removeItem(TOKEN_KEY);$('app').classList.add('hidden');authShell('login','You have been logged out.');};
  window.addEventListener('load',()=>{const saved=localStorage.getItem(USER_KEY); if(saved){try{openApp(JSON.parse(saved));return}catch{}} authShell('login');});
})();

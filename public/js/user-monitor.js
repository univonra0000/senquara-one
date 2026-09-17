/* SENQUARA ONE — Live Users & Locations
   Add after app.js in public/index.html.
*/
(function(){
  const KEY='senquara_presence_v1';
  let timer=null, summaryTimer=null, map=null, markers=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const token=()=>localStorage.getItem('senquara_access_token')||'';
  const getRole=()=>window.__senquaraState?.profile?.role||'';
  async function api2(path,opt={}){
    const h=Object.assign({'Content-Type':'application/json'},opt.headers||{});
    const t=token(); if(t) h.Authorization='Bearer '+t;
    const r=await fetch(location.origin+path,{...opt,headers:h});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'Request failed');
    return d;
  }
  function injectCss(){
    if(document.getElementById('stoLiveCss'))return;
    const s=document.createElement('style');s.id='stoLiveCss';
    s.textContent=`.sto-live-btn{position:relative;border:1px solid var(--border,#dfe3ef);background:#fff;border-radius:12px;padding:8px 11px;font-weight:700;box-shadow:0 3px 12px rgba(20,30,60,.08)}.sto-live-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#19b86b;margin-right:6px}.sto-badge{position:absolute;right:-5px;top:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:10px;background:#e5484d;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}.sto-monitor-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:16px}.sto-map{height:430px;border-radius:16px;overflow:hidden;border:1px solid var(--border,#dfe3ef);box-shadow:0 4px 18px rgba(20,30,60,.08)}.sto-map-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#697386}.sto-light{width:11px;height:11px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.12)}.sto-green{background:#19b86b}.sto-white{background:#fff}.sto-red{background:#e5484d}.sto-pink{background:#e889b8}.sto-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sto-status{font-size:12px;font-weight:700}.sto-sub{font-size:12px;color:#697386}.sto-row{display:flex;gap:8px;align-items:center}.sto-danger{border-color:#e5484d!important;color:#b4232a!important}@media(max-width:900px){.sto-monitor-grid{grid-template-columns:1fr}.sto-map{height:330px}}`;
    document.head.appendChild(s);
  }
  function status(u){
    const t=u.last_seen?new Date(u.last_seen).getTime():0, age=Date.now()-t, six=183*86400000;
    if(u.blocked) return 'offline';
    if(u.presence_status==='problem'||u.last_error) return 'problem';
    if(t && age<=90000) return 'online';
    if((t && age>six)||(!t && Date.now()-new Date(u.created_at).getTime()>six)) return 'pink';
    return 'offline';
  }
  function label(s){return s==='online'?'Online':s==='problem'?'Problem':s==='pink'?'6+ months':'Offline'}
  function color(s){return s==='online'?'#19b86b':s==='problem'?'#e5484d':s==='pink'?'#e889b8':'#ffffff'}
  function loadLeaflet(){
    return new Promise((resolve,reject)=>{
      if(window.L)return resolve();
      const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);
      const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=resolve;js.onerror=reject;document.head.appendChild(js);
    });
  }
  async function heartbeat(statusName='online',error=''){
    if(!token())return;
    try{await api2('/api/presence/heartbeat',{method:'POST',body:JSON.stringify({status:statusName,error:String(error||'').slice(0,250)})})}catch(_){}
  }
  function topButton(){
    const box=document.querySelector('.top-actions');if(!box||document.getElementById('stoLiveBtn'))return;
    const b=document.createElement('button');b.id='stoLiveBtn';b.className='sto-live-btn';
    b.innerHTML='<span class="sto-live-dot"></span><span id="stoLiveText">Live 0</span><span id="stoLiveBadge" class="sto-badge" style="display:none">0</span>';
    b.onclick=()=>show();box.insertBefore(b,box.firstChild);
  }
  function updateTop(d){
    const t=document.getElementById('stoLiveText');if(t)t.textContent='Live '+(d.online_count||0);
    const b=document.getElementById('stoLiveBadge'),n=Number(d.new_users||0);if(b){b.textContent=n;b.style.display=n?'flex':'none'}
  }
  function page(){
    return `<div class="page-head"><div><h1>Live Users & Locations</h1><p class="muted">Live count, approximate IP location, activity status and access control.</p></div><div class="sto-toolbar"><button class="soft-btn" id="stoRefresh">↻ Refresh</button><select id="stoFilter"><option value="all">All users</option><option value="online">Online</option><option value="offline">Offline</option><option value="problem">Problem</option><option value="pink">6+ months</option></select></div></div><div class="grid" id="stoStats"></div><div class="sto-monitor-grid"><div class="card"><h3>Map</h3><div id="stoMap" class="sto-map"><div class="sto-map-empty">Loading map…</div></div><p class="muted">IP location is approximate and may point to a city/ISP location rather than the user's exact position.</p></div><div class="card"><h3>User list</h3><div id="stoList">Loading…</div></div></div>`;
  }
  async function drawMap(users){
    const el=document.getElementById('stoMap');if(!el)return;
    try{
      await loadLeaflet();
      if(!map)map=L.map(el).setView([22.5,78.9],4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
      markers.forEach(m=>m.remove());markers=[];
      const points=users.filter(u=>Number.isFinite(Number(u.latitude))&&Number.isFinite(Number(u.longitude)));
      points.forEach(u=>{
        const s=status(u), icon=L.divIcon({className:'',html:`<div style="width:16px;height:16px;border-radius:50%;background:${color(s)};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,iconSize:[16,16],iconAnchor:[8,8]});
        const m=L.marker([Number(u.latitude),Number(u.longitude)],{icon}).addTo(map);
        m.bindPopup(`<b>${esc(u.name||u.email)}</b><br>${esc([u.city,u.region,u.country].filter(Boolean).join(', '))}<br>IP: ${esc(u.ip||'hidden')}<br>Status: ${label(s)}<br>Last seen: ${esc(u.last_seen||'Never')}`);
        m.on('click',()=>map.setView(m.getLatLng(),Math.max(map.getZoom(),8)));markers.push(m);
      });
      if(points.length===1)map.setView([Number(points[0].latitude),Number(points[0].longitude)],8);
      else if(points.length>1)map.fitBounds(L.latLngBounds(points.map(u=>[Number(u.latitude),Number(u.longitude)])).pad(.25));
    }catch(_){el.innerHTML='<div class="sto-map-empty">Map could not load. The user list remains available.</div>'}
  }
  async function load(){
    const list=document.getElementById('stoList');if(!list)return;
    try{
      const d=await api2('/api/presence');updateTop(d);window.__stoUsers=d.users||[];
      const f=document.getElementById('stoFilter')?.value||'all', all=window.__stoUsers;
      const counts={online:0,offline:0,problem:0,pink:0};all.forEach(u=>counts[status(u)]++);
      const st=document.getElementById('stoStats');if(st)st.innerHTML=`<div class="card"><div class="label">Online</div><div class="value"><span class="sto-light sto-green"></span> ${counts.online}</div></div><div class="card"><div class="label">Offline</div><div class="value"><span class="sto-light sto-white"></span> ${counts.offline}</div></div><div class="card"><div class="label">Problem</div><div class="value"><span class="sto-light sto-red"></span> ${counts.problem}</div></div><div class="card"><div class="label">6+ months</div><div class="value"><span class="sto-light sto-pink"></span> ${counts.pink}</div></div>`;
      const rows=all.filter(u=>f==='all'||status(u)===f);
      list.innerHTML=rows.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Status</th><th>User</th><th>Location / IP</th><th>Last seen</th><th>Access</th></tr></thead><tbody>${rows.map(u=>{const s=status(u),self=u.id===window.__stoState?.profile?.id,can=getRole()==='owner'&&!self;return `<tr><td><span class="sto-light sto-${s==='online'?'green':s==='problem'?'red':s==='pink'?'pink':'white'}"></span> <span class="sto-status">${label(s)}</span></td><td><b>${esc(u.name)}</b><div class="sto-sub">${esc(u.email)} · ${esc(u.role)}</div></td><td>${esc([u.city,u.region,u.country].filter(Boolean).join(', ')||'Unknown')}<div class="sto-sub">IP: ${esc(u.ip||'hidden')}</div></td><td>${esc(u.last_seen||'Never')}</td><td>${can?(u.blocked?`<button class="soft-btn" data-unblock="${esc(u.id)}">Unblock</button>`:`<button class="soft-btn sto-danger" data-block="${esc(u.id)}">Block</button>`):'<span class="sto-sub">Owner only</span>'}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No users match this filter.</div>';
      document.querySelectorAll('[data-block]').forEach(b=>b.onclick=()=>blockUser(b.dataset.block,true));
      document.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=()=>blockUser(b.dataset.unblock,false));
      await drawMap(all);
    }catch(e){list.innerHTML='<div class="notice">'+esc(e.message)+'</div>'}
  }
  async function blockUser(id,blocked){
    if(getRole()!=='owner'){alert('Owner/Admin only.');return}
    if(!confirm((blocked?'Block':'Unblock')+' this user?'))return;
    try{await api2('/api/users/block',{method:'PUT',body:JSON.stringify({userId:id,blocked})});load()}catch(e){alert(e.message)}
  }
  async function show(){
    injectCss();document.getElementById('content').innerHTML=page();document.getElementById('pageTitle').textContent='Live Users & Locations';
    document.getElementById('stoRefresh').onclick=load;document.getElementById('stoFilter').onchange=load;await load();
  }
  function boot(){
    injectCss();topButton();
    if(!token())return;
    heartbeat('online');clearInterval(timer);timer=setInterval(()=>heartbeat('online'),30000);
    window.addEventListener('error',e=>heartbeat('problem',e.message||'Client error'));
    window.addEventListener('unhandledrejection',e=>heartbeat('problem',e.reason?.message||'Promise error'));
    clearInterval(summaryTimer);summaryTimer=setInterval(async()=>{try{const d=await api2('/api/presence/summary');updateTop(d)}catch(_){}} ,15000);
    const nav=document.getElementById('nav');if(nav&&!document.getElementById('stoLiveNav')){const b=document.createElement('button');b.id='stoLiveNav';b.className='nav-btn';b.textContent='🟢 Live Users';b.onclick=show;nav.appendChild(b)}
  }
  window.stoUserMonitor={boot,show,heartbeat};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700));
  setInterval(()=>{if(token())topButton()},3000);
})();
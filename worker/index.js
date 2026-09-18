// SENQUARA ONE — unified Worker
// Keeps the existing D1 schema compatible while adding secure-ish session auth,
// pending approval, Master user controls, terms, business data APIs and IP info.

const SESSION_DAYS = 7;
const ROLES = ['viewer','sales','billing','inventory','accountant','manager','owner'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors()});
    try {
      const p=url.pathname;
      if(p==='/api/health' && request.method==='GET') return json({ok:true,app:'SENQUARA ONE',version:'V3',db:!!env.DB});
      if(p==='/api/ip' && request.method==='GET') return json({ok:true,ip:request.headers.get('CF-Connecting-IP')||'',country:request.cf?.country||'',colo:request.cf?.colo||'',ray:request.headers.get('CF-Ray')||''});
      if(p==='/api/auth/register' && request.method==='POST') return register(request,env);
      if(p==='/api/auth/login' && request.method==='POST') return login(request,env);
      if(p==='/api/auth/logout' && request.method==='POST') return logout(request,env);
      if(p==='/api/auth/me' && request.method==='GET') return me(request,env);
      if(p==='/api/admin/users' && request.method==='GET') return adminUsers(request,env);
      if(p==='/api/admin/users' && request.method==='POST') return adminUpsertUser(request,env);
      if(p==='/api/admin/users' && request.method==='DELETE') return adminDeleteUser(request,env);
      if(p==='/api/admin/users/status' && request.method==='POST') return adminUserStatus(request,env);
      if(p==='/api/admin/terms' && request.method==='GET') return getTerms(request,env);
      if(p==='/api/admin/terms' && request.method==='POST') return setTerms(request,env);
      if(p==='/api/admin/audit' && request.method==='GET') return adminAudit(request,env);
      if(p==='/api/products' && request.method==='GET') return listRecords(request,env,'product');
      if(p==='/api/products' && request.method==='POST') return upsertRecord(request,env,'product');
      if(p==='/api/customers' && request.method==='GET') return listRecords(request,env,'customer');
      if(p==='/api/customers' && request.method==='POST') return upsertRecord(request,env,'customer');
      if(p==='/api/invoices' && request.method==='GET') return listRecords(request,env,'invoice');
      if(p==='/api/invoices' && request.method==='POST') return upsertRecord(request,env,'invoice');
      return json({ok:false,error:'Route not found.'},404);
    } catch(e) { return json({ok:false,error:e?.message||'Server error.'},500); }
  }
};

async function register(request,env){
  const b=await body(request);
  const name=str(b.name),businessName=str(b.businessName),email=str(b.email).toLowerCase(),mobile=str(b.mobile),country=str(b.country),password=str(b.password);
  if(!name||!email||!mobile||!password) return json({ok:false,error:'Full name, email, mobile and password are required.'},400);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ok:false,error:'Please enter a valid email address.'},400);
  if(password.length<8) return json({ok:false,error:'Password must contain at least 8 characters.'},400);
  if(b.termsAccepted!==true) return json({ok:false,error:'Please accept the Terms and Conditions.'},400);
  const exists=await env.DB.prepare('SELECT id FROM users WHERE email=? LIMIT 1').bind(email).first();
  if(exists) return json({ok:false,error:'This email is already registered.'},409);
  const c=await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first();
  const first=Number(c?.total||0)===0;
  const pw=await hashPassword(password),id=crypto.randomUUID(),now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users(id,email,name,mobile,business_name,country,password_hash,password_salt,role,status,email_verified,terms_version,terms_accepted_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,email,name,mobile,businessName,country,pw.hash,pw.salt,first?'owner':'viewer',first?'active':'pending',1,str(b.termsVersion||'1.0'),now,now,now).run();
  await audit(env,null,'REGISTER','users',id,{email,first});
  if(first){
    await ensureSessions(env);
    const token=crypto.randomUUID()+'.'+crypto.randomUUID(),expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
    await env.DB.prepare('INSERT INTO sessions(id,user_id,token,expires_at,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,await digest(token),expires,now).run();
    return json({ok:true,firstAccount:true,pending:false,token,user:{id,name,businessName,email,mobile,country,role:'owner',status:'active',emailVerified:true},message:'Initial Master/Admin account created successfully.'});
  }
  return json({ok:true,firstAccount:false,pending:true,user:{id,name,businessName,email,mobile,country,role:'viewer',status:'pending',emailVerified:true},message:'Registration received. Your account is pending Master/Admin approval.'});
}

async function login(request,env){
  const b=await body(request),email=str(b.email).toLowerCase(),password=str(b.password);
  if(!email||!password) return json({ok:false,error:'Email and password are required.'},400);
  const u=await env.DB.prepare('SELECT * FROM users WHERE email=? LIMIT 1').bind(email).first();
  if(!u||!(await verifyPassword(password,u.password_hash,u.password_salt))) return json({ok:false,error:'Invalid email or password.'},401);
  if(u.status==='pending') return json({ok:false,pending:true,error:'Your account is pending Master/Admin approval.'},403);
  if(u.status==='blocked') return json({ok:false,blocked:true,error:'Your account has been blocked by the Master/Admin.'},403);
  
  await ensureSessions(env);
  const token=crypto.randomUUID()+'.'+crypto.randomUUID(),expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(id,user_id,token,expires_at,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),u.id,await digest(token),expires,new Date().toISOString()).run();
  return json({ok:true,token,user:userView(u)});
}

async function logout(request,env){const s=await session(request,env);if(s){await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(await digest(s.token)).run()}return json({ok:true,message:'Logged out successfully.'});}
async function me(request,env){const s=await session(request,env);if(!s)return json({ok:false,error:'Not authenticated.'},401);return json({ok:true,user:userView(s.user)});}

async function adminUsers(request,env){const s=await requireOwner(request,env);if(s.error)return s.error;const r=await env.DB.prepare('SELECT id,email,name,mobile,business_name,country,role,status,email_verified,terms_version,created_at,updated_at FROM users ORDER BY created_at ASC').all();return json({ok:true,users:r.results||[]});}
async function adminUpsertUser(request,env){const s=await requireOwner(request,env);if(s.error)return s.error;const b=await body(request);let userId=str(b.id);const name=str(b.name),email=str(b.email).toLowerCase();if(!name||!email)return json({ok:false,error:'Name and email are required.'},400);if(!ROLES.includes(str(b.role)))return json({ok:false,error:'Invalid role.'},400);let u=userId?await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(userId).first():null;const now=new Date().toISOString();if(u){await env.DB.prepare('UPDATE users SET name=?,email=?,mobile=?,business_name=?,country=?,role=?,status=?,updated_at=? WHERE id=?').bind(name,email,str(b.mobile),str(b.businessName),str(b.country),str(b.role),['pending','active','blocked'].includes(str(b.status))?str(b.status):'pending',now,userId).run()}else{const pw=str(b.password);if(pw.length<8)return json({ok:false,error:'New user password must contain at least 8 characters.'},400);const ph=await hashPassword(pw),nid=crypto.randomUUID();await env.DB.prepare('INSERT INTO users(id,email,name,mobile,business_name,country,password_hash,password_salt,role,status,email_verified,terms_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(nid,email,name,str(b.mobile),str(b.businessName),str(b.country),ph.hash,ph.salt,str(b.role),str(b.status)||'pending',1,'1.0',now,now).run();userId=nid}await audit(env,s.user.id,'ADMIN_USER_UPSERT','users',userId,{email});return json({ok:true,id:userId});}
async function adminDeleteUser(request,env){const s=await requireOwner(request,env);if(s.error)return s.error;const b=await body(request),id=str(b.id);if(!id)return json({ok:false,error:'User id required.'},400);if(id===s.user.id)return json({ok:false,error:'The current Master account cannot be deleted here.'},400);await env.DB.prepare('DELETE FROM users WHERE id=?').bind(id).run();await audit(env,s.user.id,'ADMIN_USER_DELETE','users',id,{});return json({ok:true});}
async function adminUserStatus(request,env){const s=await requireOwner(request,env);if(s.error)return s.error;const b=await body(request),id=str(b.id),status=str(b.status);if(!id||!['pending','active','blocked'].includes(status))return json({ok:false,error:'Valid user id and status are required.'},400);if(id===s.user.id&&status!=='active')return json({ok:false,error:'The current Master account cannot be disabled.'},400);await env.DB.prepare('UPDATE users SET status=?,updated_at=? WHERE id=?').bind(status,new Date().toISOString(),id).run();await audit(env,s.user.id,'ADMIN_USER_STATUS','users',id,{status});return json({ok:true});}

async function getTerms(request,env){const r=await env.DB.prepare("SELECT data FROM master_records WHERE category='terms' ORDER BY updated_at DESC LIMIT 1").first();return json({ok:true,version:r?JSON.parse(r.data).version:'1.0',text:r?JSON.parse(r.data).text:'By registering, you agree to use SENQUARA ONE lawfully and provide accurate information.'});}
async function setTerms(request,env){const s=await requireOwner(request,env);if(s.error)return s.error;const b=await body(request),version=str(b.version)||'1.0',textv=str(b.text);if(!textv)return json({ok:false,error:'Terms text is required.'},400);const now=new Date().toISOString();await env.DB.prepare("DELETE FROM master_records WHERE category='terms'").run();await env.DB.prepare('INSERT INTO master_records(id,category,name,data,status,version,updated_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),'terms','Registration Terms',JSON.stringify({version,text:textv}), 'active',1,now).run();await audit(env,s.user.id,'TERMS_UPDATE','master_records',null,{version});return json({ok:true,version});}
async function adminAudit(request,env){const s=await requireOwner(request,env);if(s.error)return s.error;const r=await env.DB.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200').all();return json({ok:true,audit:r.results||[]});}

async function listRecords(request,env,type){
  const s=await session(request,env);
  if(!s)return json({ok:false,error:'Login required.'},401);
  await ensureCloudRecords(env);
  const r=await env.DB.prepare('SELECT id,data,version,updated_at FROM cloud_records WHERE user_id=? AND record_type=? ORDER BY updated_at DESC').bind(s.user.id,type).all();
  return json({ok:true,records:(r.results||[]).map(x=>({id:x.id,data:JSON.parse(x.data),version:x.version,updated_at:x.updated_at}))});
}
async function upsertRecord(request,env,type){
  const s=await session(request,env);
  if(!s)return json({ok:false,error:'Login required.'},401);
  await ensureCloudRecords(env);
  const b=await body(request),id=str(b.id)||crypto.randomUUID(),now=new Date().toISOString(),data=b.data??b;
  const old=await env.DB.prepare('SELECT version FROM cloud_records WHERE user_id=? AND id=?').bind(s.user.id,id).first();
  const version=Number(old?.version||0)+1;
  if(old) await env.DB.prepare('UPDATE cloud_records SET data=?,version=?,updated_at=? WHERE user_id=? AND id=?').bind(JSON.stringify(data),version,now,s.user.id,id).run();
  else await env.DB.prepare('INSERT INTO cloud_records(id,user_id,record_type,data,version,updated_at) VALUES(?,?,?,?,?,?)').bind(id,s.user.id,type,JSON.stringify(data),version,now).run();
  return json({ok:true,id,version});
}
async function ensureCloudRecords(env){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS cloud_records(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,record_type TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_cloud_records_user_type ON cloud_records(user_id,record_type)').run();
}

async function requireOwner(request,env){const s=await session(request,env);if(!s)return {error:json({ok:false,error:'Authentication required.'},401)};if(s.user.role!=='owner'||s.user.status!=='active')return {error:json({ok:false,error:'Master access required.'},403)};return s;}
async function session(request,env){const h=request.headers.get('Authorization')||'';const raw=h.startsWith('Bearer ')?h.slice(7):'';if(!raw)return null;const row=await env.DB.prepare('SELECT s.*,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? LIMIT 1').bind(await digest(raw)).first();if(!row||new Date(row.expires_at)<=new Date())return null;return {token:raw,user:row};}
async function ensureSessions(env){try{await env.DB.prepare('CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)').run();}catch{}}
async function audit(env,userId,action,entity,entityId,details){try{await env.DB.prepare('INSERT INTO audit_log(id,user_id,action,entity,entity_id,details,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,action,entity,entityId,JSON.stringify(details||{}),new Date().toISOString()).run()}catch{}}
async function hashPassword(password){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);return {salt:to64(salt),hash:to64(new Uint8Array(bits))};}
async function verifyPassword(password,hash,salt64){try{const salt=from64(salt64);const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);const a=new Uint8Array(bits),b=from64(hash);if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0;}catch{return false;}}
async function digest(v){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return to64(new Uint8Array(b));}
function userView(u){return {id:u.id,name:u.name,businessName:u.business_name||'',email:u.email,mobile:u.mobile||'',country:u.country||'',role:u.role,status:u.status,emailVerified:Number(u.email_verified||0)===1,termsVersion:u.terms_version||''};}
async function body(r){return await r.json();}function str(v){return String(v??'').trim();}function to64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}function from64(v){const s=atob(v);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
function cors(){return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors(),'Content-Type':'application/json;charset=utf-8'}});}

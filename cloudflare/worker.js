async function auditAdmin(env,principal,action,target){try{await env.ADMIN_DB.prepare("INSERT INTO admin_audit (id,actor_user_id,actor_email,action,target,result) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),principal?.id||null,principal?.username||ADMIN_LOGIN,action,target,'success').run()}catch{console.error('PBSV audit failed',action)}}
const OWNER='penyabarcelonistasvh', REPO='Penya-Barcelonista';
const ADMIN_LOGIN='cristiangarciajura';
const SITE='https://penyabarcelonistasvh.github.io/Penya-Barcelonista/';
const ALLOWED=new Set(['equips.json','club.json','noticies.json','patrocinadors.json','partits-cap-setmana.json','proxims-partits.json']);
const encoder=new TextEncoder();
function cookies(req){return Object.fromEntries((req.headers.get('Cookie')||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}))}
function respond(body,status=200,headers={}){return new Response(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
function redirect(url,headers={}){return Response.redirect(url,302)}
function cookie(name,value,maxAge){return name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge}
function b64(bytes){let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(s){const str=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(str,c=>c.charCodeAt(0))}
async function key(env){if(!env.SESSION_KEY)throw Error('SESSION_KEY missing');const hash=await crypto.subtle.digest('SHA-256',encoder.encode(env.SESSION_KEY));return crypto.subtle.importKey('raw',hash,'AES-GCM',false,['encrypt','decrypt'])}
async function seal(value,env){const iv=crypto.getRandomValues(new Uint8Array(12));const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),encoder.encode(JSON.stringify(value)));return b64(iv)+'.'+b64(new Uint8Array(bytes))}
async function unseal(value,env){try{const [a,b]=value.split('.');const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(a)},await key(env),unb64(b));return JSON.parse(new TextDecoder().decode(raw))}catch{return null}}
async function github(path,token,options={}){return fetch('https://api.github.com'+path,{...options,headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'PBSV-Admin',...(options.headers||{})}})}
function config(env){return !!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.SESSION_KEY)}
async function session(req,env){const value=cookies(req).pbsv_session;if(!value)return null;const s=await unseal(value,env);return s&&s.exp>Date.now()?s:null}
// Autenticació local preparada, però deshabilitada fins a validar autorització.
const localLoginEnabled=env=>env.LOCAL_LOGIN_ENABLED==='true';
const FILE_PERMISSION=Object.freeze({'equips.json':'teams','club.json':'club','noticies.json':'news','patrocinadors.json':'sponsors','partits-cap-setmana.json':'matches','proxims-partits.json':'matches'});
async function localPrincipal(env,s){
 if(s?.kind!=='local'||!env.ADMIN_DB||typeof s.userId!=='string'||!Number.isInteger(s.version))return null;
 const u=await env.ADMIN_DB.prepare("SELECT u.id,u.display_name,u.active,u.role,u.session_version,c.username,c.must_change_password FROM admin_users u JOIN admin_credentials c ON c.user_id=u.id WHERE u.id=?").bind(s.userId).first();
 if(!u||!u.active||u.role!=='editor'||u.session_version!==s.version)return null;
 const grants=await env.ADMIN_DB.prepare('SELECT permission FROM admin_permissions WHERE user_id=?').bind(u.id).all();
 return {id:u.id,username:u.username,displayName:u.display_name,mustChange:!!u.must_change_password,permissions:new Set((grants.results||[]).map(x=>x.permission).filter(x=>['news','matches','notifications','teams','sponsors','club'].includes(x)))};
}
function localCanNotify(principal){
 return !!principal&&!principal.mustChange&&principal.permissions.has('notifications');
}
function localCanPublish(principal,file){
 return !!principal&&!principal.mustChange&&Object.hasOwn(FILE_PERMISSION,file)&&principal.permissions.has(FILE_PERMISSION[file]);
}
async function makePasswordCredential(password){
 const salt=crypto.getRandomValues(new Uint8Array(32)),iterations=100000;
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const hash=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,256);
 return {hash:b64(new Uint8Array(hash)),salt:b64(salt),iterations};
}
async function localPasswordMatches(password,credential){
 const salt=unb64(credential.password_salt);
 const expected=unb64(credential.password_hash);
 const iterations=credential.password_iterations;
 if(salt.length!==32||expected.length!==32||![100000,600000].includes(iterations))return false;
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const actual=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,256));
 let diff=0;for(let i=0;i<32;i++)diff|=actual[i]^expected[i];return diff===0;
}
async function reserveLoginAttempt(db,bucket,now,max){
 const window=900;
 const row=await db.prepare(`INSERT INTO admin_login_limits(bucket,attempts,window_started,blocked_until) VALUES (?,1,?,0)
 ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN window_started<=? THEN 1 ELSE attempts+1 END,
 window_started=CASE WHEN window_started<=? THEN excluded.window_started ELSE window_started END
 RETURNING attempts`).bind(bucket,now,now-window,now-window).first();
 return !!row&&row.attempts<=max;
}
async function localLogin(req,env,origin){
 const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
 if(!localLoginEnabled(env))return json({error:'Accés local encara no disponible.'},503);
 if(req.method!=='POST')return json({error:'Mètode no permès.'},405);
 if(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='local-login')return json({error:'Origen no permès.'},403);
 if(!env.ADMIN_DB)return json({error:'Servei no disponible.'},503);
 let data;try{const raw=await req.text();if(raw.length>2048)return json({error:'Dades incorrectes.'},400);data=JSON.parse(raw)}catch{return json({error:'Dades incorrectes.'},400)}
 const username=String(data?.username||'').trim().toLowerCase(),password=data?.password;
 if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)||typeof password!=='string'||password.length<12||password.length>128)return json({error:'Credencials incorrectes.'},401);
 try{
 const db=env.ADMIN_DB,now=Math.floor(Date.now()/1000);
 const ip=req.headers.get('CF-Connecting-IP')||'unknown';
 const ipHash=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(ip))));
 if(!await reserveLoginAttempt(db,'ip:'+ipHash,now,30)||!await reserveLoginAttempt(db,'user:'+username,now,8))return json({error:'Massa intents. Torna-ho a provar més tard.'},429);
 const c=await db.prepare("SELECT c.*,u.active,u.role,u.session_version FROM admin_credentials c JOIN admin_users u ON u.id=c.user_id WHERE c.username=?").bind(username).first();
 const dummy={password_salt:b64(new Uint8Array(32)),password_hash:b64(new Uint8Array(32)),password_iterations:100000};
 const valid=await localPasswordMatches(password,c||dummy);
 if(!valid||!c||!c.active||c.role!=='editor')return json({error:'Credencials incorrectes.'},401);
 const value=await seal({kind:'local',userId:c.user_id,version:c.session_version,exp:Date.now()+4*3600000},env);
 return respond(JSON.stringify({ok:true,mustChange:!!c.must_change_password}),200,{'Content-Type':'application/json','Set-Cookie':cookie('pbsv_session',value,4*3600)});
 }catch{return json({error:'Servei no disponible.'},503)}
}
export default {async fetch(req,env){
 const url=new URL(req.url),origin=url.origin,path=url.pathname;
 if(!config(env)){const missing=['GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','SESSION_KEY'].filter(k=>!env[k]);return respond('Configuració pendent. Variables absents: '+missing.join(', ')+'. Revisa Production → Settings → Variables and Secrets.',503);}
 if(path==='/auth/local-login')return localLogin(req,env,origin);
 if(path==='/auth/login'){
  const state=b64(crypto.getRandomValues(new Uint8Array(24)));
  const auth=new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id',env.GITHUB_CLIENT_ID);
  auth.searchParams.set('redirect_uri',origin+'/auth/callback');
  auth.searchParams.set('scope','public_repo');auth.searchParams.set('state',state);
  return respond(null,302,{'Location':auth.toString(),'Set-Cookie':cookie('pbsv_state',state,600)});
 }
 if(path==='/auth/callback'){
  const state=cookies(req).pbsv_state;
  if(!state||state!==url.searchParams.get('state'))return respond('Validació OAuth incorrecta.',403);
  const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:origin+'/auth/callback'})});
  const result=await tokenResponse.json();
  if(!result.access_token)return respond('No s’ha pogut completar l’accés a GitHub.',403);
  const userResponse=await github('/user',result.access_token);
  if(!userResponse.ok)return respond('No s’ha pogut verificar GitHub.',403);
  const user=await userResponse.json();
  if(user.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return respond('Només el compte propietari pot publicar.',403);
  const value=await seal({token:result.access_token,login:user.login,exp:Date.now()+8*3600000},env);
  const headers=new Headers({'Location':origin+'/admin.html','Cache-Control':'no-store'});
  headers.append('Set-Cookie',cookie('pbsv_session',value,8*3600));
  headers.append('Set-Cookie',cookie('pbsv_state','',0));
  return new Response(null,{status:302,headers});
 }
 if(path==='/auth/logout')return respond(null,302,{'Location':origin+'/','Set-Cookie':cookie('pbsv_session','',0)});
 const s=await session(req,env);
 // Fail closed: local sessions must never fall through to owner-only handlers.
 let principal=null;
 if(s?.kind==='local'){
  if(!localLoginEnabled(env))return respond('Accés local encara no disponible.',403,{'Set-Cookie':cookie('pbsv_session','',0)});
  try{principal=await localPrincipal(env,s)}catch{return respond('Servei no disponible.',503)}
  if(!principal)return respond('Sessió caducada.',401,{'Set-Cookie':cookie('pbsv_session','',0)});
  if(path==='/api/auth/password'){
   const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
   if(req.method!=='POST')return json({error:'Mètode no permès.'},405);
   if(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='change-password')return json({error:'Origen no permès.'},403);
   let data;try{const raw=await req.text();if(raw.length>2048)return json({error:'Dades incorrectes.'},400);data=JSON.parse(raw)}catch{return json({error:'Dades incorrectes.'},400)}
   const old=data?.currentPassword,next=data?.newPassword;
   if(typeof old!=='string'||old.length>128||typeof next!=='string'||next.length<12||next.length>128||old===next)return json({error:'Contrasenya nova incorrecta.'},400);
   try{
    const db=env.ADMIN_DB;
    if(!await reserveLoginAttempt(db,'change:'+principal.id,Math.floor(Date.now()/1000),8))return json({error:'Massa intents.'},429);
    const c=await db.prepare('SELECT * FROM admin_credentials WHERE user_id=?').bind(principal.id).first();
    if(!c||!await localPasswordMatches(old,c))return json({error:'Contrasenya actual incorrecta.'},401);
    const n=await makePasswordCredential(next);
    // Guard against a concurrent owner reset or deactivation.
    const result=await db.batch([
     db.prepare('UPDATE admin_credentials SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND password_hash=? AND EXISTS (SELECT 1 FROM admin_users WHERE id=? AND active=1 AND session_version=?)').bind(n.hash,n.salt,n.iterations,principal.id,c.password_hash,principal.id,s.version),
     db.prepare('UPDATE admin_users SET session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1 AND session_version=? AND EXISTS (SELECT 1 FROM admin_credentials WHERE user_id=? AND password_hash=?)').bind(principal.id,s.version,principal.id,n.hash)
    ]);
    if(result.some(r=>r.meta?.changes!==1))return json({error:'Sessió modificada. Torna a entrar.'},409);
    return respond(JSON.stringify({ok:true}),200,{'Content-Type':'application/json','Set-Cookie':cookie('pbsv_session','',0)});
   }catch{return json({error:'Servei no disponible.'},503)}
  }
  if(path==='/api/me'&&req.method==='GET')return respond(JSON.stringify({authenticated:true,login:principal.username,role:'editor',permissions:[...principal.permissions],mustChange:principal.mustChange}),200,{'Content-Type':'application/json'});
  // Keep local sessions isolated from owner-only handlers.
  if(path==='/'&&req.method==='GET'){
   const modules=[['news','Notícies'],['matches','Partits'],['notifications','Notificacions'],['teams','Equips'],['sponsors','Patrocinadors'],['club','Club']];
   const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const body=principal.mustChange?"<p>Canvia la contrasenya per continuar.</p><form id=\"change\"><label>Contrasenya actual <input name=\"current\" type=\"password\" autocomplete=\"current-password\" required maxlength=\"128\"></label><label>Nova contrasenya <input name=\"next\" type=\"password\" autocomplete=\"new-password\" required minlength=\"12\" maxlength=\"128\"></label><label>Repeteix la nova contrasenya <input name=\"repeat\" type=\"password\" autocomplete=\"new-password\" required minlength=\"12\" maxlength=\"128\"></label><button>Desar contrasenya</button><p id=\"changeStatus\" role=\"status\"></p></form><script>const f=document.getElementById('change');f.addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('changeStatus'),b=f.querySelector('button');if(f.elements.next.value!==f.elements.repeat.value){status.textContent='Les contrasenyes no coincideixen.';return}b.disabled=true;try{const r=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json','X-PBSV-Action':'change-password'},body:JSON.stringify({currentPassword:f.elements.current.value,newPassword:f.elements.next.value})});const j=await r.json();if(!r.ok)throw Error(j.error||'Error');location.replace('/')}catch(e){status.textContent=e.message}finally{f.reset();b.disabled=false}});</script>":'<p>Mòduls autoritzats:</p><ul>'+modules.filter(([key])=>principal.permissions.has(key)).map(([key,label])=>'<li><a href="'+({news:'/editor-noticies.html',matches:'/editor-partits.html',notifications:'/editor-notificacions.html',teams:'/editor-equips.html',sponsors:'/editor-patrocinadors.html',club:'/editor-club.html'}[key])+'">'+label+'</a></li>').join('')+'</ul>';
   return respond('<!doctype html><html lang="ca"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administració PBSV</title><body style="font:16px system-ui;max-width:640px;margin:40px auto;padding:20px"><h1>Administració de la Penya</h1><p>Usuari: '+escapeHtml(principal.displayName)+'</p>'+body+'<a href="/auth/logout">Tancar sessió</a></body></html>',200,{'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});
  }
  if(path!=='/api/publish'&&!path.startsWith('/api/push/')){
   const pages={'/editor-noticies.html':'news','/editor-partits.html':'matches','/editor-notificacions.html':'notifications','/editor-equips.html':'teams','/editor-patrocinadors.html':'sponsors','/editor-club.html':'club'};
   const assets=new Set(['/admin-shared.css','/admin-navigation.js','/admin-news-guide.js','/publicar-github.js','/admin-preview.js','/admin-publication-status.js','/admin-editor-help.js']);
   const publicData=/^\/data\/(equips|club|noticies|patrocinadors|partits-cap-setmana|proxims-partits)\.json$/.test(path);
   if(principal.mustChange||!['GET','HEAD'].includes(req.method)||!(Object.hasOwn(pages,path)&&principal.permissions.has(pages[path])||assets.has(path)||publicData))return respond('Accés denegat.',403);
  }
  if(path.startsWith('/api/push/')&&!localCanNotify(principal))return respond('Accés denegat.',403);
 }
 if(path==='/api/me')return respond(JSON.stringify({authenticated:!!s,login:s?.login||null}),200,{'Content-Type':'application/json'});

 // Gestió d'usuaris: només propietari GitHub. Requereix binding D1 ADMIN_DB.
 if(path==='/api/admin/activity'){
  if(req.method!=='GET')return respond('Mètode no permès.',405);
  if(!s||s.kind==='local')return respond('Accés denegat.',403);
  const identity=await github('/user',s.token);
  if(!identity.ok)return respond('Sessió caducada.',401);
  if((await identity.json()).login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return respond('Accés denegat.',403);
  try{const rows=await env.ADMIN_DB.prepare("SELECT a.actor_email AS actor,a.action,a.target,a.result,a.created_at,CASE WHEN a.action IN ('user_create','user_enable','user_disable','password_reset','permissions_update') THEN COALESCE(c.username,u.display_name,a.target) ELSE a.target END AS target_label FROM admin_audit a LEFT JOIN admin_users u ON u.id=a.target LEFT JOIN admin_credentials c ON c.user_id=u.id ORDER BY a.created_at DESC,a.id DESC LIMIT 30").all();return respond(JSON.stringify({activity:rows.results||[]}),200,{'Content-Type':'application/json'})}catch{return respond('Historial no disponible.',503)}
 }
 if(path==='/api/admin/users'||path.startsWith('/api/admin/users/')){
  const json=(data,status=200)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
  if(!['GET','POST','PATCH'].includes(req.method))return json({error:'Mètode no permès.'},405);
  if(!s)return json({error:'Cal iniciar sessió.'},401);
  const identityResponse=await github('/user',s.token);
  if(!identityResponse.ok)return json({error:'Sessió caducada.'},401);
  const identity=await identityResponse.json();
  if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return json({error:'Només el propietari pot gestionar administradors.'},403);
  if(!env.ADMIN_DB)return json({error:'Base de dades d’administradors encara no configurada.'},503);
  if(req.method!=='GET'&&(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='admin-users'))return json({error:'Acció no autoritzada.'},403);
  const permissions=['news','matches','notifications','teams','sponsors','club'];
  const userId=path.startsWith('/api/admin/users/')?path.slice('/api/admin/users/'.length):null;
  if(userId&&!/^[0-9a-f-]{36}$/.test(userId))return json({error:'Identificador incorrecte.'},400);
  try{
   const db=env.ADMIN_DB;
   if(req.method==='GET'){
    if(userId)return json({error:'Ruta no disponible.'},404);
    const users=await db.prepare('SELECT u.id,u.email,u.display_name,u.role,u.active,u.created_at,c.username,c.must_change_password FROM admin_users u LEFT JOIN admin_credentials c ON c.user_id=u.id ORDER BY u.created_at DESC').all();
    const grants=await db.prepare('SELECT user_id,permission FROM admin_permissions').all();
    return json({local_credentials:true,local_login_enabled:localLoginEnabled(env)&&!!env.ADMIN_PUBLISH_TOKEN,users:(users.results||[]).map(u=>({...u,active:!!u.active,permissions:(grants.results||[]).filter(p=>p.user_id===u.id).map(p=>p.permission)}))});
   }
   const raw=await req.text();if(raw.length>4096)return json({error:'Sol·licitud massa gran.'},413);
   let data;try{data=JSON.parse(raw)}catch{return json({error:'JSON incorrecte.'},400)}
   if(req.method==='POST'){
    if(userId)return json({error:'Ruta incorrecta.'},404);
    const username=String(data?.username||'').trim().toLowerCase(),password=data?.password;
    const local=!!username||password!==undefined;
    if(local&&(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)||typeof password!=='string'||password.length<12||password.length>128))return json({error:'Usuari incorrecte o contrasenya de menys de 12 caràcters.'},400);
    const email=local?username+'@local.invalid':String(data?.email||'').trim().toLowerCase(),name=String(data?.display_name||'').trim();
    const grants=data?.permissions??['news','matches','notifications'];
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>120)return json({error:'Nom o correu incorrectes.'},400);
    if(!Array.isArray(grants)||grants.length>permissions.length||new Set(grants).size!==grants.length||grants.some(p=>!permissions.includes(p)))return json({error:'Permisos incorrectes.'},400);
    const id=crypto.randomUUID();
    // Els comptes nous queden inactius fins que s'implementi la verificació del correu.
    const queries=[db.prepare("INSERT INTO admin_users (id,email,display_name,role,active) VALUES (?,?,?,'editor',0)").bind(id,email,name),...grants.map(p=>db.prepare('INSERT INTO admin_permissions (user_id,permission) VALUES (?,?)').bind(id,p))];
    if(local){
     const credential=await makePasswordCredential(password);
     queries.push(db.prepare('INSERT INTO admin_credentials (user_id,username,password_hash,password_salt,password_iterations,must_change_password) VALUES (?,?,?,?,?,?)').bind(id,username,credential.hash,credential.salt,credential.iterations,data.must_change_password===false?0:1));
    }
    await db.batch(queries);
 await auditAdmin(env,null,'user_create',id);
 return json({ok:true,id,active:false,invitation_sent:false},201);
   }
   if(!userId)return json({error:'Falta l’identificador.'},400);
   const user=await db.prepare('SELECT id,role,active FROM admin_users WHERE id=?').bind(userId).first();
   if(!user)return json({error:'Usuari inexistent.'},404);
   if(user.role==='owner')return json({error:'El propietari no es pot modificar des d’aquesta ruta.'},403);
   const grants=data?.permissions;
   if(grants!==undefined&&(!Array.isArray(grants)||grants.length>permissions.length||new Set(grants).size!==grants.length||grants.some(p=>!permissions.includes(p))))return json({error:'Permisos incorrectes.'},400);
   if(data?.active===true){if(!localLoginEnabled(env)||!env.ADMIN_PUBLISH_TOKEN)return json({error:'Accés local encara no configurat.'},409);if(!await db.prepare('SELECT user_id FROM admin_credentials WHERE user_id=?').bind(userId).first())return json({error:'Compte sense credencials locals.'},409);}
   if(data?.active!==undefined&&typeof data.active!=='boolean')return json({error:'Estat incorrecte.'},400);
   const reset=data?.password!==undefined;
   if(reset&&(typeof data.password!=='string'||data.password.length<12||data.password.length>128))return json({error:'Contrasenya de 12 a 128 caràcters requerida.'},400);
   if(grants===undefined&&data?.active===undefined&&!reset)return json({error:'Cap canvi indicat.'},400);
   const queries=[];
   if(reset){
    const existing=await db.prepare('SELECT user_id FROM admin_credentials WHERE user_id=?').bind(userId).first();
    if(!existing)return json({error:'Aquest compte no té credencials locals.'},409);
    const credential=await makePasswordCredential(data.password);
    queries.push(db.prepare('UPDATE admin_credentials SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?').bind(credential.hash,credential.salt,credential.iterations,data.must_change_password===false?0:1,userId));
    queries.push(db.prepare('UPDATE admin_users SET session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(userId));
   }
   if(data?.active===true)queries.push(db.prepare('UPDATE admin_users SET active=1,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(userId));
 if(data?.active===false)queries.push(db.prepare('UPDATE admin_users SET active=0,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(userId));
   if(grants!==undefined){queries.push(db.prepare('DELETE FROM admin_permissions WHERE user_id=?').bind(userId));for(const p of grants)queries.push(db.prepare('INSERT INTO admin_permissions (user_id,permission) VALUES (?,?)').bind(userId,p))}
   await db.batch(queries);
 if(reset)await auditAdmin(env,null,'password_reset',userId);
 if(grants!==undefined)await auditAdmin(env,null,'permissions_update',userId);
 if(data?.active===true)await auditAdmin(env,null,'user_enable',userId);
 if(data?.active===false)await auditAdmin(env,null,'user_disable',userId);
   return json({ok:true,active:false});
  }catch(e){
   const detail=String(e?.message||'');
   const reason=/unique constraint/i.test(detail)?'El nom d’usuari ja existeix.':/iteration|PBKDF2/i.test(detail)?'Error en generar les credencials.':/no such table|no such column/i.test(detail)?'Esquema D1 incompatible.':/constraint/i.test(detail)?'Restricció de dades D1.':'No s’ha pogut completar l’operació.';
   console.error('PBSV admin users:',reason);
   return json({error:reason},/unique constraint/i.test(detail)?409:503);
  }
 }
 if(path==='/api/push/subscribers'&&req.method==='GET'){
  const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
  if(!s)return json({error:'Inicia sessió amb GitHub.'},401);
  if(!principal){
  const identityResponse=await github('/user',s.token);if(!identityResponse.ok)return json({error:'Sessió caducada.'},401);
  const identity=await identityResponse.json();if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return json({error:'Accés denegat.'},403);
  }
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return json({error:'Connexió privada no configurada.'},503);
  try{const r=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/subscribers',{headers:{Authorization:'Bearer '+env.PUSH_INTERNAL_TOKEN}});return respond(await r.text(),r.status,{'Content-Type':'application/json'})}
  catch{return json({error:'No es poden consultar els dispositius.'},502)}
 }
 if((path==='/api/push/batches'||path==='/api/push/audience')&&req.method==='GET'){
  const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
  if(!s)return json({error:'Inicia sessió amb GitHub.'},401);
  if(!principal){
  const identityResponse=await github('/user',s.token);if(!identityResponse.ok)return json({error:'Sessió caducada.'},401);
  const identity=await identityResponse.json();if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return json({error:'Accés denegat.'},403);
  }
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return json({error:'Connexió privada no configurada.'},503);
  try{const r=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/'+(path.endsWith('/audience')?'audience':'batches'),{headers:{Authorization:'Bearer '+env.PUSH_INTERNAL_TOKEN}});return respond(await r.text(),r.status,{'Content-Type':'application/json'})}
  catch{return json({error:'No es pot consultar la cua.'},502)}
 }
 if(path==='/api/push/schedule'||path==='/api/push/schedule/cancel'||path==='/api/push/schedule/health'){
  const method=req.method;
  if(!['GET','POST'].includes(method)||path.endsWith('/cancel')&&method!=='POST')return respond('Method not allowed',405);
  const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
  if(method==='POST'&&(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='push-schedule'))return json({error:'Origen no permès'},403);
  if(!s)return json({error:'Inicia sessió amb GitHub.'},401);
  if(!principal){
  const identityResponse=await github('/user',s.token);if(!identityResponse.ok)return json({error:'Sessió GitHub caducada.'},401);
  const identity=await identityResponse.json();if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return json({error:'Accés denegat.'},403);
  }
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return json({error:'Connexió privada no configurada.'},503);
  let payload;
  if(method==='POST'){try{const raw=await req.text();if(raw.length>4096)return json({error:'Dades massa grans'},413);payload=JSON.parse(raw)}catch{return json({error:'JSON incorrecte'},400)}}
  try{
   const upstream=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/schedule'+(path.endsWith('/cancel')?'/cancel':path.endsWith('/health')?'/health':''),{method,headers:{Authorization:'Bearer '+env.PUSH_INTERNAL_TOKEN,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
   if(method==='POST'&&upstream.ok)await auditAdmin(env,principal,path.endsWith('/cancel')?'push_cancel':'push_schedule','notifications');
 return respond(await upstream.text(),upstream.status,{'Content-Type':'application/json'});
  }catch{return json({error:'No es pot contactar amb el servidor de notificacions.'},502)}
 }
 if(path==='/api/push/send'||path==='/api/push/history'){
  const sending=path==='/api/push/send';
  if(req.method!==(sending?'POST':'GET'))return respond('Method not allowed',405);
  if(sending&&(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='push-send'))return respond('Forbidden',403);
  const json=(data,status)=>respond(JSON.stringify(data),status,{'Content-Type':'application/json'});
  if(!s)return json({error:'Inicia sessió amb GitHub.'},401);
  if(!principal){
  const identityResponse=await github('/user',s.token);
  if(!identityResponse.ok)return json({error:'Sessió GitHub caducada.'},401);
  const identity=await identityResponse.json();
  if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return json({error:'Accés denegat.'},403);
  }
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return json({error:'Connexió privada PUSH_SERVICE no configurada.'},503);
  let payload=null;
  if(sending){try{const raw=await req.text();if(raw.length>4096)return json({error:'Dades massa grans.'},413);payload=JSON.parse(raw)}catch{return json({error:'JSON incorrecte.'},400)}}
  try{
   const upstream=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/'+(sending?'send':'history'),{method:sending?'POST':'GET',headers:{'Authorization':'Bearer '+env.PUSH_INTERNAL_TOKEN,...(sending?{'Content-Type':'application/json'}:{})},...(sending?{body:JSON.stringify(payload)}:{})});
   if(sending&&upstream.ok)await auditAdmin(env,principal,'push_request','notifications');
 return respond(await upstream.text(),upstream.status,{'Content-Type':'application/json'});
  }catch{return json({error:'No es pot contactar amb el servidor de notificacions.'},502)}
 }
 if(path==='/api/push/test'){
  if(req.method!=='POST')return respond('Method not allowed',405);
  if(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='push-test')return respond('Forbidden',403);
  if(!s)return respond(JSON.stringify({error:'Inicia sessió amb GitHub.'}),401,{'Content-Type':'application/json'});
  if(!principal){
  const identityResponse=await github('/user',s.token);
  if(!identityResponse.ok)return respond(JSON.stringify({error:'Sessió GitHub caducada.'}),401,{'Content-Type':'application/json'});
  const identity=await identityResponse.json();
  if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return respond(JSON.stringify({error:'Accés denegat.'}),403,{'Content-Type':'application/json'});
  }
  if(!env.PUSH_SERVICE||!env.PUSH_INTERNAL_TOKEN)return respond(JSON.stringify({error:!env.PUSH_SERVICE?'Falta el Service Binding PUSH_SERVICE al Worker pbsv-admin.':'Falta el secret PUSH_INTERNAL_TOKEN al Worker pbsv-admin.'}),503,{'Content-Type':'application/json'});
  let data;try{data=await req.json()}catch{return respond(JSON.stringify({error:'JSON incorrecte.'}),400,{'Content-Type':'application/json'})}
  const title=String(data?.title||'').trim(),body=String(data?.body||'').trim();
  const deviceId=typeof data?.deviceId==='string'?data.deviceId.trim().toLowerCase():'';
  if(deviceId&&!/^[a-f0-9]{64}$/.test(deviceId))return respond(JSON.stringify({error:'Codi de dispositiu incorrecte.'}),400,{'Content-Type':'application/json'});
  if(!title||title.length>90||!body||body.length>240)return respond(JSON.stringify({error:'Títol o missatge incorrectes.'}),400,{'Content-Type':'application/json'});
  try{
   const upstream=await env.PUSH_SERVICE.fetch('https://pbsv-push.internal/api/push/admin/test',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.PUSH_INTERNAL_TOKEN},body:JSON.stringify({title,body,deviceId,url:'./avisos.html'})});
   const result=await upstream.text();
   return respond(result,upstream.status,{'Content-Type':'application/json'});
  }catch{return respond(JSON.stringify({error:'No es pot contactar amb el servidor de notificacions.'}),502,{'Content-Type':'application/json'})}
 }
 if(path==='/api/publish'){
  if(req.method!=='POST')return respond('Method not allowed',405);
  if(req.headers.get('Origin')!==origin||req.headers.get('X-PBSV-Action')!=='publish')return respond('Forbidden',403);
  if(!s)return respond('Inicia sessió amb GitHub.',401);
  if(Number(req.headers.get('Content-Length')||0)>1500000)return respond('Fitxer massa gran.',413);
  let payload;try{payload=await req.json()}catch{return respond('JSON incorrecte.',400)}
  const file=payload?.file,content=payload?.content;
  if(!ALLOWED.has(file)||typeof content!=='string'||content.length>1500000)return respond('Dades no permeses.',400);
  try{const parsed=JSON.parse(content);const collections={'equips.json':'teams','club.json':'sections','noticies.json':'noticias','patrocinadors.json':'sponsors'};if(file==='partits-cap-setmana.json' ? !(parsed.saturday&&typeof parsed.saturday==='object'&&parsed.sunday&&typeof parsed.sunday==='object') : file==='proxims-partits.json' ? !(Array.isArray(parsed.matches)&&parsed.matches.every(m=>m&&typeof m.team==='string'&&typeof m.date==='string'&&typeof m.time==='string'&&typeof m.opponent==='string'&&typeof m.venue==='string'&&typeof m.home==='boolean')) : !Array.isArray(parsed[collections[file]]))return respond('Format de dades incorrecte.',400)}catch{return respond('JSON incorrecte.',400)}
  let publishToken=s.token;
  if(principal){
   if(!localCanPublish(principal,file))return respond('Accés denegat.',403);
   if(!env.ADMIN_PUBLISH_TOKEN)return respond('Publicació local encara no configurada.',503);
   publishToken=env.ADMIN_PUBLISH_TOKEN;
  }else{
   const user=await github('/user',s.token);if(!user.ok)return respond('Sessió GitHub caducada.',401);
   const identity=await user.json();if(identity.login?.toLowerCase()!==ADMIN_LOGIN.toLowerCase())return respond('Accés denegat.',403);
  }
  const api='/repos/'+OWNER+'/'+REPO+'/contents/data/'+file;
  const current=await github(api,publishToken);if(!current.ok)return respond('No es pot llegir el fitxer a GitHub.',502);
  const metadata=await current.json();
  const bytes=encoder.encode(content);if(bytes.length>1100000)return respond('Fitxer massa gran.',413);
  const encoded=b64(bytes).replace(/-/g,'+').replace(/_/g,'/');const padded=encoded+'='.repeat((4-encoded.length%4)%4);
  const save=await github(api,publishToken,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Actualitzar '+file+' des de l’administració PBSV',content:padded,sha:metadata.sha,branch:'main'})});
  if(!save.ok)return respond(save.status===409?'Conflicte: el fitxer ha canviat. Recarrega abans de publicar.':'GitHub ha rebutjat la publicació ('+save.status+').',save.status===409?409:502);
  const out=await save.json();
  await auditAdmin(env,principal,'publish',file);

  return respond(JSON.stringify({ok:true,commit:out.commit?.sha}),200,{'Content-Type':'application/json'});
 }
 if(path==='/'&&!s){
  const localForm=localLoginEnabled(env)?`<form id="local-login"><label for="username">Usuari</label><input id="username" name="username" autocomplete="username" required minlength="3" maxlength="40"><label for="password">Contrasenya</label><input id="password" name="password" type="password" autocomplete="current-password" required minlength="12" maxlength="128"><button type="button" id="toggle-password" class="toggle" aria-pressed="false">Mostra la contrasenya</button><button type="submit">Entrar</button><p id="status" role="status" aria-live="polite"></p></form><script>
 document.getElementById("toggle-password").addEventListener("click",()=>{const p=document.getElementById("password"),b=document.getElementById("toggle-password"),show=p.type==="password";p.type=show?"text":"password";b.textContent=show?"Amaga la contrasenya":"Mostra la contrasenya";b.setAttribute("aria-pressed",String(show));});
  const form=document.getElementById('local-login');
  form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button'),status=document.getElementById('status');button.disabled=true;status.textContent='Comprovant les credencials…';try{const response=await fetch('/auth/local-login',{method:'POST',headers:{'Content-Type':'application/json','X-PBSV-Action':'local-login'},body:JSON.stringify({username:form.username.value,password:form.password.value})});const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'No s’ha pogut iniciar sessió.');location.replace('/');}catch(error){status.textContent=error.message;}finally{form.password.value='';button.disabled=false;}});
  </script><hr>`:'';
  return respond(`<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Administració PBSV</title><style>*{box-sizing:border-box}body{font:16px system-ui;background:linear-gradient(155deg,#142c5d 0%,#142c5d 35%,#edf1f8 35%,#edf1f8 100%);min-height:100vh;color:#17243c;margin:0;padding:24px}main{max-width:440px;margin:6vh auto;background:white;padding:clamp(20px,5vw,32px);border-radius:20px;border-top:6px solid #a50044;box-shadow:0 12px 40px #17243c25}.brand{font-size:13px;font-weight:800;letter-spacing:.12em;color:#a50044;margin-bottom:12px}.toggle{background:transparent;color:#174b9d;text-align:right;padding:8px 0;margin-top:4px;font-size:14px}.owner{border-top:1px solid #dbe1eb;margin-top:24px;padding-top:18px}.owner p{font-size:14px;color:#526078;margin:0}.owner a.login{background:#fff;color:#142c5d;border:1px solid #b9c5d8;margin-top:10px}h1{font-size:25px;margin:0 0 12px}label{display:block;font-weight:600;margin:16px 0 6px}input,button,a.login{width:100%;padding:13px;border-radius:8px;font:inherit}input{border:1px solid #aab4c4}button,a.login{display:block;background:#174b9d;color:white;border:0;text-align:center;text-decoration:none;margin-top:18px;font-weight:600}button:disabled{opacity:.6}hr{border:0;border-top:1px solid #ddd;margin:24px 0}#status{color:#8b1538}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #174b9d;outline-offset:3px}</style></head><body><main><div class="brand">PBSV · ÀREA PRIVADA</div><h1>Administració de la Penya</h1><p>Accedeix al teu espai de gestió.</p>${localForm}<div class="owner"><p>Accés del propietari</p><a class="login" href="/auth/login">Entrar amb GitHub</a></div></main></body></html>`,200,{'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});
 }
 if(!s)return respond(null,302,{'Location':origin+'/'});
 if(req.method!=='GET'&&req.method!=='HEAD')return respond('Method not allowed',405);
 const safe=path==='/'?'admin.html':decodeURIComponent(path.slice(1));
 if(safe.includes('..')||safe.startsWith('/')||safe.includes('\\'))return respond('Bad path',400);
 const upstream=await fetch(SITE+safe+url.search,{redirect:'follow'});
 if(!upstream.ok)return respond('No es pot carregar la pàgina.',upstream.status);
 const headers=new Headers({'Content-Type':upstream.headers.get('Content-Type')||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 return new Response(upstream.body,{status:upstream.status,headers});
}};

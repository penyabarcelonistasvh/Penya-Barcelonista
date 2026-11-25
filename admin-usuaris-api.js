'use strict';
const keys=['news','matches','notifications','teams','sponsors','club'];
const fields=[...document.querySelectorAll('.permission input')].slice(0,6);
const list=document.getElementById('adminUserList');
const state=document.getElementById('adminApiStatus');
const create=document.getElementById('createAdmin');
const nameField=document.getElementById('adminName');
const emailField=document.getElementById('adminEmail');
const passwordField=document.getElementById('adminPassword');
let users=[];
const filters=document.createElement('div');filters.className='user-filters';
const search=document.createElement('input');search.type='text';search.placeholder='Cerca per nom o usuari';search.setAttribute('aria-label','Cerca administradors');
const filter=document.createElement('select');filter.setAttribute('aria-label','Estat del compte');for(const [value,label] of [['all','Tots els comptes'],['active','Actius'],['inactive','Inactius']]){const o=document.createElement('option');o.value=value;o.textContent=label;filter.append(o)}
const total=document.createElement('p');total.className='help';filters.append(search,filter,total);list.before(filters);
function render(){const q=search.value.trim().toLocaleLowerCase('ca');let visible=0;for(const box of list.children){const match=box.dataset.search.includes(q)&&(filter.value==='all'||box.dataset.state===filter.value);box.hidden=!match;visible+=Number(match)}total.textContent=visible+' de '+users.length+' comptes · '+users.filter(u=>u.active).length+' actius';if(!visible)total.textContent+=' · Cap resultat'}
search.addEventListener('input',render);filter.addEventListener('change',render);
let local=false;
let ready=false;
let enabled=false;
const safe=t=>document.createTextNode(String(t));
function message(t){state.textContent=t;}
function row(u){
 const box=document.createElement('article');box.className='panel user-card';box.dataset.search=[u.display_name,u.username,u.email].filter(Boolean).join(' ').toLocaleLowerCase('ca');box.dataset.state=u.active?'active':'inactive';
 const heading=document.createElement('h3');heading.append(safe(u.display_name+' · '+(u.username||u.email)));box.append(heading);
 const status=document.createElement('p');status.className='user-status '+(u.active?'is-active':'is-inactive');status.append(safe(u.active?'Compte actiu':'Compte inactiu · encara no pot entrar'));box.append(status);
 if(u.role==='owner')return box;
 const choices=document.createElement('div');choices.className='permissions';
 const granted=new Set(u.permissions||[]);
 keys.forEach((key,i)=>{const label=document.createElement('label');label.className='permission';
 const check=document.createElement('input');check.type='checkbox';check.checked=granted.has(key);
 check.dataset.permission=key;label.append(check,safe(' '+['Notícies','Partits','Notificacions','Equips','Patrocinadors','Club'][i]));choices.append(label)});
 box.append(choices);
 const save=document.createElement('button');save.type='button';save.textContent='Desar permisos';
 save.addEventListener('click',async()=>{save.disabled=true;try{
 const permissions=[...choices.querySelectorAll('input:checked')].map(c=>c.dataset.permission);
 const r=await fetch('./api/admin/users/'+encodeURIComponent(u.id),{method:'PATCH',headers:{'Content-Type':'application/json','X-PBSV-Action':'admin-users'},body:JSON.stringify({permissions})});
 const result=await r.json();if(!r.ok)throw Error(result.error||'No s’han pogut desar els permisos.');
 message('Permisos actualitzats.');await load();
 }catch(e){message(e.message)}finally{save.disabled=false}});
 box.append(save);
 const disable=document.createElement('button');disable.type='button';disable.style.marginLeft='10px';disable.textContent=u.active?'Desactivar':'Activar';
 disable.disabled=!u.active&&(!enabled||!u.username);
 disable.addEventListener('click',async()=>{if(!confirm(u.active?'Vols desactivar aquest administrador?':'Vols activar aquest administrador?'))return;
 try{const r=await fetch('./api/admin/users/'+encodeURIComponent(u.id),{method:'PATCH',headers:{'Content-Type':'application/json','X-PBSV-Action':'admin-users'},body:JSON.stringify({active:!u.active})});const j=await r.json();if(!r.ok)throw Error(j.error||'Error');await load()}catch(e){message(e.message)}});
 box.append(disable);
 const reset=document.createElement('button');reset.type='button';reset.style.marginLeft='10px';reset.textContent='Restablir contrasenya';
 reset.addEventListener('click',()=>{
  if(box.querySelector('.password-reset'))return;
  const form=document.createElement('div');form.className='password-reset';
  const password=document.createElement('input');password.type='password';password.autocomplete='new-password';password.placeholder='Nova contrasenya';password.minLength=12;password.maxLength=128;
  const label=document.createElement('label');const force=document.createElement('input');force.type='checkbox';force.checked=true;label.append(force,safe(' Cal canviar la contrasenya en entrar'));
  const submit=document.createElement('button');submit.type='button';submit.textContent='Desar contrasenya';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel·lar';cancel.addEventListener('click',()=>{password.value='';form.remove()});
  submit.addEventListener('click',async()=>{if(password.value.length<12||password.value.length>128){message('Contrasenya de 12 a 128 caràcters requerida.');return}submit.disabled=true;
   try{const r=await fetch('./api/admin/users/'+encodeURIComponent(u.id),{method:'PATCH',headers:{'Content-Type':'application/json','X-PBSV-Action':'admin-users'},body:JSON.stringify({password:password.value,must_change_password:force.checked})});const j=await r.json();if(!r.ok)throw Error(j.error||'Error');await load();message('Contrasenya actualitzada. Les sessions anteriors han quedat revocades.')}catch(e){message(e.message)}finally{password.value='';submit.disabled=false}});
  form.append(password,label,submit,cancel);box.append(form);password.focus();
 });box.append(reset);return box;
}
async function load(){
 try{const r=await fetch('./api/admin/users',{cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'El servei encara no està disponible.');
 if(!Array.isArray(data.users))throw Error('Resposta inesperada del servidor.');
 local=data.local_credentials===true;
 enabled=data.local_login_enabled===true;
 ready=local;nameField.disabled=!local;emailField.disabled=!local;if(passwordField)passwordField.disabled=!local;create.disabled=!local;
 create.textContent='Desar administrador inactiu';
 users=data.users;list.replaceChildren();users.forEach(u=>list.append(row(u)));render();
 message(local?(enabled?'Accés local disponible. Activa els comptes quan estiguin preparats.':'Base de dades connectada. Accés local pendent d’activació.'):'Base de dades connectada. Pendent del desplegament de credencials locals.');
 }catch(e){ready=false;create.disabled=true;nameField.disabled=true;emailField.disabled=true;if(passwordField)passwordField.disabled=true;message('Gestió pendent d’activació: '+e.message)}
}
create.addEventListener('click',async()=>{if(!ready)return;
 const display_name=nameField.value.trim(),username=emailField.value.trim().toLowerCase(),password=passwordField?.value;
 if(!display_name||!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)||!password||password.length<12||password.length>128){message('Introdueix un nom, un usuari vàlid i una contrasenya de 12 a 128 caràcters.');return}
 create.disabled=true;
 try{const permissions=fields.filter(x=>x.checked).map(x=>x.dataset.permission);
 const r=await fetch('./api/admin/users',{method:'POST',headers:{'Content-Type':'application/json','X-PBSV-Action':'admin-users'},body:JSON.stringify({display_name,username,password,permissions,must_change_password:document.getElementById('mustChangePassword')?.checked!==false})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'No s’ha pogut crear el compte.');
 nameField.value='';emailField.value='';passwordField.value='';fields.forEach(x=>{x.checked=false;x.dispatchEvent(new Event('change'))});await load();message('Administrador desat com a inactiu.');
 }catch(e){message(e.message)}finally{if(passwordField)passwordField.value='';create.disabled=!ready}});
load();

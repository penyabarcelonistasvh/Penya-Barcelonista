'use strict';
const keys=['news','matches','notifications','teams','sponsors','club'];
const fields=[...document.querySelectorAll('.permission input')].slice(0,6);
const list=document.getElementById('adminUserList');
const state=document.getElementById('adminApiStatus');
const create=document.getElementById('createAdmin');
const nameField=document.getElementById('adminName');
const emailField=document.getElementById('adminEmail');
let ready=false;
const safe=t=>document.createTextNode(String(t));
function message(t){state.textContent=t;}
function row(u){
 const box=document.createElement('article');box.className='panel';
 const heading=document.createElement('h3');heading.append(safe(u.display_name+' · '+u.email));box.append(heading);
 const status=document.createElement('p');status.append(safe(u.active?'Compte actiu':'Compte inactiu · encara no pot entrar'));box.append(status);
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
 const disable=document.createElement('button');disable.type='button';disable.style.marginLeft='10px';disable.textContent='Desactivar';
 disable.disabled=!u.active;
 disable.addEventListener('click',async()=>{if(!confirm('Vols desactivar aquest administrador?'))return;
 try{const r=await fetch('./api/admin/users/'+encodeURIComponent(u.id),{method:'PATCH',headers:{'Content-Type':'application/json','X-PBSV-Action':'admin-users'},body:JSON.stringify({active:false})});const j=await r.json();if(!r.ok)throw Error(j.error||'Error');await load()}catch(e){message(e.message)}});
 box.append(disable);return box;
}
async function load(){
 try{const r=await fetch('./api/admin/users',{cache:'no-store'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'El servei encara no està disponible.');
 if(!Array.isArray(data.users))throw Error('Resposta inesperada del servidor.');
 ready=true;nameField.disabled=false;emailField.disabled=false;create.disabled=false;
 create.textContent='Desar administrador inactiu';
 list.replaceChildren();data.users.forEach(u=>list.append(row(u)));
 if(!data.users.length){const p=document.createElement('p');p.textContent='Encara no hi ha administradors registrats.';list.append(p)}
 message('Base de dades connectada. Els comptes nous es creen inactius fins a habilitar la verificació per correu.');
 }catch(e){ready=false;create.disabled=true;nameField.disabled=true;emailField.disabled=true;message('Gestió pendent d’activació: '+e.message)}
}
create.addEventListener('click',async()=>{if(!ready)return;
 const display_name=nameField.value.trim(),email=emailField.value.trim();
 if(!display_name||!emailField.validity.valid||!email){message('Introdueix un nom i un correu vàlids.');return}
 create.disabled=true;
 try{const permissions=fields.filter(x=>x.checked).map(x=>x.dataset.permission);
 const r=await fetch('./api/admin/users',{method:'POST',headers:{'Content-Type':'application/json','X-PBSV-Action':'admin-users'},body:JSON.stringify({display_name,email,permissions})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'No s’ha pogut crear el compte.');
 nameField.value='';emailField.value='';await load();message('Administrador desat com a inactiu. Encara no s’ha enviat cap invitació.');
 }catch(e){message(e.message)}finally{create.disabled=!ready}});
load();

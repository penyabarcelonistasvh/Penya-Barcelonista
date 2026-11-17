(()=>{'use strict';
const modules=[
 {name:'Notícies',key:'pbsv-news-editor-v1',file:'noticies.json',field:'noticias',href:'./editor-noticies.html',normalize:a=>a.map(n=>({id:n.id||'',titulo:n.titulo||'',fecha:n.fecha||'',resumen:n.resumen||'',imagen:n.imagen||'',enlace:n.enlace||'',portada:n.portada!==false}))},
 {name:'Patrocinadors',key:'pbsv-editor-patrocinadors-v1',file:'patrocinadors.json',field:'sponsors',href:'./editor-patrocinadors.html'},
 {name:'Equips',key:'pbsv-teams-editor-v1',file:'equips.json',field:'teams',href:'./editor-equips.html'},
 {name:'El club',key:'pbsv-club-editor-v1',file:'club.json',field:'sections',href:'./editor-club.html'}
];
const root=document.getElementById('draftOverview');if(!root)return;
const canonical=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
async function check(m){
 const row=document.createElement('div');row.className='draft-row';
 const label=document.createElement('strong');label.textContent=m.name;
 const state=document.createElement('span');state.textContent='Comprovant…';
 const link=document.createElement('a');link.href=m.href;link.textContent='Obrir editor';
 row.append(label,state,link);root.append(row);
 let local;
 try{const raw=localStorage.getItem(m.key);if(raw===null){state.textContent='Sense esborrany local en aquest navegador';return}local=JSON.parse(raw);if(!Array.isArray(local))throw Error('Format incorrecte')}
 catch{state.textContent='No es pot llegir l’esborrany local';row.classList.add('draft-warning');return}
 try{const r=await fetch('./data/'+m.file+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const body=await r.json();if(!Array.isArray(body[m.field]))throw Error('Format incorrecte');
 const normalize=m.normalize||((a)=>a);
 const same=canonical(normalize(local))===canonical(normalize(body[m.field]));
 state.textContent=same?'Coincideix amb el fitxer públic':'Canvis locals diferents del fitxer públic';
 row.classList.add(same?'draft-ok':'draft-warning');
 }catch{state.textContent='No es pot comprovar el fitxer públic';row.classList.add('draft-warning')}
}
async function refresh(){root.replaceChildren();await Promise.all(modules.map(check))}
document.getElementById('refreshDrafts')?.addEventListener('click',refresh);refresh();
})();
/* Estat de publicació dels editors. Compara les dades preparades amb el fitxer públic. */
(()=>{'use strict';
const config={
 'editor-equips.html':['equips.json','teams','data'],
 'editor-patrocinadors.html':['patrocinadors.json','sponsors','data'],
 'editor-club.html':['club.json','sections','json']
};
const page=location.pathname.split('/').pop(),cfg=config[page];if(!cfg)return;
const [file,field,fn]=cfg;const main=document.querySelector('main');if(!main)return;
const state=document.createElement('div');state.id='pbsvPublicationState';state.setAttribute('role','status');state.setAttribute('aria-live','polite');
state.style.cssText='border-left:4px solid #d99b21;background:#fff8e9;padding:13px 15px;border-radius:10px;margin:16px 0;line-height:1.5';
const heading=main.querySelector('h1');heading?.insertAdjacentElement('afterend',state);
let published=null,verified=false,accepted=null,timer;
const canonical=value=>JSON.stringify(value,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const current=()=>{const raw=fn==='json'?json():data();return JSON.parse(raw)[field]};
function show(){try{const local=canonical(current());if(!verified){state.textContent='No s’ha pogut comprovar el fitxer públic. Els canvis de l’editor no es publiquen fins que confirmes la publicació.';return}
if(local===published){state.style.borderLeftColor='#258553';state.style.background='#edf9f1';state.textContent='✓ Les dades preparades coincideixen amb el fitxer públic consultat.'}
else if(accepted===local){state.style.borderLeftColor='#174b9d';state.style.background='#eaf1fc';state.textContent='✓ GitHub ha acceptat la publicació. Encara no s’ha comprovat l’actualització del fitxer públic.'}
else{state.style.borderLeftColor='#d99b21';state.style.background='#fff8e9';state.textContent='● Canvis preparats en aquest navegador, pendents de publicació o diferents del fitxer públic.'}
}catch{state.textContent='No s’ha pogut determinar l’estat de publicació.'}}
async function check(){try{const r=await fetch('./data/'+file+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const body=await r.json();if(!Array.isArray(body[field]))throw Error('Format inesperat');published=canonical(body[field]);verified=true;show()}catch{verified=false;show()}}
window.addEventListener('pbsv:published',e=>{if(e.detail?.file!==file)return;try{accepted=canonical(JSON.parse(e.detail.content)[field]);show()}catch{}});
main.addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(show,200)});
window.addEventListener('storage',show);
state.textContent='Comprovant les dades publicades…';check();
const refresh=document.createElement('button');refresh.type='button';refresh.textContent='↻ Comprovar publicació';refresh.className='secondary';refresh.style.margin='0 0 12px';refresh.onclick=check;state.insertAdjacentElement('afterend',refresh);
})();
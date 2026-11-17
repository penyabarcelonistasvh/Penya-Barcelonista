(()=>{'use strict';function init(){const grid=document.querySelector('#home .quick-grid');if(!grid)return;const cards=[...grid.querySelectorAll(':scope > .quick')];for(const card of cards){const heading=card.querySelector('h3')?.textContent?.trim();if(heading==='Els nostres equips'){card.remove();continue}const target=heading==='Botiga oficial'?'store':heading==='La nostra història'?'club':null;if(!target)continue;card.setAttribute('role','button');card.tabIndex=0;card.dataset.quickTarget=target;card.setAttribute('aria-label',heading);card.addEventListener('click',()=>document.querySelector('#mainNav [data-view="'+target+'"]')?.click());card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click()}})}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()})();
/* PBSV: logotips dels patrocinadors del menú principal. */
(()=>{'use strict';
async function updateSponsorImages(){
 const grid=document.getElementById('pbsvSponsorGrid');if(!grid)return;
 try{
  const response=await fetch('./data/patrocinadors.json?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('No es poden carregar els patrocinadors');
  const data=await response.json();
  if(!Array.isArray(data.sponsors))return;
  const items=data.sponsors.filter(s=>typeof s.name==='string'&&s.name.trim());
  if(!items.length)return;
  const cards=items.map(s=>{
   const card=document.createElement('article');card.className='pbsv-sponsor-card';
   const logo=document.createElement('div');logo.className='pbsv-sponsor-logo';
   const valid=typeof s.image==='string'&&(/^(?:assets\/|\.\/|https:\/\/)/.test(s.image)||/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(s.image));
   if(valid){const img=document.createElement('img');img.src=s.image;img.alt=s.name;img.loading='lazy';img.onerror=()=>logo.replaceChildren(document.createTextNode(s.name));logo.append(img)}
   else logo.textContent=s.name;
   const body=document.createElement('div');body.className='pbsv-sponsor-content';
   const name=document.createElement('h3');name.textContent=s.name;
   body.append(name);
   if(typeof s.url==='string'&&/^https:\/\//i.test(s.url)){const link=document.createElement('a');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Visitar ↗';body.append(link)}
   card.append(logo,body);return card;
  });
  grid.replaceChildren(...cards);
 }catch(err){console.warn('PBSV sponsor logos:',err)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateSponsorImages,{once:true});else updateSponsorImages();
})();

/* PBSV: la campana del menú obre directament la subscripció push real. */
(()=>{'use strict';
 function initBell(){
  const bell=document.getElementById('pbsvBell');if(!bell)return;
  bell.setAttribute('aria-label','Activar o gestionar notificacions de la Penya');
  bell.setAttribute('title','Notificacions de la Penya');
  bell.removeAttribute('aria-haspopup');bell.removeAttribute('aria-controls');bell.removeAttribute('aria-expanded');
  bell.addEventListener('click',event=>{
   event.preventDefault();event.stopImmediatePropagation();
   const url=new URL('./avisos.html',document.baseURI);url.searchParams.set('v','20261113-2');window.location.assign(url.href);
  },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initBell,{once:true});else initBell();
})();

/* Accés discret a la instal·lació, sense alterar la navegació existent. */
(()=>{'use strict';function initInstall(){
 if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)return;
 const grid=document.querySelector('#home .quick-grid');if(!grid||document.getElementById('pbsv-install-card'))return;
 const link=document.createElement('a');link.id='pbsv-install-card';link.href=new URL('./installar.html',document.baseURI).href;link.className='quick';link.style.cssText='display:block;text-decoration:none;color:inherit;cursor:pointer';
 const h=document.createElement('h3');h.textContent='📲 Instal·la l’app';const p=document.createElement('p');p.textContent='Porta la Penya al teu mòbil en un moment';link.append(h,p);grid.append(link);
 }if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initInstall,{once:true});else initInstall();})();

/* Retirar l'avís fix de la jornada del 7–8 de novembre, sense tocar els partits. */
(()=>{'use strict';
 const outdated=/Agenda del cap de setmana del 7\s*[–-]\s*8 de novembre de 2026[\s\S]*?no un calendari actualitzat automàticament\./iu;
 function removeNotice(){
  const home=document.getElementById('home');if(!home)return;
  const walker=document.createTreeWalker(home,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   if(!outdated.test(node.textContent||''))continue;
   let target=node.parentElement;
   if(!target)return;
   // Pujar només per contenidors que contenen exclusivament l'avís.
   for(let i=0;i<4;i++){
    const parent=target.parentElement;
    if(!parent||parent===home||['MAIN','BODY','HTML'].includes(parent.tagName))break;
    const text=(parent.textContent||'').replace(/\s+/g,' ').trim();
    if(!outdated.test(text)||text.replace(outdated,'').trim())break;
    target=parent;
   }
   target.remove();
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeNotice,{once:true});else removeNotice();
})();

/* Poliment mòbil i accessibilitat: només estils, cap canvi de funcionalitat. */
(()=>{'use strict';
 if(document.getElementById('pbsv-mobile-polish-20261118'))return;
 const style=document.createElement('style');style.id='pbsv-mobile-polish-20261118';
 style.textContent=`@media(max-width:800px){
 .navwrap{gap:9px;padding:10px 14px}
 .menu-toggle,.lang-switch,.pbsv-bell{min-height:44px;min-width:44px}
 #mainNav button{min-height:46px}
 .hero-actions .btn{min-height:44px}
 }
 @media(max-width:520px){
 .navwrap{gap:7px;padding:9px 12px}
 .brand{gap:8px}.brandname{font-size:11px;letter-spacing:0}
 .brandname small{font-size:9px;letter-spacing:.06em}
 .brand img{width:39px;height:39px;flex-shrink:0}
 main{padding-left:12px;padding-right:12px}
 .hero{min-height:0;padding:28px 20px 32px}
 .hero h1{font-size:clamp(29px,8vw,39px);line-height:1.08}
 .hero p{line-height:1.55}.hero-actions{gap:9px}
 .hero-actions .btn{flex:1 1 145px;text-align:center;padding:12px}
 .section-head h2{font-size:22px}.news-body{padding:16px}
 .news-body h3{line-height:1.35}
 .pbsv-alert-dialog{max-height:calc(100dvh - 24px);overflow:auto}
 }
 :where(button,a,input,select,textarea):focus-visible{outline:3px solid #f2c51d;outline-offset:3px}
 @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}`;
 document.head.append(style);
})();

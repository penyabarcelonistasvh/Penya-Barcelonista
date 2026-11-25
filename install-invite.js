/* PBSV: invitació d'instal·lació progressiva, sense interferir amb la navegació. */
(()=>{'use strict';
const key='pbsv-install-invite-dismissed-v1';
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const android=/Android/i.test(navigator.userAgent);
let deferred=null,dialog=null,opened=false;
const dismissed=()=>{try{return localStorage.getItem(key)==='1'}catch{return false}};
const remember=()=>{try{localStorage.setItem(key,'1')}catch{}};
const es=()=>document.documentElement.lang==='es';
function close(save=true){if(!dialog)return;dialog.remove();dialog=null;opened=false;if(save)remember()}
function render(){if(!dialog)return;const t=es()?{heading:'¡Lleva la Penya siempre contigo!',body:'Instala la aplicación gratuita para consultar noticias, partidos, resultados y avisos.',install:'Instalar la APP',later:'Ahora no',ios:'En Safari, pulsa Compartir y selecciona «Añadir a pantalla de inicio».',android:'En Chrome, abre el menú ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio».',other:'Abre esta página en Chrome o Safari para instalar la aplicación.',open:'Ver instrucciones'}:{heading:'Porta la Penya sempre amb tu!',body:'Instal·la l’aplicació gratuïta per consultar notícies, partits, resultats i avisos.',install:'Instal·lar l’APP',later:'Ara no',ios:'A Safari, toca Compartir i selecciona «Afegir a la pantalla d’inici».',android:'A Chrome, obre el menú ⋮ i tria «Instal·lar aplicació» o «Afegeix a la pantalla d’inici».',other:'Obre aquesta pàgina a Chrome o Safari per instal·lar l’aplicació.',open:'Veure instruccions'};
dialog.querySelector('h2').textContent=t.heading;dialog.querySelector('p').textContent=t.body;const action=dialog.querySelector('[data-install-action]'),help=dialog.querySelector('[data-install-help]');action.textContent=deferred?t.install:t.open;dialog.querySelector('[data-install-later]').textContent=t.later;help.textContent=ios?t.ios:android?t.android:t.other;help.hidden=!!deferred&&!ios}
function show(){if(opened||standalone()||dismissed()||!document.body)return;opened=true;dialog=document.createElement('aside');dialog.id='pbsv-install-invite';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','false');dialog.setAttribute('aria-labelledby','pbsv-install-heading');dialog.innerHTML='<div class="pbsv-install-inner"><img src="./pbsv-icon-padded.png" width="48" height="48" alt=""><div class="pbsv-install-copy"><h2 id="pbsv-install-heading"></h2><p></p><div class="pbsv-install-actions"><button type="button" data-install-action></button><button type="button" data-install-later></button></div><small data-install-help hidden></small></div></div>';dialog.querySelector('img').src=window.PBSV_BRAND?.installation?.icon||'./pbsv-icon-padded.png';document.body.appendChild(dialog);render();dialog.querySelector('[data-install-later]').addEventListener('click',()=>close());dialog.querySelector('[data-install-action]').addEventListener('click',async()=>{if(deferred){const event=deferred;deferred=null;close(false);try{await event.prompt();const choice=await event.userChoice;if(choice?.outcome==='accepted')remember()}catch(e){console.warn('PBSV install:',e)}}else{const help=dialog?.querySelector('[data-install-help]');if(help){help.hidden=false;help.setAttribute('tabindex','-1');help.focus({preventScroll:true})}}})}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;if(dialog)render()});
window.addEventListener('appinstalled',()=>{remember();close(false)});
document.addEventListener('pbsv:languagechange',render);
if(standalone())return;
const start=()=>{if(dismissed())return;setTimeout(()=>{if(!document.hidden)show()},1800)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
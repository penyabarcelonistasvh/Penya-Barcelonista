(()=>{'use strict';
const grid=document.getElementById('resultsGrid'),count=document.getElementById('resultsCount'),filters=document.getElementById('resultsFilters');
if(!grid||!count||!filters)return;
let teams=[],selected='all';
const es=()=>document.documentElement.lang==='es';
const tr=(ca,cast)=>es()?cast:ca;
const groupNames={masc:['Masculí','Masculino'],fem:['Femení','Femenino'],genuine:['Genuïns','Genuinos']};
function validUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='www.fcf.cat'}catch{return false}}
function render(){
 grid.replaceChildren();
 const visible=teams.filter(team=>selected==='all'||team.category===selected);
 count.textContent=visible.length+' '+tr('equips','equipos')+' · '+visible.filter(team=>validUrl(team.url)).length+' '+tr('amb enllaç a la federació','con enlace a la federación');
 for(const team of visible){
  const card=document.createElement('article');card.className='results-card';
  const info=document.createElement('div'),heading=document.createElement('h3'),group=document.createElement('small');
  heading.textContent=team.name;group.textContent=(groupNames[team.category]||[team.category||'',team.category||''])[es()?1:0];
  info.append(heading,group);card.append(info);
  if(validUrl(team.url)){
   const link=document.createElement('a');link.href=team.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=tr('Veure FCF ↗','Ver FCF ↗');
   link.setAttribute('aria-label',tr('Consultar resultats i classificació de ','Consultar resultados y clasificación de ')+team.name+' (FCF)');
   card.append(link);
  }else{const pending=document.createElement('span');pending.className='results-pending';pending.textContent=tr('Enllaç pendent','Enlace pendiente');card.append(pending)}
  grid.append(card);
 }
}
filters.addEventListener('click',event=>{
 const button=event.target.closest('[data-results-group]');if(!button)return;
 selected=button.dataset.resultsGroup;
 filters.querySelectorAll('button').forEach(el=>{const active=el===button;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active))});
 render();
});
document.addEventListener('pbsv:languagechange',render);
fetch('./data/equips.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Teams unavailable');return response.json()}).then(data=>{teams=Array.isArray(data.teams)?data.teams:[];render()}).catch(()=>{count.textContent=tr('No es poden carregar els equips ara mateix.','No se pueden cargar los equipos ahora mismo.')});
})();
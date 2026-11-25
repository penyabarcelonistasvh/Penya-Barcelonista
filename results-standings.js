(()=>{'use strict';
const grid=document.getElementById('resultsGrid'),count=document.getElementById('resultsCount'),filters=document.getElementById('resultsFilters');
const search=document.getElementById('resultsSearch'),onlyButton=document.getElementById('resultsOnlyFavorites');
const favoritesSection=document.getElementById('resultsFavoritesSection'),favoritesGrid=document.getElementById('resultsFavoritesGrid');
const favoritesTitle=document.getElementById('resultsFavoritesTitle'),favoritesHelp=document.getElementById('resultsFavoritesHelp'),nextMatches=document.getElementById('resultsNextMatches');
if(!grid||!count||!filters||!search||!onlyButton||!favoritesSection||!favoritesGrid||!nextMatches)return;
let teams=[],matches=[],selected='all',onlyFavorites=false,loadError=false;
const federation=window.PBSV_BRAND?.sports||{provider:'FCF',allowedHosts:['www.fcf.cat']};
const STORAGE_KEY='pbsv-results-favorites-v1';
let favorites=[];
try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(stored))favorites=stored.filter(x=>typeof x==='string').slice(0,100)}catch(_){}
const es=()=>document.documentElement.lang==='es';
const tr=(ca,cast)=>es()?cast:ca;
const groupNames={masc:['Masculí','Masculino'],fem:['Femení','Femenino'],genuine:['Genuïns','Genuinos']};
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function validUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&federation.allowedHosts.includes(url.hostname)}catch{return false}}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(favorites))}catch(_){}}
function toggle(name){favorites=favorites.includes(name)?favorites.filter(x=>x!==name):[...favorites,name];save();render()}
function futureMatch(team){
 const now=new Date();
 return matches.filter(m=>m.team===team.name&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&/^\d{2}:\d{2}$/.test(m.time)&&new Date(m.date+'T23:59:59').getTime()>=now.getTime()).sort((a,b)=>(a.date+'T'+a.time).localeCompare(b.date+'T'+b.time))[0]||null;
}
function matchInfo(team){
 const match=futureMatch(team);if(!match)return null;
 const box=document.createElement('div');box.className='results-match';
 const title=document.createElement('strong');title.textContent=tr('Pròxim partit','Próximo partido');
 const opponent=document.createElement('div');opponent.textContent=tr('Rival: ','Rival: ')+match.opponent;
 const date=document.createElement('div');
 const formatted=new Intl.DateTimeFormat(es()?'es-ES':'ca-ES',{weekday:'short',day:'numeric',month:'short'}).format(new Date(match.date+'T12:00:00'));
 date.textContent=formatted+' · '+match.time+' h · '+tr(match.home?'A casa':'Fora de casa',match.home?'En casa':'Fuera de casa');
 const venue=document.createElement('small');venue.textContent=match.venue;
 box.append(title,opponent,date,venue);return box;
}
function cardFor(team){
 const card=document.createElement('article');card.className='results-card';
 const info=document.createElement('div'),heading=document.createElement('h3'),group=document.createElement('small'),titleRow=document.createElement('div');titleRow.className='results-title-row';
 heading.textContent=team.name;group.textContent=(groupNames[team.category]||[team.category||'',team.category||''])[es()?1:0];
 titleRow.append(heading,group);info.append(titleRow);const fixture=matchInfo(team);if(fixture)info.append(fixture);card.append(info);
 const actions=document.createElement('div');actions.className='results-card-actions';
 const star=document.createElement('button');star.type='button';star.className='results-star';
 const active=favorites.includes(team.name);star.textContent=active?'★':'☆';star.setAttribute('aria-pressed',String(active));
 star.setAttribute('aria-label',(active?tr('Treure dels favorits: ','Quitar de favoritos: '):tr('Afegir als favorits: ','Añadir a favoritos: '))+team.name);
 star.title=star.getAttribute('aria-label');star.addEventListener('click',()=>toggle(team.name));titleRow.append(star);
 if(validUrl(team.url)){
  const link=document.createElement('a');link.href=team.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=tr('Veure ','Ver ')+federation.provider+' ↗';
  link.setAttribute('aria-label',tr('Consultar resultats i classificació de ','Consultar resultados y clasificación de ')+team.name+' ('+federation.provider+')');
  actions.append(link);
 }else{const pending=document.createElement('span');pending.className='results-pending';pending.textContent=tr('Enllaç pendent','Enlace pendiente');actions.append(pending)}
 card.append(actions);return card;
}
function render(){
 grid.replaceChildren();favoritesGrid.replaceChildren();nextMatches.replaceChildren();
 search.placeholder=tr('Cerca per nom de l’equip…','Busca por nombre del equipo…');
 search.setAttribute('aria-label',tr('Cercar equips','Buscar equipos'));
 onlyButton.textContent=tr('☆ Els meus equips','☆ Mis equipos');onlyButton.classList.toggle('selected',onlyFavorites);onlyButton.setAttribute('aria-pressed',String(onlyFavorites));
 const query=norm(search.value.trim());
 const visible=teams.filter(team=>(selected==='all'||team.category===selected)&&(!onlyFavorites||favorites.includes(team.name))&&norm(team.name).includes(query));
 count.textContent=loadError?tr('No es poden carregar els equips ara mateix.','No se pueden cargar los equipos ahora mismo.'):visible.length+' '+tr('equips','equipos')+' · '+visible.filter(team=>validUrl(team.url)).length+' '+tr('amb enllaç a la federació','con enlace a la federación');
 for(const team of visible)grid.append(cardFor(team));
 if(!loadError&&teams.length&&!visible.length){const empty=document.createElement('p');empty.textContent=tr('No hi ha equips que coincideixin amb la cerca.','No hay equipos que coincidan con la búsqueda.');grid.append(empty)}
 const chosen=teams.filter(team=>favorites.includes(team.name));
 favoritesSection.hidden=!chosen.length||onlyFavorites;
 if(!favoritesSection.hidden){
  favoritesTitle.textContent=tr('★ Els meus equips favorits','★ Mis equipos favoritos');
  favoritesHelp.textContent=tr('Accés ràpid als equips que segueixes des d’aquest dispositiu.','Acceso rápido a los equipos que sigues desde este dispositivo.');
  for(const team of chosen)favoritesGrid.append(cardFor(team));
  const upcoming=chosen.filter(team=>futureMatch(team));
  const heading=document.createElement('strong');heading.textContent=tr('Pròxims partits dels meus equips','Próximos partidos de mis equipos');nextMatches.append(heading);
  const note=document.createElement('div');note.style.marginTop='7px';
  note.textContent=upcoming.length?tr('Dades dels cartells oficials del club. Confirma possibles canvis amb el club.','Datos de los carteles oficiales del club. Confirma posibles cambios con el club.'):tr('Encara no hi ha propers partits publicats per als teus favorits.','Todavía no hay próximos partidos publicados para tus favoritos.');
  nextMatches.append(note);
 }
}
filters.addEventListener('click',event=>{const button=event.target.closest('[data-results-group]');if(!button)return;selected=button.dataset.resultsGroup;filters.querySelectorAll('button').forEach(el=>{const active=el===button;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active))});render()});
search.addEventListener('input',render);
onlyButton.addEventListener('click',()=>{onlyFavorites=!onlyFavorites;render()});
document.addEventListener('pbsv:languagechange',render);
fetch('./data/proxims-partits.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Matches unavailable');return response.json()}).then(data=>{matches=Array.isArray(data.matches)?data.matches.filter(m=>m&&typeof m.team==='string'&&typeof m.opponent==='string'&&typeof m.venue==='string'):[];render()}).catch(()=>{matches=[];render()});
fetch('./data/equips.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Teams unavailable');return response.json()}).then(data=>{teams=Array.isArray(data.teams)?data.teams.filter(x=>x&&typeof x.name==='string'):[];render()}).catch(()=>{loadError=true;render()});
})();
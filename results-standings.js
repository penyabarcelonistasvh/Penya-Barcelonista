(()=>{'use strict';
const grid=document.getElementById('resultsGrid'),count=document.getElementById('resultsCount'),filters=document.getElementById('resultsFilters');
const search=document.getElementById('resultsSearch'),onlyButton=document.getElementById('resultsOnlyFavorites');
const favoritesSection=document.getElementById('resultsFavoritesSection'),favoritesGrid=document.getElementById('resultsFavoritesGrid');
const favoritesTitle=document.getElementById('resultsFavoritesTitle'),favoritesHelp=document.getElementById('resultsFavoritesHelp'),nextMatches=document.getElementById('resultsNextMatches');
if(!grid||!count||!filters||!search||!onlyButton||!favoritesSection||!favoritesGrid||!nextMatches)return;
let teams=[],selected='all',onlyFavorites=false,loadError=false;
const STORAGE_KEY='pbsv-results-favorites-v1';
let favorites=[];
try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(stored))favorites=stored.filter(x=>typeof x==='string').slice(0,100)}catch(_){}
const es=()=>document.documentElement.lang==='es';
const tr=(ca,cast)=>es()?cast:ca;
const groupNames={masc:['Masculí','Masculino'],fem:['Femení','Femenino'],genuine:['Genuïns','Genuinos']};
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function validUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='www.fcf.cat'}catch{return false}}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(favorites))}catch(_){}}
function toggle(name){favorites=favorites.includes(name)?favorites.filter(x=>x!==name):[...favorites,name];save();render()}
function cardFor(team){
 const card=document.createElement('article');card.className='results-card';
 const info=document.createElement('div'),heading=document.createElement('h3'),group=document.createElement('small');
 heading.textContent=team.name;group.textContent=(groupNames[team.category]||[team.category||'',team.category||''])[es()?1:0];
 info.append(heading,group);card.append(info);
 const actions=document.createElement('div');actions.className='results-card-actions';
 const star=document.createElement('button');star.type='button';star.className='results-star';
 const active=favorites.includes(team.name);star.textContent=active?'★':'☆';star.setAttribute('aria-pressed',String(active));
 star.setAttribute('aria-label',(active?tr('Treure dels favorits: ','Quitar de favoritos: '):tr('Afegir als favorits: ','Añadir a favoritos: '))+team.name);
 star.title=star.getAttribute('aria-label');star.addEventListener('click',()=>toggle(team.name));actions.append(star);
 if(validUrl(team.url)){
  const link=document.createElement('a');link.href=team.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=tr('Veure FCF ↗','Ver FCF ↗');
  link.setAttribute('aria-label',tr('Consultar resultats i classificació de ','Consultar resultados y clasificación de ')+team.name+' (FCF)');
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
  const heading=document.createElement('strong');heading.textContent=tr('Pròxims partits: ','Próximos partidos: ');nextMatches.append(heading);
  nextMatches.append(document.createTextNode(tr('consulta el calendari oficial de cada equip a la FCF. ','consulta el calendario oficial de cada equipo en la FCF. ')));
  for(const team of chosen){if(!validUrl(team.url))continue;const link=document.createElement('a');link.href=team.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=team.name;link.setAttribute('aria-label',tr('Consultar competició i calendari de ','Consultar competición y calendario de ')+team.name);nextMatches.append(link,document.createTextNode(' · '))}
  const note=document.createElement('div');note.textContent=tr('Els horaris dels pròxims partits encara no estan sincronitzats amb la federació.','Los horarios de los próximos partidos todavía no están sincronizados con la federación.');note.style.marginTop='7px';nextMatches.append(note);
 }
}
filters.addEventListener('click',event=>{const button=event.target.closest('[data-results-group]');if(!button)return;selected=button.dataset.resultsGroup;filters.querySelectorAll('button').forEach(el=>{const active=el===button;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active))});render()});
search.addEventListener('input',render);
onlyButton.addEventListener('click',()=>{onlyFavorites=!onlyFavorites;render()});
document.addEventListener('pbsv:languagechange',render);
fetch('./data/equips.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('Teams unavailable');return response.json()}).then(data=>{teams=Array.isArray(data.teams)?data.teams.filter(x=>x&&typeof x.name==='string'):[];render()}).catch(()=>{loadError=true;render()});
})();
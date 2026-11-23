/* Guia de gestió: només presentació, sense modificar editors ni publicació. */
(()=>{'use strict';
const nav=document.querySelector('.quick-actions');
if(!nav||document.getElementById('pbsvEasyStart'))return;
const style=document.createElement('style');
style.textContent=`
#pbsvEasyStart{background:#fff;border:1px solid #dce4f0;border-radius:16px;padding:20px;margin:18px 0 22px}
#pbsvEasyStart h2{margin:0 0 8px;font-size:22px}
#pbsvEasyStart p{color:#526580;line-height:1.55;margin:0 0 14px}
#pbsvEasyStart .easy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#pbsvEasyStart .easy-step{border:1px solid #dce4f0;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px}
#pbsvEasyStart .easy-step strong{font-size:17px}
#pbsvEasyStart .easy-step span{font-size:14px;color:#526580;line-height:1.5;flex:1}
#pbsvEasyStart .easy-step a{display:block;min-height:46px;padding:12px 10px;border-radius:9px;text-align:center;background:#174b9d;color:#fff;font-weight:750;text-decoration:none}
#pbsvEasyStart .easy-step a:focus-visible{outline:3px solid #e1ad36;outline-offset:2px}
#pbsvEasyStart .easy-note{font-size:13px;margin:14px 0 0;color:#526580}
@media(max-width:680px){#pbsvEasyStart{padding:16px}#pbsvEasyStart .easy-grid{grid-template-columns:1fr}#pbsvEasyStart .easy-step{padding:14px}}
`;
document.head.append(style);
const section=document.createElement('section');
section.id='pbsvEasyStart';
section.setAttribute('aria-labelledby','pbsvEasyStartTitle');
const heading=document.createElement('h2');heading.id='pbsvEasyStartTitle';heading.textContent='Què vols fer avui?';
const intro=document.createElement('p');intro.textContent='Tria una tasca. No cal tocar fitxers ni configuracions tècniques.';
section.append(heading,intro);
const grid=document.createElement('div');grid.className='easy-grid';
const actions=[
 ['📰','Publicar una notícia','Escriu la notícia, revisa com queda i publica-la.','./editor-noticies.html','Gestionar notícies'],
 ['⚽','Actualitzar els partits','Canvia els cartells del cap de setmana quan els tinguis preparats.','./editor-partits.html','Gestionar partits'],
 ['🔔','Enviar un avís','Prepara el missatge i confirma l’enviament als socis.','./editor-notificacions.html','Gestionar avisos']
];
for(const [emoji,title,description,url,action] of actions){
 const card=document.createElement('div');card.className='easy-step';
 const strong=document.createElement('strong');strong.textContent=emoji+' '+title;
 const info=document.createElement('span');info.textContent=description;
 const link=document.createElement('a');link.href=url;link.textContent=action;
 card.append(strong,info,link);grid.append(card);
}
section.append(grid);
const note=document.createElement('p');note.className='easy-note';note.textContent='Recorda: desar un esborrany no és publicar. Comprova sempre el resultat abans de confirmar els canvis.';
section.append(note);
nav.insertAdjacentElement('beforebegin',section);
})();
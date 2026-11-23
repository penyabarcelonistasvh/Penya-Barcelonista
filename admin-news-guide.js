/* Guia visual no intrusiva: no llegeix ni modifica dades, formularis o publicació. */
(()=>{'use strict';
const main=document.querySelector('main'),title=main?.querySelector('h1');
if(!main||!title||document.getElementById('pbsvNewsGuide'))return;
const style=document.createElement('style');
style.textContent=`
#pbsvNewsGuide{background:#fff;border:1px solid #dce4f0;border-radius:14px;padding:16px;margin:16px 0}
#pbsvNewsGuide h2{font-size:19px;margin:0 0 12px;color:#172947}
#pbsvNewsGuide ol{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0;margin:0}
#pbsvNewsGuide li{padding:12px;background:#f3f6fb;border-radius:10px;line-height:1.5;font-size:14px}
#pbsvNewsGuide li strong{display:block;color:#153769;font-size:15px}
#pbsvNewsGuide p{font-size:13px;line-height:1.5;color:#53647c;margin:12px 0 0}
@media(max-width:640px){#pbsvNewsGuide ol{grid-template-columns:1fr}}
`;
document.head.append(style);
const section=document.createElement('section');
section.id='pbsvNewsGuide';section.setAttribute('aria-label','Passos per publicar una notícia');
const heading=document.createElement('h2');heading.textContent='Publicar una notícia és fàcil';
const list=document.createElement('ol');
for(const [headingText,detail] of [
 ['1. Escriu','Omple el títol, la data i el resum.'],
 ['2. Desa','Prem «Afegir notícia» o «Desar canvis» per preparar-la.'],
 ['3. Publica','Revisa els canvis i prem «Guardar i publicar automàticament» al panell privat.']
]){const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=headingText;li.append(strong,document.createTextNode(detail));list.append(li)}
const note=document.createElement('p');note.textContent='Important: desar una notícia només la prepara en aquest navegador. No es veurà a la web fins que la publiquis. Si tens un esborrany diferent, revisa’l abans de recarregar les notícies publicades.';
section.append(heading,list,note);
title.insertAdjacentElement('afterend',section);
})();
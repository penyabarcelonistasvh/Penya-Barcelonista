/* Ajuda visual compartida, sense accés a dades ni formularis. */
(()=>{'use strict';
const guides={
 'editor-partits.html':{title:'Actualitzar els partits en 3 passos',steps:[
 ['1. Revisa','Comprova les dades i els cartells de dissabte i diumenge.'],
 ['2. Comprova','Mira la vista prèvia abans de publicar.'],
 ['3. Publica','Prem «Desar i publicar els dos partits» i comprova el missatge de resultat.']],
 note:'Atenció: «Recarregar publicats» pot descartar canvis locals. Revisa els dos dies abans de confirmar.'},
 'editor-equips.html':{title:'Gestionar un equip en 3 passos',steps:[
 ['1. Edita','Omple o actualitza la fitxa de l’equip.'],
 ['2. Desa','Prem «Desar fitxa» per preparar els canvis en aquest navegador.'],
 ['3. Publica','Revisa la vista prèvia i publica des del panell privat.']],
 note:'Desar una fitxa no la publica. Si tens un esborrany, revisa’l abans de recarregar dades publicades.'},
 'editor-patrocinadors.html':{title:'Gestionar patrocinadors en 3 passos',steps:[
 ['1. Edita','Indica el nom, l’enllaç i, si vols, el logotip.'],
 ['2. Desa','Prem «Desar fitxa» per preparar els canvis.'],
 ['3. Publica','Revisa les dades i publica des del panell privat.']],
 note:'Els canvis preparats són locals fins que es publiquen. Recarregar dades publicades pot descartar canvis no desats.'}
};
const page=location.pathname.split('/').pop(),cfg=guides[page];if(!cfg)return;
const main=document.querySelector('main'),h1=main?.querySelector('h1');
if(!h1||document.getElementById('pbsvEditorHelp'))return;
const style=document.createElement('style');
style.textContent=`
#pbsvEditorHelp{background:#fff;border:1px solid #dce4f0;border-radius:14px;padding:16px;margin:16px 0}
#pbsvEditorHelp h2{font-size:19px;margin:0 0 12px;color:#172947}
#pbsvEditorHelp ol{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0;margin:0}
#pbsvEditorHelp li{padding:12px;background:#f3f6fb;border-radius:10px;line-height:1.5;font-size:14px}
#pbsvEditorHelp li strong{display:block;color:#153769;font-size:15px}
#pbsvEditorHelp p{font-size:13px;line-height:1.5;color:#53647c;margin:12px 0 0}
@media(max-width:640px){#pbsvEditorHelp ol{grid-template-columns:1fr}}
`;
document.head.append(style);
const section=document.createElement('section');section.id='pbsvEditorHelp';
section.setAttribute('aria-label','Guia ràpida de gestió');
const heading=document.createElement('h2');heading.textContent=cfg.title;
const list=document.createElement('ol');
for(const [title,detail] of cfg.steps){const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=title;li.append(strong,document.createTextNode(detail));list.append(li)}
const note=document.createElement('p');note.textContent=cfg.note;
section.append(heading,list,note);
h1.insertAdjacentElement('afterend',section);
})();
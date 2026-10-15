import './styles.css';
import {loadState,saveState} from './data/store';
import {App} from './ui';
async function start(){
 const root=document.getElementById('app');if(!root)return;
 try{
  const state=await loadState();
  const app=new App(root,state,saveState);
  app.render();
 }catch(err){
  const panel=document.createElement('section');panel.className='critical-error';
  const title=document.createElement('h1');title.textContent='Impossibile aprire l’archivio locale';
  const p=document.createElement('p');p.textContent=String(err);
  const advice=document.createElement('p');advice.textContent='La vecchia versione e il relativo archivio non sono stati modificati. Verifica le impostazioni del browser, poi riprova.';
  panel.append(title,p,advice);root.replaceChildren(panel);
  console.error(err);
 }
}
void start();

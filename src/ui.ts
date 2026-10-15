import Chart from 'chart.js/auto';
import course from './data/curriculum.json';
import {quizzes} from './academy/quiz';
import type {AppPage,AppState,Movement,Trade,Review,Portfolio,LessonProgress} from './types';
import {accountBalance,allocatedOnAccount,cashTotal,cashflow,centsToEuros,eurosToCents,goalAllocated,holdings,investmentValue,localDate,localMonth,money,netWorth,simulate,validDate,uid,unallocatedCash,validateMovement,validateTrade} from './finance';
import {backupPayload,migrateV1,parseBackup} from './data/store';

type Save=(state:AppState)=>Promise<void>;
type FormValues={get:(key:string)=>string};
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const euro=(n:number)=>centsToEuros(n);
const titleCase=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
const label=(text:string,field:string)=>'<label>'+text+field+'</label>';
const input=(name:string,title:string,value:string|number='',type='text',attrs='')=>label(title,'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+attrs+' required>');
const opt=(id:string,name:string,sel='')=>'<option value="'+esc(id)+'" '+(id===sel?'selected':'')+'>'+esc(name)+'</option>';
const amount=(cents:number)=>money(cents);
const str=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const num=(f:FormData,k:string)=>eurosToCents(str(f,k));
const line=(a:string,b:string)=>'<div class="row between"><span class="muted">'+a+'</span><strong>'+b+'</strong></div>';
const totalWeeks=course.flatMap((m,mi)=>m.units.map((u,ui)=>({id:'INV-W'+String(mi*4+ui+1).padStart(2,'0'),month:mi+1,unit:u})));
const nav:[AppPage,string,string][]=[
 ['dashboard','▦','Panoramica'],['accounts','◈','Patrimonio'],['goals','◎','Obiettivi'],
 ['monthly','▤','Check mensile'],['simulation','⌁','Simulatore'],['portfolio','◉','Portafoglio'],
 ['academy','✎','Accademia'],['assistant','✳','Assistente AI'],['settings','⚙','Impostazioni']
];
const pageNames:Record<AppPage,string>={
 dashboard:'La tua panoramica',accounts:'Patrimonio e movimenti',goals:'I tuoi obiettivi',
 monthly:'Check mensile',simulation:'Simulatore finanziario',portfolio:'Portafogli e strumenti',
 academy:'Accademia finanziaria',assistant:'Assistente AI contestuale',settings:'Impostazioni e backup'
};
export class App {
 private page:AppPage='dashboard';
 private chart:Chart|null=null;
 private selectedLesson='INV-W01';
 private selectedMonth=localMonth();
 private scenario={initialCents:0,monthlyCents:100000,years:10,annualRate:4,inflation:2,annualFee:0.2};
 private prompt='';
 private notice='';
 constructor(private root:HTMLElement,private state:AppState,private save:Save){
  root.addEventListener('click',event=>{void this.onClick(event)});
  root.addEventListener('submit',event=>{event.preventDefault();void this.onSubmit(event)});
  root.addEventListener('change',event=>{void this.onChange(event)});
 }
 private async edit(callback:(draft:AppState)=>void){
  try{
   const draft=structuredClone(this.state);callback(draft);
   await this.save(draft);this.state=draft;this.notice='Modifiche salvate nel dispositivo.';this.render();
  }catch(error){alert('Operazione non completata: '+String(error));}
 }
 private pageMarkup(){
  switch(this.page){
   case 'dashboard':return this.dashboard();
   case 'accounts':return this.accounts();
   case 'goals':return this.goals();
   case 'monthly':return this.monthly();
   case 'simulation':return this.simulation();
   case 'portfolio':return this.portfolio();
   case 'academy':return this.academy();
   case 'assistant':return this.assistant();
   case 'settings':return this.settings();
  }
 }
 render(){
  this.chart?.destroy();this.chart=null;
  this.root.innerHTML='<div class="shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">↗</span><div>Piano Investimenti<small>VERSIONE 2.0 · SVILUPPO</small></div></div><nav class="nav" aria-label="Sezioni del sito">'+nav.map(([id,icon,text])=>'<button type="button" data-page="'+id+'" '+(this.page===id?'aria-current="page"':'')+'><span class="n-icon" aria-hidden="true">'+icon+'</span>'+text+'</button>').join('')+'</nav><div class="side-bottom">Dati conservati sul dispositivo.<br>Nessun ordine di investimento viene eseguito.</div></aside><main class="main"><header class="top"><div><div class="overline">FINANZA PERSONALE · ORGANIZZAZIONE E FORMAZIONE</div><h1>'+pageNames[this.page]+'</h1><p class="sub">Pianifica, impara e verifica i risultati reali.</p></div><div class="pill">◌ Archivio locale · '+esc(localDate())+'</div></header>'+
   (this.notice?'<div class="notice" role="status">'+esc(this.notice)+'</div>':'')+
   this.pageMarkup()+'<p class="muted" style="margin-top:30px">Progetto educativo personale. Rendimenti e dati simulati non sono garanzie. Prezzi e conti inseriti manualmente.</p></main></div>';
  this.draw();
 }
 private draw(){
  const el=this.root.querySelector<HTMLCanvasElement>('canvas[data-chart]');if(!el)return;
  if(this.page==='dashboard'){
   const reviews=[...this.state.reviews].sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
   this.chart=new Chart(el,{type:'bar',data:{labels:reviews.map(r=>r.month),datasets:[
    {label:'Entrate',data:reviews.map(r=>r.incomeCents/100),backgroundColor:'#4569e0'},
    {label:'Spese',data:reviews.map(r=>r.expensesCents/100),backgroundColor:'#e6a447'},
    {label:'Risparmio dichiarato',data:reviews.map(r=>r.savingCents/100),backgroundColor:'#1eab8b'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
  }else if(this.page==='simulation'){
   const data=simulate(this.scenario);this.chart=new Chart(el,{type:'line',data:{
    labels:data.points.map(p=>String(p.year)+' a'),
    datasets:[{label:'Capitale nominale ipotetico',data:data.points.map(p=>p.totalCents/100),borderColor:'#4569e0',tension:0.2},
    {label:'Totale versamenti',data:data.points.map(p=>p.paidCents/100),borderColor:'#15a78a',tension:0.2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});
  }
 }
 private accountOptions(selected=''){
  return this.state.accounts.map(a=>opt(a.id,a.name,selected)).join('');
 }
 private metric(name:string,value:string,description:string,color=''){
  return '<div class="card"><div class="metric-label">'+name+'</div><div class="metric '+color+'">'+value+'</div><div class="stat-note">'+description+'</div></div>';
 }
 private legacyInfo(){
  const x=this.state.legacy;if(!x)return '';
  if(x.emergencyCents===0&&x.investmentsCents===0)return '';
  return '<div class="notice warn"><strong>Valori importati da V1 da riconciliare.</strong> Fondo emergenza dichiarato: '+amount(x.emergencyCents)+', capitale investito dichiarato: '+amount(x.investmentsCents)+'. Non entrano automaticamente nel patrimonio: configura i conti e le posizioni per evitare doppi conteggi.</div>';
 }
 private dashboard(){
  const s=this.state,activeGoals=s.goals.filter(g=>g.status==='active');
  const done=totalWeeks.filter(w=>s.lessons[w.id]?.status==='done').length;
  const latest=[...s.reviews].sort((a,b)=>b.month.localeCompare(a.month))[0];
  return '<div class="notice">Il patrimonio comprende saldi dei conti e posizioni reali registrate. Le quote simulate e le riserve per obiettivi non generano patrimonio aggiuntivo.</div>'+this.legacyInfo()+
   '<div class="grid cols-4">'+
   this.metric('Patrimonio registrato',amount(netWorth(s)),'Conti + investimenti reali')+
   this.metric('Liquidità complessiva',amount(cashTotal(s)),'Compresa liquidità destinata ai broker')+
   this.metric('Liquidità non assegnata',amount(unallocatedCash(s)),'Al netto degli obiettivi',unallocatedCash(s)<0?'red':'green')+
   this.metric('Investimenti reali',amount(investmentValue(s)),'Valutazioni manuali: controlla le date')+'</div>'+
   '<div class="grid cols-2" style="margin-top:17px"><section class="card"><div class="row between"><h2>Consuntivi ultimi 12 mesi</h2><button class="btn secondary" data-page="monthly">Apri storico →</button></div>'+
   (s.reviews.length?'<div class="chart-box"><canvas data-chart="monthly" aria-label="Grafico dei consuntivi mensili"></canvas></div>':'<p class="empty">Salva il primo check mensile per vedere il grafico.</p>')+'</section>'+
   '<section class="card"><h2>Obiettivi in corso</h2><div class="stack">'+(activeGoals.length?activeGoals.map(g=>{
    const saved=goalAllocated(g),pct=g.targetCents>0?Math.min(100,Math.round(saved/g.targetCents*100)):0;
    return '<div><div class="row between"><strong>'+esc(g.title)+'</strong><span class="muted">'+amount(saved)+' / '+(g.targetCents?amount(g.targetCents):'Da definire')+'</span></div><div class="progress" style="margin-top:9px"><span style="width:'+pct+'%"></span></div></div>';
   }).join(''):'<p class="empty">Nessun obiettivo attivo.</p>')+'</div><div class="actions"><button data-page="goals" class="btn secondary">Gestisci obiettivi →</button></div></section></div>'+
   '<div class="grid cols-3" style="margin-top:17px">'+
   this.metric('Risparmio mensile previsto',amount(s.plan.targetCents),'Budget indicativo, non obbligo d’investimento')+
   this.metric('Ultimo risparmio registrato',latest?amount(latest.savingCents):'—',latest?'Consuntivo '+esc(latest.month):'Nessun consuntivo')+
   this.metric('Formazione completata',done+' / 24',Math.round(done/24*100)+'% del percorso di studio')+'</div>';
 }
 private accounts(){
  const s=this.state;
  return this.legacyInfo()+'<div class="grid cols-2"><section class="card"><h2>Conti e liquidità</h2><div class="stack">'+s.accounts.map(a=>{
   const balance=accountBalance(s,a.id),reserved=allocatedOnAccount(s,a.id);
   return '<div class="lesson">'+line(esc(a.name)+' · '+esc(a.type),'<span class="'+(balance<0?'red':'')+'">'+amount(balance)+'</span>')+
    line('Destinato agli obiettivi',amount(reserved))+line('Libero',amount(balance-reserved))+
    (balance<reserved?'<span class="red muted">Attenzione: riserve superiori al saldo.</span>':'')+'</div>';
  }).join('')+'</div><hr/><h3>Aggiungi un conto</h3><form class="form" data-form="account"><div class="form-2">'+input('name','Nome conto','','text','maxlength="80"')+
   '<label>Tipologia<select name="type">'+opt('current','Conto corrente')+opt('deposit','Conto deposito')+opt('broker','Liquidità presso broker')+opt('cash','Contanti')+'</select></label></div>'+
   input('opening','Saldo iniziale (€)',0,'number','step="0.01" min="-100000000"')+
   '<div class="panel-note">Il saldo iniziale è un punto di partenza. Non registrarlo nuovamente come entrata.</div><button class="btn" type="submit">Aggiungi conto</button></form></section>'+
   '<section class="card"><h2>Registra un movimento</h2><form data-form="movement" class="form"><div class="form-2">'+
   '<label>Operazione<select name="kind">'+opt('income','Entrata')+opt('expense','Spesa')+opt('transfer','Trasferimento tra conti')+opt('adjustment','Rettifica saldo')+'</select></label>'+
   input('date','Data',localDate(),'date')+
   input('amount','Importo (€)','','number','step="0.01"')+
   input('category','Categoria','Altro','text','maxlength="60"')+
   '<label>Conto origine (spese e trasferimenti)<select name="fromId">'+opt('','— Nessuno —')+this.accountOptions()+'</select></label>'+
   '<label>Conto destinazione (entrate e trasferimenti)<select name="toId">'+opt('','— Nessuno —')+this.accountOptions()+'</select></label></div>'+
   input('note','Descrizione facoltativa','','text','maxlength="400"')+
   '<div class="panel-note">Per i trasferimenti scegli due conti: il patrimonio resterà invariato. Le rettifiche possono essere positive o negative e non sono entrate né spese.</div><button class="btn" type="submit">Salva movimento</button></form></section></div>'+
   '<section class="card" style="margin-top:17px"><h2>Ultimi movimenti</h2><div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Importo</th><th>Conto origine</th><th>Destinazione</th><th>Note</th></tr></thead><tbody>'+
   [...s.movements].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,50).map(m=>'<tr><td>'+esc(m.date)+'</td><td>'+esc(m.kind)+'</td><td>'+amount(m.amountCents)+'</td><td>'+esc(s.accounts.find(a=>a.id===m.fromId)?.name??'—')+'</td><td>'+esc(s.accounts.find(a=>a.id===m.toId)?.name??'—')+'</td><td>'+esc(m.note)+'</td></tr>').join('')+
   '</tbody></table></div>'+(s.movements.length===0?'<div class="empty">Ancora nessun movimento.</div>':'')+'</section>';
 }
 private goals(){
  const s=this.state;
  return '<div class="notice">Un obiettivo è una riserva virtuale di liquidità esistente. Non corrisponde a un nuovo conto e non aumenta il patrimonio. I versamenti mensili programmati sono previsioni, non transazioni automatiche.</div>'+
  '<div class="grid cols-2"><section class="card"><h2>Nuovo obiettivo</h2><form class="form" data-form="goal">'+
  input('title','Nome','Progetto personale','text','maxlength="100"')+
  '<div class="form-2">'+input('target','Target (€)',0,'number','min="0" step="0.01"')+
  input('monthly','Accantonamento previsto (€ / mese)',0,'number','min="0" step="0.01"')+
  '<label>Scadenza indicativa<input type="month" name="deadline"></label>'+
  '<label>Priorità<select name="priority">'+opt('1','Alta')+opt('2','Media')+opt('3','Bassa')+'</select></label></div>'+
  '<button type="submit" class="btn">Aggiungi obiettivo</button></form></section>'+
  '<section class="card"><h2>Regole di utilizzo</h2><p class="muted">Assegna fondi soltanto dopo averli registrati su un conto. La disponibilità libera viene ricalcolata in automatico e non può essere assegnata due volte tramite il modulo.</p>'+
  line('Liquidità complessiva',amount(cashTotal(s)))+line('Liquidità libera',amount(unallocatedCash(s)))+
  '<hr/><p class="muted">Per il possibile trasferimento in Spagna puoi utilizzare un orizzonte indicativo di 36 mesi; il costo target resta da determinare.</p></section></div>'+
  '<div class="grid cols-2" style="margin-top:17px">'+s.goals.map(g=>{
    const allocated=goalAllocated(g),left=Math.max(0,g.targetCents-allocated),months=g.monthlyCents>0?Math.ceil(left/g.monthlyCents):null;
    return '<section class="card"><div class="row between"><h2>'+esc(g.title)+'</h2><span class="tag">'+esc(g.status)+'</span></div>'+
    '<div class="metric">'+amount(allocated)+'</div><div class="muted">Target: '+(g.targetCents?amount(g.targetCents):'non definito')+'</div>'+
    '<div class="progress" style="margin:12px 0"><span style="width:'+(g.targetCents?Math.min(100,Math.round(allocated/g.targetCents*100)):0)+'%"></span></div>'+
    line('Da assegnare',amount(left))+line('Previsto al mese',amount(g.monthlyCents))+
    line('Orizzonte',g.deadline?esc(g.deadline):'Non definito')+
    (months!==null?'<p class="muted">Con contributi costanti e senza rendimenti: circa '+months+' mesi per raggiungere il target residuo.</p>':'')+
    '<hr/><form data-form="allocate" class="form"><input type="hidden" name="goalId" value="'+esc(g.id)+'">'+
    '<label>Conto<select name="accountId">'+this.accountOptions()+'</select></label>'+
    input('amount','Totale da riservare su questo conto (€)',0,'number','min="0" step="0.01"')+
    '<button type="submit" class="btn secondary">Aggiorna la riserva</button></form>'+
    '<div class="actions"><button class="btn secondary" data-action="edit-goal" data-id="'+esc(g.id)+'">Modifica target</button>'+
    '<button class="btn secondary" data-action="toggle-goal" data-id="'+esc(g.id)+'">'+(g.status==='active'?'Sospendi':'Riattiva')+'</button></div></section>';
  }).join('')+'</div>';
 }
 private monthly(){
  const s=this.state,r=s.reviews.find(m=>m.month===this.selectedMonth),flow=cashflow(s,this.selectedMonth);
  return '<div class="grid cols-2"><section class="card"><h2>Consuntivo e note</h2>'+
   '<form data-form="review" class="form">'+
   '<label>Mese del controllo<input type="month" name="month" data-month-picker value="'+esc(this.selectedMonth)+'" required></label>'+
   '<div class="form-2">'+input('income','Entrate reali (€)',r?euro(r.incomeCents):euro(flow.income),'number','min="0" step="0.01"')+
   input('expenses','Spese reali (€)',r?euro(r.expensesCents):euro(flow.expenses),'number','min="0" step="0.01"')+
   input('saving','Risparmio effettivo (€)',r?euro(r.savingCents):euro(flow.income-flow.expenses),'number','step="0.01"')+
   '<label>Saldo dichiarato di fine mese (€) — opzionale<input type="number" name="balance" step="0.01" value="'+(r?.closingBalanceCents===null||r===undefined?'':euro(r.closingBalanceCents))+'"></label></div>'+
   '<label>Annotazioni<textarea name="notes" maxlength="5000">'+esc(r?.notes??'')+'</textarea></label>'+
   '<div class="panel-note">Importi dalle singole transazioni: entrate '+amount(flow.income)+' · spese '+amount(flow.expenses)+'. I dati manuali non vengono sommati ai movimenti.</div>'+
   '<div class="actions"><button class="btn" type="submit">Salva consuntivo</button><button type="button" class="btn secondary" data-action="month-current">Mese corrente</button></div></form></section>'+
   '<section class="card"><h2>Indicatori del mese selezionato</h2>'+
   line('Entrate',r?amount(r.incomeCents):'—')+
   line('Spese',r?amount(r.expensesCents):'—')+
   line('Risparmio',r?amount(r.savingCents):'—')+
   line('Differenza dal target',r?amount(r.savingCents-s.plan.targetCents):'—')+
   '<hr/><p class="muted">Salva il consuntivo per calcolare lo scostamento rispetto al target e tenere traccia delle motivazioni.</p>'+
   '<h3>Checklist</h3>'+
   ['Entrate verificate','Spese e saldo verificati','Obiettivi ricontrollati','Studio settimanale svolto'].map((c,i)=>'<label class="row" style="margin:10px 0;display:flex"><input type="checkbox" data-check="'+i+'" '+(s.checks[this.selectedMonth]?.['check-'+i]?'checked':'')+'>'+c+'</label>').join('')+
   '</section></div>'+
   '<section class="card" style="margin-top:17px"><div class="row between"><h2>Storico consuntivi</h2><button data-action="csv" class="btn secondary">Esporta CSV</button></div>'+
   '<div class="table-wrap"><table><thead><tr><th>Mese</th><th>Entrate</th><th>Spese</th><th>Risparmio</th><th>Scostamento</th><th>Ultima modifica</th></tr></thead><tbody>'+
   [...s.reviews].sort((a,b)=>b.month.localeCompare(a.month)).map(m=>'<tr><td>'+esc(m.month)+'</td><td>'+amount(m.incomeCents)+'</td><td>'+amount(m.expensesCents)+'</td><td>'+amount(m.savingCents)+'</td><td>'+amount(m.savingCents-s.plan.targetCents)+'</td><td>'+esc(m.updatedAt.slice(0,10))+'</td></tr>').join('')+'</tbody></table></div>'+
   (!s.reviews.length?'<p class="empty">Nessun mese ancora salvato.</p>':'')+'</section>';
 }
 private simulation(){
  const i=this.scenario,x=simulate(i),fmt=(v:number)=>euro(v);
  return '<div class="notice warn">I tassi sono ipotesi costanti, non previsioni dei mercati. I fondi per bisogni a breve termine richiedono valutazioni differenti dagli investimenti pluriennali.</div>'+
  '<div class="grid cols-2"><section class="card"><h2>Impostazioni della simulazione</h2><form data-form="simulation" class="form"><div class="form-2">'+
  input('initial','Capitale iniziale (€)',fmt(i.initialCents),'number','step="0.01" min="0"')+
  input('monthly','Versamento mensile (€)',fmt(i.monthlyCents),'number','step="0.01" min="0"')+
  input('years','Durata in anni',i.years,'number','step="1" min="1" max="60"')+
  input('rate','Rendimento annuo ipotetico (%)',i.annualRate,'number','step="0.1" min="-99" max="30"')+
  input('fee','Costi annuali ipotetici (%)',i.annualFee,'number','step="0.1" min="0" max="10"')+
  input('inflation','Inflazione annua ipotetica (%)',i.inflation,'number','step="0.1" min="-10" max="30"')+'</div>'+
  '<button class="btn" type="submit">Aggiorna il confronto</button></form></section>'+
  '<section class="card"><h2>Esito ipotetico</h2><div class="metric blue">'+amount(x.finalCents)+'</div><p class="muted">Capitale nominale finale</p>'+
  line('Totale versato',amount(x.paidCents))+line('Differenza nominale',amount(x.finalCents-x.paidCents))+
  line('Valore espresso in euro di oggi',amount(x.realCents))+
  '<hr/><div class="panel-note">Modello a tasso costante composto mensilmente, versamenti a fine mese, costo annuo sottratto al tasso ipotetico. Non include imposte né oscillazioni dei prezzi.</div></section></div>'+
  '<section class="card" style="margin-top:17px"><h2>Confronto tra capitale nominale e versamenti</h2><div class="chart-box"><canvas data-chart="simulation" aria-label="Grafico della simulazione"></canvas></div></section>';
 }
 private portfolio(){
  const s=this.state;const portfolioOptions=s.portfolios.map(p=>opt(p.id,p.name+' · '+(p.mode==='real'?'REALE':'SIMULATO'))).join('');
  const secOptions=s.securities.map(x=>opt(x.id,x.name+(x.isin?' · '+x.isin:''))).join('');
  return '<div class="notice">I prezzi sono inseriti manualmente. In assenza di un prezzo aggiornato il valore utilizza l’ultima quotazione dell’operazione ed è segnalato come non verificato. I portafogli simulati non modificano il patrimonio reale.</div>'+
  '<div class="grid cols-2"><section class="card"><h2>Nuovo portafoglio</h2><form data-form="portfolio" class="form">'+
  input('name','Nome portafoglio','','text','maxlength="80"')+
  '<label>Modalità<select name="mode">'+opt('simulation','Simulato')+opt('real','Reale')+'</select></label>'+
  '<label>Conto liquidità collegato (necessario per il reale)<select name="cashAccountId">'+opt('','Nessuno')+this.accountOptions()+'</select></label>'+
  '<button class="btn">Crea portafoglio</button></form></section>'+
  '<section class="card"><h2>Nuovo strumento</h2><form data-form="security" class="form">'+
  input('name','Nome strumento','','text','maxlength="120"')+
  input('isin','ISIN (facoltativo)','','text','maxlength="12"')+
  '<button class="btn">Aggiungi strumento</button></form></section></div>'+
  '<div class="grid cols-2" style="margin-top:17px"><section class="card"><h2>Registra operazione</h2><form data-form="trade" class="form"><div class="form-2">'+
  '<label>Portafoglio<select name="portfolioId" required>'+portfolioOptions+'</select></label>'+
  '<label>Strumento<select name="securityId" required>'+secOptions+'</select></label>'+
  '<label>Operazione<select name="side">'+opt('buy','Acquisto')+opt('sell','Vendita')+'</select></label>'+
  input('date','Data operazione',localDate(),'date')+
  input('quantity','Quantità',1,'number','min="0.00000001" step="any"')+
  input('price','Prezzo per unità (€)',100,'number','step="0.01" min="0"')+
  input('fees','Commissioni (€)',0,'number','step="0.01" min="0"')+'</div>'+
  '<button class="btn" '+(portfolioOptions&&secOptions?'':'disabled')+'>Registra operazione</button></form></section>'+
  '<section class="card"><h2>Aggiorna prezzo</h2><form data-form="price" class="form">'+
  '<label>Strumento<select name="securityId" required>'+secOptions+'</select></label>'+
  input('date','Data valutazione',localDate(),'date')+
  input('price','Prezzo attuale (€)',100,'number','step="0.01" min="0"')+
  '<button class="btn" '+(secOptions?'':'disabled')+'>Salva valutazione manuale</button></form>'+
  '<hr/>'+line('Valore di mercato reale',amount(investmentValue(s,'real')))+
  line('Valore di mercato simulato',amount(investmentValue(s,'simulation')))+'</section></div>'+
  '<section class="card" style="margin-top:17px"><h2>Posizioni per portafoglio</h2>'+(
   s.portfolios.length?s.portfolios.map(p=>{
    const h=holdings(s,p.id);
    return '<div class="lesson" style="margin-bottom:13px"><div class="row between"><h3>'+esc(p.name)+'</h3><span class="tag '+(p.mode==='real'?'green':'')+'">'+(p.mode==='real'?'REALE':'SIMULATO')+'</span></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Strumento</th><th>Quantità</th><th>Costo residuo</th><th>Valore</th><th>Data prezzo</th></tr></thead><tbody>'+
    h.map(x=>'<tr><td>'+esc(s.securities.find(q=>q.id===x.securityId)?.name??x.securityId)+'</td><td>'+esc(x.quantity.toFixed(6))+'</td><td>'+amount(x.costCents)+'</td><td>'+amount(x.valueCents)+'</td><td>'+esc(x.priceDate??'NON AGGIORNATO')+'</td></tr>').join('')+
    '</tbody></table></div>'+(h.length?'':'<p class="muted">Nessuna posizione aperta.</p>')+'</div>';
   }).join(''):'<p class="empty">Crea un portafoglio per iniziare.</p>')+
  '</section>';
 }
 private academy(){
  const total=totalWeeks.filter(w=>this.state.lessons[w.id]?.status==='done').length;
  const lesson=totalWeeks.find(w=>w.id===this.selectedLesson)??totalWeeks[0]!;
  const l=this.state.lessons[lesson.id]??{status:'todo',notes:'',exercise:'',quizScore:null};
  const quiz=quizzes[lesson.id]??quizzes['INV-W01']!;
  return '<div class="grid cols-3">'+this.metric('Lezioni completate',total+' / 24',Math.round(total/24*100)+'% del programma')+
  this.metric('Tempo settimanale','3 ore','72 ore complessive')+
  this.metric('Ultimo quiz',l.quizScore===null?'—':l.quizScore+'%','Lezione '+esc(lesson.id))+'</div>'+
  '<div class="grid cols-2" style="margin-top:17px"><section class="card"><h2>Percorso di 24 settimane</h2><div class="stack sm">'+
  totalWeeks.map(w=>'<button type="button" data-lesson="'+esc(w.id)+'" class="btn secondary" style="text-align:left;justify-content:space-between;'+(w.id===this.selectedLesson?'border:2px solid #5573e0;':'')+'"><span>'+esc(w.unit[0])+'</span><span>'+((this.state.lessons[w.id]?.status==='done')?'✓':'›')+'</span></button>').join('')+
  '</div></section>'+
  '<section class="card"><div class="row between"><h2>'+esc(lesson.unit[0])+'</h2><span class="tag">'+esc(lesson.id)+'</span></div>'+
  '<p class="muted">'+esc(lesson.unit[1])+'</p>'+
  '<p><strong>Attività pratica:</strong> '+esc(lesson.unit[4])+'</p>'+
  '<div class="actions"><a href="'+esc(lesson.unit[2])+'" target="_blank" rel="noopener noreferrer">Risorsa principale ↗</a>'+
  '<a href="'+esc(lesson.unit[3])+'" target="_blank" rel="noopener noreferrer">Approfondimento ↗</a></div><hr/>'+
  '<form data-form="lesson" class="form"><input type="hidden" name="lessonId" value="'+esc(lesson.id)+'">'+
  '<label>Stato<select name="status">'+['todo','doing','review','done'].map((v,i)=>opt(v,['Da iniziare','In corso','Da ripassare','Completata'][i]!,l.status)).join('')+'</select></label>'+
  '<label>I tuoi appunti<textarea name="notes" maxlength="12000">'+esc(l.notes)+'</textarea></label>'+
  '<label>Esercizio svolto<textarea name="exercise" maxlength="12000">'+esc(l.exercise)+'</textarea></label>'+
  '<button class="btn">Salva appunti e stato</button></form><hr/>'+
  '<h3>Quiz di verifica</h3><p class="muted">'+esc(quiz.question)+'</p>'+
  '<form data-form="quiz" class="form"><input type="hidden" name="lessonId" value="'+esc(lesson.id)+'">'+
  quiz.answers.map((x,i)=>'<label class="row" style="display:flex"><input type="radio" name="answer" value="'+i+'" required>'+esc(x)+'</label>').join('')+
  '<button class="btn secondary">Verifica risposta</button></form>'+
  (l.quizScore!==null?'<p class="panel-note">Risultato salvato: '+l.quizScore+'%. La risposta e la spiegazione vengono mostrate al momento della correzione.</p>':'')+
  '<div class="actions"><button class="btn secondary" data-action="ask-lesson">Chiedi all’assistente →</button></div></section></div>';
 }
 private assistant(){
  return '<div class="grid cols-2"><section class="card"><h2>Genera un prompt contestuale</h2>'+
   '<p class="muted">Il testo è preparato localmente e non viene inviato in automatico. Prima di copiarlo puoi controllare il contesto incluso.</p>'+
   '<form data-form="assistant" class="form"><label>Tipo di supporto<select name="topic">'+
   opt('lesson','Spiegazione lezione / ripasso')+opt('monthly','Commento del check mensile')+
   opt('plan','Revisione del piano finanziario')+opt('risk','Analisi prudente del rischio')+'</select></label>'+
   '<label>Dettagli della richiesta<textarea name="question" maxlength="6000" placeholder="Descrivi i tuoi dubbi o incolla soltanto appunti non sensibili…"></textarea></label>'+
   '<label class="row" style="display:flex"><input type="checkbox" name="includeFinance" value="yes">Includi le cifre aggregate del piano finanziario</label>'+
   '<button class="btn">Prepara richiesta</button></form></section>'+
   '<section class="card"><h2>Anteprima da condividere</h2><textarea id="prompt-view" style="min-height:280px" readonly>'+esc(this.prompt||'Genera una richiesta per vedere qui il testo da copiare.')+'</textarea>'+
   '<div class="actions"><button class="btn" data-action="copy-prompt">Copia testo</button><button class="btn secondary" data-action="open-chat">Apri progetto ChatGPT ↗</button></div>'+
   '<p class="muted">La copia contiene solo i dati selezionati. Non inserire password, numeri di conto o documenti riservati.</p></section></div>';
 }
 private settings(){
  const s=this.state;
  return '<div class="grid cols-2"><section class="card"><h2>Parametri del piano</h2><form data-form="plan" class="form">'+
  input('income','Reddito mensile previsto (€)',euro(s.plan.incomeCents),'number','min="0" step="0.01"')+
  input('expenses','Spese mensili previste (€)',euro(s.plan.expensesCents),'number','min="0" step="0.01"')+
  input('target','Target di risparmio mensile (€)',euro(s.plan.targetCents),'number','min="0" step="0.01"')+
  '<button class="btn">Salva parametri</button></form><hr/><h3>Progetto ChatGPT</h3>'+
  '<form data-form="project" class="form"><label>URL del progetto<input name="url" type="url" value="'+esc(s.projectUrl)+'" placeholder="https://chatgpt.com/..."></label><button class="btn secondary">Salva collegamento</button></form></section>'+
  '<section class="card"><h2>Backup e protezione</h2><p class="muted">Il database è locale in IndexedDB. Esporta un backup per poter ripristinare i dati se cambi browser o dispositivo.</p>'+
  '<div class="actions"><button class="btn" data-action="backup">Scarica backup JSON V2</button><button class="btn secondary" data-action="csv">Esporta storico CSV</button></div><hr/>'+
  '<label>Importa backup V2 o archivio JSON V1<input type="file" data-import accept=".json,application/json"></label>'+
  '<div class="notice warn" style="margin-top:15px">L’importazione sostituisce l’archivio V2 soltanto dopo una conferma. Esporta prima un backup dei dati correnti.</div>'+
  '<h3>Informazioni archivio</h3>'+line('Versione schema','2')+
  line('Origine',''+esc(s.migration.source))+line('Creazione/migrazione',esc(s.migration.migratedAt.slice(0,10)))+
  line('Conti registrati',String(s.accounts.length))+line('Movimenti registrati',String(s.movements.length))+
  '</section></div>'+this.legacyInfo();
 }
 private async onClick(event:Event){
  const el=(event.target as HTMLElement).closest<HTMLElement>('[data-page],[data-action],[data-lesson]');if(!el)return;
  if(el.dataset.page){this.page=el.dataset.page as AppPage;this.notice='';this.render();window.scrollTo(0,0);return;}
  if(el.dataset.lesson){this.selectedLesson=el.dataset.lesson;this.render();return;}
  const action=el.dataset.action??'';
  if(action==='backup'){
   const file=new Blob([JSON.stringify(backupPayload(this.state),null,2)],{type:'application/json'});
   this.download(file,'piano-investimenti-v2-'+localDate()+'.json');
  }
  if(action==='csv')this.exportCSV();
  if(action==='month-current'){this.selectedMonth=localMonth();this.render();}
  if(action==='copy-prompt'){
   if(!this.prompt)return alert('Genera prima un prompt.');
   try{await navigator.clipboard.writeText(this.prompt);this.notice='Testo copiato negli appunti.';this.render();}catch{alert('Copia manualmente il testo dall’anteprima.');}
  }
  if(action==='open-chat'){
   if(this.state.projectUrl)window.open(this.state.projectUrl,'_blank','noopener,noreferrer');
   else{this.page='settings';this.notice='Configura prima il collegamento al progetto ChatGPT.';this.render();}
  }
  if(action==='ask-lesson'){this.page='assistant';this.prompt=this.promptFor('lesson','Spiegami e fammi ripassare '+this.selectedLesson+'.',false);this.render();}
  if(action==='toggle-goal'){
   const id=el.dataset.id??'';
   await this.edit(s=>{const g=s.goals.find(x=>x.id===id);if(!g)throw Error('Obiettivo inesistente');g.status=g.status==='active'?'paused':'active';});
  }
  if(action==='edit-goal'){
   const id=el.dataset.id??'',g=this.state.goals.find(x=>x.id===id);if(!g)return;
   const amountInput=prompt('Nuovo target per '+g.title+' (in €)',String(g.targetCents/100));
   if(amountInput===null)return;const cents=eurosToCents(amountInput);if(cents<0)return alert('Target non valido');
   await this.edit(s=>{s.goals.find(x=>x.id===id)!.targetCents=cents;});
  }
 }
 private async onChange(event:Event){
  const el=event.target as HTMLInputElement;
  if(el.matches('[data-import]')){await this.importFile(el);return;}
  if(el.matches('[data-month-picker]')){this.selectedMonth=el.value;this.notice='';this.render();return;}
  if(el.matches('[data-check]')){
   const key='check-'+el.dataset.check;
   await this.edit(s=>{s.checks[this.selectedMonth]??={};s.checks[this.selectedMonth]![key]=el.checked;const r=s.reviews.find(x=>x.month===this.selectedMonth);if(r){r.checklist={...s.checks[this.selectedMonth]};r.updatedAt=new Date().toISOString();}});
  }
 }
 private async onSubmit(event:Event){
  const form=event.target as HTMLFormElement;if(!(form instanceof HTMLFormElement))return;
  const formName=form.dataset.form;if(!formName)return;
  const f=new FormData(form);
  try{
   switch(formName){
    case 'account':
     await this.edit(s=>{const opening=num(f,'opening');s.accounts.push({id:uid(),name:str(f,'name').slice(0,80),type:str(f,'type') as 'current'|'deposit'|'broker'|'cash',openingCents:opening});});break;
    case 'movement':{
     const m:Movement={id:uid(),date:str(f,'date'),kind:str(f,'kind') as Movement['kind'],amountCents:num(f,'amount'),fromId:str(f,'fromId')||undefined,toId:str(f,'toId')||undefined,category:str(f,'category').slice(0,60),note:str(f,'note').slice(0,400)};
     const err=validateMovement(this.state,m);if(err)throw Error(err);
     await this.edit(s=>{s.movements.push(m);});break;
    }
    case 'goal':{
     const target=num(f,'target'),monthly=num(f,'monthly');if(target<0||monthly<0)throw Error('Gli importi devono essere non negativi');
     await this.edit(s=>{s.goals.push({id:uid(),title:str(f,'title').slice(0,100),targetCents:target,monthlyCents:monthly,deadline:str(f,'deadline'),priority:Number(str(f,'priority')) as 1|2|3,status:'active',allocations:[]});});break;
    }
    case 'allocate':{
     const id=str(f,'goalId'),accountId=str(f,'accountId'),cents=num(f,'amount');if(cents<0)throw Error('Riserva negativa');
     const current=this.state.goals.find(g=>g.id===id)?.allocations.find(x=>x.accountId===accountId)?.amountCents??0;
     const max=accountBalance(this.state,accountId)-allocatedOnAccount(this.state,accountId)+current;
     if(cents>Math.max(0,max))throw Error('Riserva superiore alla liquidità libera del conto');
     await this.edit(s=>{const g=s.goals.find(x=>x.id===id);if(!g)throw Error('Obiettivo non trovato');
      g.allocations=g.allocations.filter(x=>x.accountId!==accountId);if(cents>0)g.allocations.push({accountId,amountCents:cents});});break;
    }
    case 'review':{
     const month=str(f,'month');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mese non valido');
     const rawBalance=str(f,'balance'),r:Review={month,incomeCents:num(f,'income'),expensesCents:num(f,'expenses'),savingCents:num(f,'saving'),closingBalanceCents:rawBalance===''?null:num(f,'balance'),notes:str(f,'notes').slice(0,5000),checklist:this.state.checks[month]??{},source:'manual',updatedAt:new Date().toISOString()};
     if(r.incomeCents<0||r.expensesCents<0)throw Error('Entrate e spese non possono essere negative');
     this.selectedMonth=month;await this.edit(s=>{s.reviews=s.reviews.filter(x=>x.month!==month);s.reviews.push(r);});break;
    }
    case 'simulation':{
     const years=Number(str(f,'years')),annualRate=Number(str(f,'rate')),inflation=Number(str(f,'inflation')),annualFee=Number(str(f,'fee'));
     if(!Number.isInteger(years)||years<1||years>60||![annualRate,inflation,annualFee].every(Number.isFinite)||annualRate< -99||annualRate>30||inflation< -10||inflation>30||annualFee<0||annualFee>10)throw Error('Valori della simulazione fuori intervallo');
     this.scenario={initialCents:num(f,'initial'),monthlyCents:num(f,'monthly'),years,annualRate,inflation,annualFee};
     if(this.scenario.initialCents<0||this.scenario.monthlyCents<0)throw Error('Versamenti non validi');
     this.notice='Simulazione aggiornata (non modifica il patrimonio).';this.render();break;
    }
    case 'portfolio':{
     const mode=str(f,'mode') as Portfolio['mode'],cashAccountId=str(f,'cashAccountId')||undefined;
     if(mode==='real'&&!cashAccountId)throw Error('Seleziona un conto liquidità per il portafoglio reale');
     await this.edit(s=>{s.portfolios.push({id:uid(),name:str(f,'name').slice(0,80),mode,cashAccountId:mode==='real'?cashAccountId:undefined});});break;
    }
    case 'security':{
     const isin=str(f,'isin').toUpperCase();if(isin&&!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin))throw Error('ISIN: inserisci 12 caratteri oppure lascia vuoto');
     await this.edit(s=>{s.securities.push({id:uid(),name:str(f,'name').slice(0,120),isin});});break;
    }
    case 'trade':{
     const t:Trade={id:uid(),portfolioId:str(f,'portfolioId'),securityId:str(f,'securityId'),side:str(f,'side') as Trade['side'],date:str(f,'date'),quantity:Number(str(f,'quantity')),unitPriceCents:num(f,'price'),feesCents:num(f,'fees')};
     const err=validateTrade(this.state,t);if(err)throw Error(err);
     const p=this.state.portfolios.find(x=>x.id===t.portfolioId);
     if(t.side==='buy'&&p?.mode==='real'&&p.cashAccountId&&Math.round(t.quantity*t.unitPriceCents)+t.feesCents>accountBalance(this.state,p.cashAccountId))throw Error('Liquidità del conto insufficiente per acquistare');
     await this.edit(s=>{s.trades.push(t);});break;
    }
    case 'price':{
     const securityId=str(f,'securityId'),date=str(f,'date'),unitPriceCents=num(f,'price');
     if(unitPriceCents<0||!sValidDate(date)||!this.state.securities.some(x=>x.id===securityId))throw Error('Dati prezzo non validi');
     await this.edit(s=>{s.prices=s.prices.filter(x=>!(x.securityId===securityId&&x.date===date));s.prices.push({securityId,date,unitPriceCents});});break;
    }
    case 'lesson':{
     const lessonId=str(f,'lessonId'),status=str(f,'status');
     if(!quizzes[lessonId]||!['todo','doing','review','done'].includes(status))throw Error('Lezione non valida');
     await this.edit(s=>{const old=s.lessons[lessonId];s.lessons[lessonId]={status:status as LessonProgress['status'],notes:str(f,'notes').slice(0,12000),exercise:str(f,'exercise').slice(0,12000),quizScore:old?.quizScore??null};});break;
    }
    case 'quiz':{
     const lessonId=str(f,'lessonId'),quiz=quizzes[lessonId],answer=Number(str(f,'answer'));if(!quiz||!Number.isInteger(answer))throw Error('Scegli una risposta');
     const score=answer===quiz.correct?100:0;
     await this.edit(s=>{const old=s.lessons[lessonId]??{status:'doing',notes:'',exercise:'',quizScore:null};
      s.lessons[lessonId]={...old,quizScore:score};});
     alert((score===100?'Corretto! ':'Da ripassare. ')+quiz.explanation);break;
    }
    case 'assistant':{
     this.prompt=this.promptFor(str(f,'topic'),str(f,'question'),f.get('includeFinance')==='yes');this.notice='Controlla il testo prima di copiarlo.';this.render();break;
    }
    case 'plan':{
     const inc=num(f,'income'),expenses=num(f,'expenses'),target=num(f,'target');
     if(Math.min(inc,expenses,target)<0)throw Error('Valori negativi non ammessi');
     await this.edit(s=>{s.plan={incomeCents:inc,expensesCents:expenses,targetCents:target};});break;
    }
    case 'project':{
     const url=str(f,'url');if(url&&!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(url))throw Error('Inserisci un link HTTPS al progetto ChatGPT');
     await this.edit(s=>{s.projectUrl=url;});break;
    }
   }
  }catch(err){alert('Controlla i dati: '+String(err))}
 }
 private promptFor(topic:string,question:string,finance:boolean){
  const s=this.state,lesson=totalWeeks.find(w=>w.id===this.selectedLesson);
  let context='';
  if(topic==='lesson')context='Lezione selezionata: '+lesson?.unit[0]+'. Materiali: '+lesson?.unit[1]+'.';
  if(topic==='monthly'){const r=s.reviews.find(x=>x.month===this.selectedMonth);context=r?'Consuntivo '+r.month+': entrate '+amount(r.incomeCents)+', spese '+amount(r.expensesCents)+', risparmio '+amount(r.savingCents)+'.':'Nessun consuntivo disponibile.';}
  if(topic==='plan')context='Obiettivi: '+s.goals.map(g=>g.title+', target '+amount(g.targetCents)).join('; ')+'.';
  if(topic==='risk')context='Vorrei analizzare possibili rischi, costi, volatilità, orizzonte temporale e perdita temporanea del 20%.';
  if(finance)context+=' Budget indicativo: entrate '+amount(s.plan.incomeCents)+', spese '+amount(s.plan.expensesCents)+', target risparmio '+amount(s.plan.targetCents)+'.';
  return 'Agisci come tutor di educazione finanziaria. Sono un principiante e ho al massimo 3 ore a settimana per studiare. Usa l’italiano semplice, fonti verificabili e distinguere fatti da ipotesi. Considera un possibile trasferimento in Spagna fra circa tre anni. Non suggerire acquisti come conclusioni obbligatorie.\n\nContesto selezionato:\n'+context+'\n\nDomanda:\n'+(question||'Aiutami a capire questo argomento con esempi numerici.')+'\n\nMostrami rischi, costi, condizioni da verificare ed eventuali dubbi da chiarire.';
 }
 private download(blob:Blob,name:string){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 private exportCSV(){
  const rows=[['Mese','Entrate','Spese','Risparmio','Saldo finale','Note'],...this.state.reviews.map(r=>[r.month,euro(r.incomeCents),euro(r.expensesCents),euro(r.savingCents),r.closingBalanceCents===null?'':euro(r.closingBalanceCents),r.notes])];
  const safe=(v:string)=>{let x=String(v).replace(/^[\s\x00-\x1f]*[=+@-]/,'\'$&');return '"'+x.replace(/"/g,'""')+'"'};
  const csv='\ufeff'+rows.map(r=>r.map(safe).join(';')).join('\r\n');
  this.download(new Blob([csv],{type:'text/csv;charset=utf-8'}),'consuntivi-'+localDate()+'.csv');
 }
 private async importFile(input:HTMLInputElement){
  const file=input.files?.[0];if(!file)return;
  if(file.size>10_000_000){alert('File troppo grande (massimo 10 MB)');input.value='';return;}
  try{
   const raw=JSON.parse(await file.text()) as unknown;
   let imported:AppState;
   if(raw&&typeof raw==='object'&&'format' in raw)imported=parseBackup(raw);
   else imported=migrateV1(raw);
   if(!confirm('Il ripristino sostituirà tutti i dati attuali della versione 2.0. Hai già esportato un backup?'))return;
   await this.save(imported);this.state=imported;this.page='dashboard';this.notice='Backup importato correttamente.';this.render();
  }catch(err){alert('Importazione non riuscita, dati correnti intatti: '+String(err))}
  finally{input.value=''}
 }
}
function sValidDate(value:string){return validDate(value)}

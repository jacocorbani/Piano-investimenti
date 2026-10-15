import type { AppState, LessonProgress, Review } from '../types';
import {eurosToCents,uid} from '../finance';
const DB='piano-investimenti-v2', STORE='records', KEY='app', OLD='finanzaDashboard';
export const freshState=():AppState=>({
 schemaVersion:2,
 plan:{incomeCents:170000,expensesCents:45000,targetCents:100000},
 accounts:[{id:'main-cash',name:'Conto principale',type:'current',openingCents:0}],
 movements:[],goals:[
 {id:'goal-emergency',title:'Fondo emergenza',targetCents:300000,deadline:'',monthlyCents:0,priority:1,status:'active',allocations:[]},
 {id:'goal-spain',title:'Possibile trasferimento in Spagna',targetCents:0,deadline:'2029-10',monthlyCents:0,priority:1,status:'active',allocations:[]}
 ],
 portfolios:[],securities:[],trades:[],prices:[],reviews:[],checks:{},lessons:{},projectUrl:'',legacy:null,
 migration:{source:'fresh',migratedAt:new Date().toISOString()}
});
export function migrateV1(raw:unknown):AppState {
 if(!raw||typeof raw!=='object')throw Error('Archivio V1 non riconosciuto');
 const v=raw as Record<string,unknown>;
 if(!v.plan||typeof v.plan!=='object'||Array.isArray(v.plan)||!v.months||typeof v.months!=='object'||Array.isArray(v.months))throw Error('Backup precedente non riconosciuto: mancano piano o storico');
 const p=v.plan as Record<string,unknown>;
 const s=freshState();
 const signed=(v:unknown,fallback:number)=>{try{return eurosToCents(v)}catch{return fallback}};
 const numeric=(v:unknown,fallback:number)=>Math.max(0,signed(v,fallback));
 s.plan.incomeCents=numeric(p.income,s.plan.incomeCents);
 s.plan.expensesCents=numeric(p.expenses,s.plan.expensesCents);
 s.plan.targetCents=numeric(p.invest,s.plan.targetCents);
 s.goals[0]!.targetCents=numeric(p.emergencyGoal,300000);
 s.legacy={emergencyCents:numeric(p.emergency,0),investmentsCents:numeric(p.capital,0),note:'Valori della versione precedente non riconciliati con conti e posizioni. Non inclusi nel patrimonio calcolato per evitare doppi conteggi.'};
 if(typeof v.projectUrl==='string'&&/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(v.projectUrl))s.projectUrl=v.projectUrl;
 const m=(v.months??{}) as Record<string,Record<string,unknown>>;
 if(m&&typeof m==='object'&&!Array.isArray(m)){
  for(const [month,row] of Object.entries(m)){
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!row||typeof row!=='object')continue;
   const checks=((v.checks??{}) as Record<string,Record<string,unknown>>)[month]??{};
   const checklist:Record<string,boolean>={};
   for(const [key,value] of Object.entries(checks))if(typeof value==='boolean')checklist[key]=value;
   const balance=row.balance===''||row.balance==null?null:signed(row.balance,0);
   s.reviews.push({month,incomeCents:numeric(row.income,0),expensesCents:numeric(row.expenses,0),savingCents:signed(row.saving,0),closingBalanceCents:balance,notes:String(row.notes??'').slice(0,5000),checklist,source:'manual',updatedAt:typeof row.updated==='string'?row.updated:new Date().toISOString()});
  }
 }
 const oldChecks=v.checks??{};
 if(oldChecks&&typeof oldChecks==='object'&&!Array.isArray(oldChecks)){
  for(const [month,items] of Object.entries(oldChecks)){
   if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!items||typeof items!=='object'||Array.isArray(items))continue;
   s.checks[month]={};
   for(const [key,value] of Object.entries(items))if(typeof value==='boolean')s.checks[month]![key]=value;
  }
 }
 const lessons=v.lessons??{};
 if(lessons&&typeof lessons==='object'&&!Array.isArray(lessons)){
  for(const [key,done] of Object.entries(lessons)){
   const match=/^([0-5])-([0-3])$/.exec(key);if(!match)continue;
   const id='INV-W'+String(Number(match[1])*4+Number(match[2])+1).padStart(2,'0');
   s.lessons[id]={status:done===true?'done':'todo',notes:'',exercise:'',quizScore:null};
  }
 }
 s.migration={source:'v1',migratedAt:new Date().toISOString()};
 return s;
}
const isRec=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validateState(v:unknown):v is AppState {
 if(!isRec(v)||v.schemaVersion!==2||!isRec(v.plan))return false;
 const arr=['accounts','movements','goals','portfolios','securities','trades','prices','reviews'];
 if(!arr.every(k=>Array.isArray(v[k])&&(v[k] as unknown[]).length<=100000))return false;
 if(!isRec(v.lessons)||!isRec(v.checks)||!isRec(v.migration)||typeof v.projectUrl!=='string'||v.projectUrl.length>2048)return false;
 const p=v.plan as Record<string,unknown>;
 if(!['incomeCents','expensesCents','targetCents'].every(k=>Number.isSafeInteger(p[k])&&Number(p[k])>=0))return false;
 const ac=v.accounts as Record<string,unknown>[];
 if(!ac.every(x=>isRec(x)&&typeof x.id==='string'&&typeof x.name==='string'&&Number.isSafeInteger(x.openingCents)))return false;
 const mov=v.movements as Record<string,unknown>[];
 if(!mov.every(x=>isRec(x)&&typeof x.id==='string'&&['income','expense','transfer','adjustment'].includes(String(x.kind))&&Number.isSafeInteger(x.amountCents)&&Number(x.amountCents)>0&&typeof x.date==='string'))return false;
 const goals=v.goals as Record<string,unknown>[];
 if(!goals.every(x=>isRec(x)&&typeof x.id==='string'&&typeof x.title==='string'&&Number.isSafeInteger(x.targetCents)&&Number(x.targetCents)>=0&&Array.isArray(x.allocations)&&x.allocations.every((a:unknown)=>isRec(a)&&typeof a.accountId==='string'&&Number.isSafeInteger(a.amountCents)&&Number(a.amountCents)>=0)))return false;
 const reviews=v.reviews as Record<string,unknown>[];
 if(!reviews.every(x=>isRec(x)&&typeof x.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x.month)&&Number.isSafeInteger(x.incomeCents)&&Number.isSafeInteger(x.expensesCents)&&Number.isSafeInteger(x.savingCents)))return false;

 const isCents=(n:unknown)=>Number.isSafeInteger(n)&&Math.abs(Number(n))<=1e12;
 const isText=(n:unknown,max=12000)=>typeof n==='string'&&n.length<=max;
 const isDate=(n:unknown)=>isText(n,10)&&/^\d{4}-\d{2}-\d{2}$/.test(n as string);
 const unique=(list:{id:string}[])=>new Set(list.map(x=>x.id)).size===list.length;
 if(!unique(ac as {id:string}[])||!unique(mov as {id:string}[])||!unique(goals as {id:string}[]))return false;
 const ids=new Set(ac.map(a=>a.id));
 if(!ac.every(a=>isText(a.id,120)&&isText(a.name,80)&&['current','deposit','broker','cash'].includes(String(a.type))&&isCents(a.openingCents)))return false;
 if(!mov.every(m=>isText(m.id,120)&&isDate(m.date)&&isText(m.note,400)&&isText(m.category,60)&&
  (m.fromId===undefined||ids.has(String(m.fromId)))&&(m.toId===undefined||ids.has(String(m.toId)))))return false;
 if(!goals.every(g=>isText(g.id,120)&&isText(g.title,100)&&isCents(g.targetCents)&&isCents(g.monthlyCents)&&Number(g.targetCents)>=0&&Number(g.monthlyCents)>=0&&isText(g.deadline,7)&&
  ['active','paused','completed'].includes(String(g.status))&&[1,2,3].includes(Number(g.priority))&&
  (g.allocations as unknown[]).every(a=>isRec(a)&&ids.has(String(a.accountId))&&isCents(a.amountCents)&&Number(a.amountCents)>=0)))return false;
 const portfolios=v.portfolios as unknown[];
 if(!portfolios.every(p=>isRec(p)&&isText(p.id,120)&&isText(p.name,80)&&['real','simulation'].includes(String(p.mode))&&(p.mode==='simulation'||ids.has(String(p.cashAccountId)))))return false;
 if(!unique(portfolios as {id:string}[]))return false;
 const pids=new Set((portfolios as {id:string}[]).map(p=>p.id));
 const securities=v.securities as unknown[];
 if(!securities.every(q=>isRec(q)&&isText(q.id,120)&&isText(q.name,120)&&isText(q.isin,12)))return false;
 if(!unique(securities as {id:string}[]))return false;
 const sids=new Set((securities as {id:string}[]).map(q=>q.id));
 const trades=v.trades as unknown[];
 if(!trades.every(t=>isRec(t)&&isText(t.id,120)&&pids.has(String(t.portfolioId))&&sids.has(String(t.securityId))&&
  isDate(t.date)&&['buy','sell'].includes(String(t.side))&&typeof t.quantity==='number'&&Number.isFinite(t.quantity)&&t.quantity>0&&t.quantity<1e10&&isCents(t.unitPriceCents)&&Number(t.unitPriceCents)>=0&&isCents(t.feesCents)&&Number(t.feesCents)>=0))return false;
 if(!unique(trades as {id:string}[]))return false;
 if(!(v.prices as unknown[]).every(p=>isRec(p)&&sids.has(String(p.securityId))&&isDate(p.date)&&isCents(p.unitPriceCents)&&Number(p.unitPriceCents)>=0))return false;
 if(!reviews.every(x=>isText(x.notes,5000)&&isRec(x.checklist)&&(x.closingBalanceCents===null||isCents(x.closingBalanceCents))&&
  ['manual','transactions'].includes(String(x.source))&&isText(x.updatedAt,80)))return false;
 if(Object.entries(v.lessons).some(([id,x])=>!/^INV-W(0[1-9]|1[0-9]|2[0-4])$/.test(id)||!isRec(x)||
  !['todo','doing','review','done'].includes(String(x.status))||!isText(x.notes,12000)||!isText(x.exercise,12000)||(x.quizScore!==null&&(!isCents(x.quizScore)||Number(x.quizScore)<0||Number(x.quizScore)>100))))return false;
 if(v.legacy!==null&&(!isRec(v.legacy)||!isCents(v.legacy.emergencyCents)||!isCents(v.legacy.investmentsCents)||!isText(v.legacy.note,1000)))return false;
 if(Object.entries(v.checks).some(([month,items])=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!isRec(items)||Object.values(items).some(v=>typeof v!=='boolean')))return false;
 return true;
}
function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);
  q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(STORE))q.result.createObjectStore(STORE)};
  q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
 });
}
async function get():Promise<unknown>{
 const db=await open();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 finally{db.close()}
}
async function put(value:AppState):Promise<void>{
 const db=await open();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
 finally{db.close()}
}
let queue:Promise<void>=Promise.resolve();
export function saveState(value:AppState):Promise<void>{
 if(!validateState(value))return Promise.reject(Error('Dati non validi: salvataggio annullato'));
 const clone=structuredClone(value);
 queue=queue.catch(()=>{}).then(()=>put(clone));
 return queue;
}
export async function loadState():Promise<AppState>{
 const stored=await get();if(stored!==undefined){if(!validateState(stored))throw Error('Archivio V2 non valido: ripristina un backup');return stored;}
 const raw=localStorage.getItem(OLD);
 let next=freshState();
 if(raw){
  try{
   const parsed=JSON.parse(raw);
   next=migrateV1(parsed);
   if(localStorage.getItem(OLD+':before-v2')===null)localStorage.setItem(OLD+':before-v2',raw);
  }catch(e){throw Error('Migrazione V1 non riuscita. I dati precedenti non sono stati modificati. '+String(e))}
 }
 await saveState(next);return next;
}
export function backupPayload(s:AppState){return {format:'piano-investimenti',schemaVersion:2,exportedAt:new Date().toISOString(),state:s};}
export function parseBackup(input:unknown):AppState{
 if(!isRec(input)||input.format!=='piano-investimenti'||input.schemaVersion!==2||!validateState(input.state))throw Error('Backup V2 non valido o incompatibile');
 return structuredClone(input.state);
}

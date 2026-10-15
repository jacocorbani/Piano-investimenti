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
 portfolios:[],securities:[],trades:[],prices:[],reviews:[],lessons:{},projectUrl:'',legacy:null,
 migration:{source:'fresh',migratedAt:new Date().toISOString()}
});
export function migrateV1(raw:unknown):AppState {
 if(!raw||typeof raw!=='object')throw Error('Archivio V1 non riconosciuto');
 const v=raw as Record<string,unknown>, p=(v.plan??{}) as Record<string,unknown>;
 const s=freshState();
 const numeric=(v:unknown,fallback:number)=>{try{const n=eurosToCents(v);return Math.max(0,n)}catch{return fallback}};
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
   const balance=row.balance===''||row.balance==null?null:numeric(row.balance,0);
   s.reviews.push({month,incomeCents:numeric(row.income,0),expensesCents:numeric(row.expenses,0),savingCents:numeric(row.saving,0),closingBalanceCents:balance,notes:String(row.notes??'').slice(0,5000),checklist,source:'manual',updatedAt:typeof row.updated==='string'?row.updated:new Date().toISOString()});
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
 if(!isRec(v.lessons)||!isRec(v.migration)||typeof v.projectUrl!=='string'||v.projectUrl.length>2048)return false;
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

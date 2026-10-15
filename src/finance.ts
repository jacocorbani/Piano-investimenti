import type { Account, AppState, Goal, Movement, Portfolio, Trade } from './types';
export const money = (cents:number) => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
export const eurosToCents = (value:unknown) => {
  const n = typeof value==='string' ? Number(value.replace(',','.')) : Number(value);
  if(!Number.isFinite(n) || Math.abs(n)>1_000_000_000) throw Error('Importo non valido');
  return Math.round(n*100);
};
export const centsToEuros = (n:number) => (n/100).toFixed(2);
export const localMonth = (date=new Date()) => date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
export const localDate = (date=new Date()) => localMonth(date)+'-'+String(date.getDate()).padStart(2,'0');
export const uid = () => crypto.randomUUID();
export const byDate = (a:{date:string},b:{date:string})=>a.date.localeCompare(b.date);
export function accountBalance(s:AppState,id:string):number {
 const acc=s.accounts.find(a=>a.id===id);if(!acc) return 0;
 let sum=acc.openingCents;
 for(const m of s.movements){
   if(m.kind==='income' || m.kind==='adjustment'){if(m.toId===id)sum+=m.amountCents;}
   else if(m.kind==='expense'){if(m.fromId===id)sum-=m.amountCents;}
   else {if(m.fromId===id)sum-=m.amountCents;if(m.toId===id)sum+=m.amountCents;}
 }
 for(const tr of s.trades){
   const p=s.portfolios.find(p=>p.id===tr.portfolioId);
   if(p?.mode==='real' && p.cashAccountId===id) sum += tr.side==='buy' ? -Math.round(tr.quantity*tr.unitPriceCents)-tr.feesCents : Math.round(tr.quantity*tr.unitPriceCents)-tr.feesCents;
 }
 return sum;
}
export function holdings(s:AppState,portfolioId:string):Array<{securityId:string;quantity:number;costCents:number;priceCents:number;valueCents:number;priceDate:string|null}> {
 const groups=new Map<string,{quantity:number;costCents:number}>();
 const trades=s.trades.filter(t=>t.portfolioId===portfolioId).slice().sort(byDate);
 for(const t of trades){
  const old=groups.get(t.securityId)??{quantity:0,costCents:0};
  if(t.side==='buy') {old.quantity+=t.quantity;old.costCents+=Math.round(t.quantity*t.unitPriceCents)+t.feesCents;}
  else if(old.quantity>0){let ratio=Math.min(1,t.quantity/old.quantity);old.costCents=Math.round(old.costCents*(1-ratio));old.quantity=Math.max(0,old.quantity-t.quantity);}
  groups.set(t.securityId,old);
 }
 return [...groups.entries()].filter(([,v])=>v.quantity>0.00000001).map(([securityId,v])=>{
  const p=s.prices.filter(x=>x.securityId===securityId).sort(byDate).at(-1);
  const lastTrade=s.trades.filter(x=>x.portfolioId===portfolioId&&x.securityId===securityId).sort(byDate).at(-1);
  const px=p?.unitPriceCents??lastTrade?.unitPriceCents??0;
  return {securityId,quantity:v.quantity,costCents:v.costCents,priceCents:px,valueCents:Math.round(v.quantity*px),priceDate:p?.date??null};
 });
}
export function investmentValue(s:AppState,mode:'real'|'simulation'='real'){
 return s.portfolios.filter(p=>p.mode===mode).reduce((sum,p)=>sum+holdings(s,p.id).reduce((v,h)=>v+h.valueCents,0),0);
}
export function cashTotal(s:AppState){return s.accounts.reduce((sum,a)=>sum+accountBalance(s,a.id),0);}
export function netWorth(s:AppState){return cashTotal(s)+investmentValue(s,'real');}
export function allocatedOnAccount(s:AppState,id:string){return s.goals.reduce((sum,g)=>sum+g.allocations.filter(a=>a.accountId===id).reduce((v,a)=>v+a.amountCents,0),0);}
export function goalAllocated(g:Goal){return g.allocations.reduce((sum,a)=>sum+a.amountCents,0);}
export function unallocatedCash(s:AppState){return s.accounts.reduce((sum,a)=>sum+accountBalance(s,a.id)-allocatedOnAccount(s,a.id),0);}
export function cashflow(s:AppState,month:string){
 const tx=s.movements.filter(m=>m.date.startsWith(month));return {
  income:tx.filter(m=>m.kind==='income').reduce((v,m)=>v+m.amountCents,0),
  expenses:tx.filter(m=>m.kind==='expense').reduce((v,m)=>v+m.amountCents,0)
 };
}
export function validateMovement(s:AppState,m:Movement):string|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(m.date))return 'Data non valida';
 if(!Number.isSafeInteger(m.amountCents)||Math.abs(m.amountCents)>1e12||(m.kind==='adjustment'?m.amountCents===0:m.amountCents<=0))return 'Importo non valido: solo le rettifiche possono essere negative';
 const has=(id?:string)=>!!id&&s.accounts.some(a=>a.id===id);
 if(m.kind==='transfer') {
  if(!has(m.fromId)||!has(m.toId)||m.fromId===m.toId)return 'Scegli due conti diversi';
 } else if(m.kind==='income'||m.kind==='adjustment') {if(!has(m.toId))return 'Scegli il conto di destinazione';}
 else if(!has(m.fromId))return 'Scegli il conto da cui hai pagato';
 return null;
}
export function validateTrade(s:AppState,t:Trade):string|null{
 const p=s.portfolios.find(p=>p.id===t.portfolioId);
 if(!p||!s.securities.some(q=>q.id===t.securityId))return 'Portafoglio o strumento inesistente';
 if(p.mode==='real'&&(!p.cashAccountId||!s.accounts.some(a=>a.id===p.cashAccountId)))return 'Associa un conto liquidità al portafoglio reale';
 if(!Number.isFinite(t.quantity)||t.quantity<=0||t.quantity>1e9)return 'Quantità non valida';
 if(!Number.isSafeInteger(t.unitPriceCents)||t.unitPriceCents<0||!Number.isSafeInteger(t.feesCents)||t.feesCents<0)return 'Prezzo o commissioni non validi';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date))return 'Data non valida';
 if(t.side==='sell'){
  let q=holdings(s,p.id).find(x=>x.securityId===t.securityId)?.quantity??0;
  if(q+1e-9<t.quantity)return 'Non puoi vendere più quote di quelle possedute';
 }
 return null;
}
export interface SimulationInput {initialCents:number;monthlyCents:number;years:number;annualRate:number;inflation:number;annualFee:number;}
export function simulate(i:SimulationInput) {
 if(i.years<1||i.years>60||i.annualRate<=-100||i.inflation<=-100||i.annualFee<0||i.annualFee>100) throw Error('Parametri fuori intervallo');
 const r=Math.pow(1+(i.annualRate-i.annualFee)/100,1/12)-1;
 let total=i.initialCents; const points=[{year:0,totalCents:total,paidCents:total}];let paid=total;
 for(let m=1;m<=i.years*12;m++){
  total=total*(1+r)+i.monthlyCents;paid+=i.monthlyCents;
  if(m%12===0)points.push({year:m/12,totalCents:Math.round(total),paidCents:paid});
 }
 return {finalCents:Math.round(total),paidCents:paid,realCents:Math.round(total/Math.pow(1+i.inflation/100,i.years)),points};
}

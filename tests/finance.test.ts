import {describe,expect,it} from 'vitest';
import {backupPayload,parseBackup,validateState,freshState,migrateV1} from '../src/data/store';
import {accountBalance,goalAllocated,netWorth,simulate,unallocatedCash,cashflow,holdings} from '../src/finance';
describe('motore finanziario',()=>{
 it('un trasferimento interno non cambia patrimonio',()=>{
  const s=freshState();s.accounts[0]!.openingCents=100000;
  s.accounts.push({id:'dep',name:'Deposito',type:'deposit',openingCents:0});
  s.movements.push({id:'t',date:'2026-10-15',kind:'transfer',amountCents:40000,fromId:'main-cash',toId:'dep',category:'',note:''});
  expect(accountBalance(s,'main-cash')).toBe(60000);
  expect(accountBalance(s,'dep')).toBe(40000);expect(netWorth(s)).toBe(100000);
 });
 it('riserva obiettivo non aumenta il patrimonio',()=>{
  const s=freshState();s.accounts[0]!.openingCents=100000;
  s.goals[0]!.allocations=[{accountId:'main-cash',amountCents:70000}];
  expect(goalAllocated(s.goals[0]!)).toBe(70000);expect(netWorth(s)).toBe(100000);expect(unallocatedCash(s)).toBe(30000);
 });
 it('un acquisto reale sposta liquidità in quota e la commissione riduce il patrimonio',()=>{
  const s=freshState();s.accounts[0]!.openingCents=100000;
  s.portfolios.push({id:'p',name:'Reale',mode:'real',cashAccountId:'main-cash'});
  s.securities.push({id:'x',name:'ETF prova',isin:''});
  s.trades.push({id:'a',portfolioId:'p',securityId:'x',date:'2026-10-15',side:'buy',quantity:2,unitPriceCents:20000,feesCents:200});
  expect(accountBalance(s,'main-cash')).toBe(59800);
  expect(holdings(s,'p')[0]!.valueCents).toBe(40000);
  expect(netWorth(s)).toBe(99800);
 });
 it('portafoglio simulato non cambia patrimonio',()=>{
  const s=freshState();s.accounts[0]!.openingCents=100000;
  s.portfolios.push({id:'p',name:'Demo',mode:'simulation'});
  s.securities.push({id:'x',name:'ETF prova',isin:''});
  s.trades.push({id:'a',portfolioId:'p',securityId:'x',date:'2026-10-15',side:'buy',quantity:2,unitPriceCents:20000,feesCents:200});
  expect(netWorth(s)).toBe(100000);
 });
 it('esclude i trasferimenti dal risparmio',()=>{
  const s=freshState();s.movements=[{id:'a',date:'2026-10-03',kind:'income',amountCents:170000,toId:'main-cash',category:'',note:''},{id:'b',date:'2026-10-04',kind:'expense',amountCents:45000,fromId:'main-cash',category:'',note:''},{id:'c',date:'2026-10-05',kind:'transfer',amountCents:100000,fromId:'main-cash',toId:'main-cash2',category:'',note:''}];
  expect(cashflow(s,'2026-10')).toEqual({income:170000,expenses:45000});
 });
 it('simulazione con tasso zero e versamenti a fine mese',()=>{
  const x=simulate({initialCents:10000,monthlyCents:10000,years:1,annualRate:0,inflation:0,annualFee:0});
  expect(x.finalCents).toBe(130000);expect(x.realCents).toBe(130000);
 });
 it('migra le lezioni e non duplica i valori legacy',()=>{
  const s=migrateV1({plan:{income:1700,expenses:450,invest:1000,emergency:3000,capital:5000},lessons:{'0-0':true,'5-3':true},months:{'2026-09':{income:'1700',expenses:'450',saving:'1000',notes:'Ok'}}});
  expect(s.legacy?.investmentsCents).toBe(500000);
  expect(s.lessons['INV-W01']?.status).toBe('done');
  expect(s.lessons['INV-W24']?.status).toBe('done');
  expect(s.reviews.length).toBe(1);expect(netWorth(s)).toBe(0);
 });

 it('mantiene le checklist anche per mesi senza consuntivo',()=>{
  const s=migrateV1({plan:{income:1700},months:{},checks:{'2026-10':{salary:true,mt1:false}}});
  expect(s.checks['2026-10']).toEqual({salary:true,mt1:false});
  expect(s.reviews).toHaveLength(0);
 });
 it('preserva risparmi storici negativi',()=>{
  const s=migrateV1({plan:{income:1700},months:{'2026-09':{income:1700,expenses:1900,saving:-200}}});
  expect(s.reviews[0]?.savingCents).toBe(-20000);
 });
 it('rifiuta backup corrotti senza cancellare lo stato',()=>{
  const s=freshState();expect(validateState(s)).toBe(true);
  expect(parseBackup(backupPayload(s)).schemaVersion).toBe(2);
  const bad=backupPayload(s);
  bad.state.trades=[null as never];
  expect(()=>parseBackup(bad)).toThrow();
  expect(()=>migrateV1({fake:true})).toThrow();
 });
});

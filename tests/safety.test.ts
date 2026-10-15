import {describe,it,expect} from 'vitest';
import {freshState,backupPayload,parseBackup,validateState} from '../src/data/store';
import {validDate,validateTrade,simulate,holdings,accountBalance,netWorth} from '../src/finance';
const portfolio=()=>{const s=freshState();s.accounts[0]!.openingCents=100000;s.portfolios=[{id:'p',name:'Reale',mode:'real',cashAccountId:'main-cash'}];s.securities=[{id:'x',name:'Test',isin:''}];return s;};
const buy={id:'b',portfolioId:'p',securityId:'x',side:'buy' as const,date:'2026-03-01',quantity:2,unitPriceCents:10000,feesCents:100};
describe('integrità archivio e cronologia',()=>{
 it.each(['2026-02-30','2026-13-01','invalid'])('rifiuta data %s',d=>expect(validDate(d)).toBe(false));
 it('accetta il giorno bisestile corretto',()=>expect(validDate('2024-02-29')).toBe(true));
 it('rifiuta vendite antecedenti agli acquisti',()=>{const s=portfolio();s.trades=[buy];expect(validateTrade(s,{...buy,id:'s',side:'sell',date:'2026-02-01',quantity:1})).not.toBeNull();});
 it('rifiuta un backup con posizioni negative storiche',()=>{const s=portfolio();s.trades=[{...buy,id:'s',side:'sell',date:'2026-02-01'},buy];expect(()=>parseBackup(backupPayload(s))).toThrow();});
 it('ripristina tutti i dati senza condividere riferimenti',()=>{const s=portfolio();s.trades=[buy];const restored=parseBackup(backupPayload(s));expect(restored).toEqual(s);restored.accounts[0]!.name='Altro';expect(s.accounts[0]!.name).toBe('Conto principale');});
 it('rifiuta trasferimenti allo stesso conto e link eseguibili',()=>{const s=freshState();s.projectUrl='javascript:alert(1)';expect(validateState(s)).toBe(false);s.projectUrl='';s.movements=[{id:'m',date:'2026-01-01',kind:'transfer',amountCents:10,fromId:'main-cash',toId:'main-cash',category:'',note:''}];expect(validateState(s)).toBe(false);});
 it('rifiuta checklist corrotte',()=>{const s=freshState();s.reviews=[{month:'2026-01',incomeCents:0,expensesCents:0,savingCents:0,closingBalanceCents:null,notes:'',source:'manual',updatedAt:'2026-01-01',checklist:{a:'yes' as never}}];expect(validateState(s)).toBe(false);});
 it('calcola vendita parziale e commissioni',()=>{const s=portfolio();s.trades=[buy,{...buy,id:'s',side:'sell',quantity:0.5,unitPriceCents:12000,feesCents:50}];expect(holdings(s,'p')[0]!.costCents).toBe(15075);expect(accountBalance(s,'main-cash')).toBe(85850);expect(netWorth(s)).toBe(103850);});
 it.each([NaN,Infinity,1.5])('rifiuta durata %s',years=>expect(()=>simulate({initialCents:0,monthlyCents:100,years,annualRate:0,inflation:0,annualFee:0})).toThrow());
 it('rifiuta tasso netto fuori dominio',()=>expect(()=>simulate({initialCents:0,monthlyCents:100,years:1,annualRate:-99,inflation:0,annualFee:2})).toThrow());
});

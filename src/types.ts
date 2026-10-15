export type Id = string;
export type AccountType = 'current'|'deposit'|'broker'|'cash';
export type MovementKind = 'income'|'expense'|'transfer'|'adjustment';
export type GoalStatus = 'active'|'paused'|'completed';
export type LessonStatus = 'todo'|'doing'|'review'|'done';
export interface Account { id:Id; name:string; type:AccountType; openingCents:number; }
export interface Movement { id:Id; date:string; kind:MovementKind; amountCents:number; fromId?:Id; toId?:Id; category:string; note:string; }
export interface Allocation { accountId:Id; amountCents:number; }
export interface Goal { id:Id; title:string; targetCents:number; deadline:string; monthlyCents:number; priority:1|2|3; status:GoalStatus; allocations:Allocation[]; }
export interface Portfolio { id:Id; name:string; mode:'real'|'simulation'; cashAccountId?:Id; }
export interface Security { id:Id; name:string; isin:string; }
export interface Trade { id:Id; portfolioId:Id; securityId:Id; date:string; side:'buy'|'sell'; quantity:number; unitPriceCents:number; feesCents:number; }
export interface Price { securityId:Id; date:string; unitPriceCents:number; }
export interface Review { month:string; incomeCents:number; expensesCents:number; savingCents:number; closingBalanceCents:number|null; notes:string; checklist:Record<string,boolean>; source:'manual'|'transactions'; updatedAt:string; }
export interface LessonProgress { status:LessonStatus; notes:string; exercise:string; quizScore:number|null; }
export interface LegacyUnreconciled { emergencyCents:number; investmentsCents:number; note:string; }
export interface AppState {
  schemaVersion:2;
  plan:{incomeCents:number; expensesCents:number; targetCents:number};
  accounts:Account[]; movements:Movement[]; goals:Goal[];
  portfolios:Portfolio[]; securities:Security[]; trades:Trade[]; prices:Price[];
  reviews:Review[]; lessons:Record<string,LessonProgress>;
  projectUrl:string; legacy:LegacyUnreconciled|null;
  migration:{source:'fresh'|'v1'|'backup'; migratedAt:string};
}
export type AppPage = 'dashboard'|'accounts'|'goals'|'monthly'|'simulation'|'portfolio'|'academy'|'assistant'|'settings';

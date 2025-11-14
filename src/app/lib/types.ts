import type { Party } from './parties';

export type Balances = Record<Party, number>;

export interface Transaction {
  id: string;
  from: Party;
  to: Party;
  amount: number;
  date: Date;
  description?: string;
}

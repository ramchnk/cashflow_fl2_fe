import type { Party } from './parties';

export type Balances = Record<Party, number>;

export interface Transaction {
  id: string;
  from: Party;
  to: Party;
  amount: number;
  date: Date;
  description?: string;
  fromAccountOpeningBalance: number;
  toAccountOpeningBalance: number;
}

export interface ApiTransaction {
    _id: { $oid: string };
    fromAccount: Party;
    toAccount: Party;
    amount: number;
    date: number;
    naration?: string;
    fromAccountOpeningBalance: number;
    toAccountOpeningBalance: number;
}

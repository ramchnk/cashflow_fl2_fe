import type { LucideIcon } from 'lucide-react';
import { Landmark, HandCoins, Store, Boxes, ReceiptText, Wallet } from 'lucide-react';

export type Party = 'cashInHand' | 'bank' | 'tasmac' | 'stock' | 'expenses' | 'total';

export interface PartyDetails {
  name: string;
  icon: LucideIcon;
}

export const parties: Record<Party, PartyDetails> = {
  cashInHand: { name: 'Cash in Hand', icon: HandCoins },
  bank: { name: 'Bank', icon: Landmark },
  tasmac: { name: 'Tasmac', icon: Store },
  stock: { name: 'Stock', icon: Boxes },
  expenses: { name: 'Expenses', icon: ReceiptText },
  total: { name: 'Total', icon: Wallet },
};

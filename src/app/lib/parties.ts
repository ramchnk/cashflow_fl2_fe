import type { LucideIcon } from 'lucide-react';
import { Landmark, HandCoins, Store, Boxes, ReceiptText, Wallet, PiggyBank, Building2, TrendingUp, PackageCheck } from 'lucide-react';

export type Party = string;

export interface PartyDetails {
  name: string;
  icon: LucideIcon;
}

// A helper function to generate party details dynamically.
export function getPartyDetails(party: Party): PartyDetails {
  const lowerCaseParty = party.toLowerCase();

  // Handle specific known party types
  if (lowerCaseParty === 'cashinhand') {
    return { name: 'Cash in Hand', icon: HandCoins };
  }
  if (lowerCaseParty === 'tasmac') {
    return { name: 'Tasmac', icon: Store };
  }
  if (lowerCaseParty === 'stock') {
    return { name: 'Stock', icon: Boxes };
  }
  if (lowerCaseParty === 'expenses') {
    return { name: 'Expenses', icon: ReceiptText };
  }
  if (lowerCaseParty === 'total') {
    return { name: 'Total', icon: Wallet };
  }
   if (lowerCaseParty === 'profit') {
    return { name: 'Profit', icon: TrendingUp };
  }
  if (lowerCaseParty === 'readytocollect') {
    return { name: 'Ready to Collect', icon: PackageCheck };
  }

  // Handle dynamic bank accounts
  if (lowerCaseParty.includes('bank')) {
    // Attempt to format the name, e.g., "BOIBank" -> "BOI Bank"
    const formattedName = party.replace(/([A-Z])/g, ' $1').replace('Bank', ' Bank').trim();
    return { name: formattedName, icon: Landmark };
  }
  
  // Add other dynamic rules here if needed, e.g., for different types of investments
  if (lowerCaseParty.includes('investment')) {
      return { name: party, icon: PiggyBank };
  }

  // Fallback for any other account type
  return { name: party, icon: Building2 };
}

"use client";

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import Header from '@/components/layout/header';
import BalanceCard from '@/components/dashboard/balance-card';
import BalanceSummary from '@/components/dashboard/balance-summary';
import TransactionForm from '@/components/dashboard/transaction-form';
import { useToast } from "@/hooks/use-toast";
import type { Party, PartyDetails } from '@/app/lib/parties';
import { parties } from '@/app/lib/parties';


export interface Balances {
  cashInHand: number;
  bank: number;
  tasmac: number;
  stock: number;
}

export default function Home() {
  const [balances, setBalances] = useState<Balances>({
    cashInHand: 50000,
    bank: 250000,
    tasmac: 75000,
    stock: 120000,
  });
  const { toast } = useToast();

  const handleTransaction = (from: Party, to: Party, amount: number) => {
    if (balances[from] < amount) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: `Insufficient funds in ${parties[from].name}.`,
      });
      return false;
    }

    setBalances(prevBalances => {
      const newBalances = {
        ...prevBalances,
        [from]: prevBalances[from] - amount,
        [to]: prevBalances[to] + amount,
      };
      
      toast({
        title: "Transaction Successful",
        description: `Transferred ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${parties[from].name} to ${parties[to].name}.`,
      });
      
      return newBalances;
    });
    return true;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">Account Balances</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(balances) as Party[]).map((party) => (
                <BalanceCard
                  key={party}
                  party={parties[party]}
                  balance={balances[party]}
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <TransactionForm onTransaction={handleTransaction} balances={balances} />
            <BalanceSummary balances={balances} />
          </div>
        </div>
      </main>
    </div>
  );
}

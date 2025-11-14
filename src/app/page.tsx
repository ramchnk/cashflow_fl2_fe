"use client";

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import Header from '@/components/layout/header';
import BalanceCard from '@/components/dashboard/balance-card';
import TransactionForm from '@/components/dashboard/transaction-form';
import TransactionHistory from '@/components/dashboard/transaction-history';
import { useToast } from "@/hooks/use-toast";
import type { Party } from '@/app/lib/parties';
import { parties } from '@/app/lib/parties';
import type { Balances, Transaction } from '@/app/lib/types';


export default function Home() {
  const [balances, setBalances] = useState<Balances>({
    cashInHand: 50000,
    bank: 250000,
    tasmac: 75000,
    stock: 120000,
    expenses: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();

  const handleTransaction = (from: Party, to: Party, amount: number, description?: string) => {
    if (from !== 'expenses' && balances[from] < amount) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: `Insufficient funds in ${parties[from].name}.`,
      });
      return false;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      from,
      to,
      amount,
      date: new Date(),
      description,
    };

    setBalances(prevBalances => {
      const newBalances = { ...prevBalances };
      if (from !== 'expenses') {
        newBalances[from] -= amount;
      }
      if (to !== 'expenses') {
        newBalances[to] += amount;
      } else {
        // if it is an expense, we add it to the expenses total
        newBalances.expenses += amount;
      }
      return newBalances;
    });

    setTransactions(prev => [newTransaction, ...prev]);

    let toastDescription = `Transferred ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${parties[from].name} to ${parties[to].name}.`;

    if (to === 'expenses') {
      toastDescription = `Logged expense of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${parties[from].name}.`;
    }

    toast({
      title: "Transaction Successful",
      description: toastDescription,
    });
      
    return true;
  };

  const displayParties: Party[] = ['cashInHand', 'bank', 'tasmac', 'stock'];


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">Account Balances</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {displayParties.map((party) => (
                <BalanceCard
                  key={party}
                  party={parties[party]}
                  balance={balances[party]}
                />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 items-start">
             <TransactionForm onTransaction={handleTransaction} balances={balances} />
             <TransactionHistory transactions={transactions} />
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import BalanceCard from '@/components/dashboard/balance-card';
import TransactionForm from '@/components/dashboard/transaction-form';
import TransactionHistory from '@/components/dashboard/transaction-history';
import { useToast } from "@/hooks/use-toast";
import type { Party } from '@/app/lib/parties';
import { parties } from '@/app/lib/parties';
import type { Balances, Transaction } from '@/app/lib/types';


type ApiAccountName = 'cashInHand' | 'bankAccount' | 'tasmac' | 'stock';

const partyToApiAccountMap: Record<Party, ApiAccountName | null> = {
  cashInHand: 'cashInHand',
  bank: 'bankAccount',
  tasmac: 'tasmac',
  stock: 'stock',
  expenses: null, // Expenses are handled differently
  total: null,
};


export default function Home() {
  const [balances, setBalances] = useState<Balances>({
    cashInHand: 0,
    bank: 0,
    tasmac: 0,
    stock: 0,
    expenses: 0,
    total: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccountInfo = async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/account/getAccountInfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.account) {
          setBalances(prev => ({
              ...prev,
              cashInHand: data.account.cashInHand || 0,
              bank: data.account.bankAccount || 0,
              tasmac: data.account.tasmac || 0,
              stock: data.account.stock || 0
          }));
        } else {
          throw new Error('Account information not found in response.');
        }
      } else {
          if(response.status === 401) {
              toast({
                  variant: "destructive",
                  title: "Session Expired",
                  description: "Please login again.",
              });
              sessionStorage.removeItem('accessToken');
              router.push('/login');
          } else {
              throw new Error('Failed to fetch account information');
          }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: error.message || "Could not fetch account information.",
      });
    }
  };


  useEffect(() => {
    fetchAccountInfo();
  }, [router, toast]);

  const handleTransaction = async (from: Party, to: Party, amount: number, date: Date, description?: string): Promise<boolean> => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "Your session has expired. Please login again.",
        });
        router.push('/login');
        return false;
    }

    if (from !== 'expenses' && balances[from] < amount) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: `Insufficient funds in ${parties[from].name}.`,
      });
      return false;
    }
    
    setIsSubmitting(true);

    let fromAccount: ApiAccountName | 'bankAccount' = 'bankAccount';
    let toAccount: ApiAccountName | 'bankAccount' = 'bankAccount';

    if (to === 'expenses') { // Deduction
        fromAccount = 'bankAccount';
        toAccount = 'bankAccount';
    } else {
        const apiFrom = partyToApiAccountMap[from];
        const apiTo = partyToApiAccountMap[to];

        if (!apiFrom || !apiTo) {
            toast({ variant: "destructive", title: "Invalid Transaction", description: "Invalid source or destination for transaction."});
            setIsSubmitting(false);
            return false;
        }
        fromAccount = apiFrom;
        toAccount = apiTo;
    }

    const payload = {
        date: Math.floor(date.getTime() / 1000),
        fromAccount,
        toAccount,
        amount,
        ...(to === 'expenses' && description && { naration: description })
    };

    try {
        const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/cashflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Transaction failed on the server.');
        }

        // Only update UI on successful API call
        const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          from,
          to,
          amount,
          date,
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

        setTransactions(prev => [newTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));

        let toastDescription = `Transferred ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${parties[from].name} to ${parties[to].name}.`;

        if (to === 'expenses') {
          toastDescription = `Logged expense of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${parties[from].name}.`;
        }

        toast({
          title: "Transaction Successful",
          description: toastDescription,
        });

        // Re-fetch account info to get the latest state from the server
        await fetchAccountInfo();
        
        return true;

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Transaction Failed",
            description: error.message || "Could not process transaction.",
        });
        return false;
    } finally {
        setIsSubmitting(false);
    }
  };

  const totalBalance = balances.cashInHand + balances.bank + balances.tasmac + balances.stock;
  const displayParties: Party[] = ['cashInHand', 'bank', 'tasmac', 'stock'];


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">Account Balances</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <BalanceCard
                party={parties.total}
                balance={totalBalance}
              />
              {displayParties.map((party) => (
                <BalanceCard
                  key={party}
                  party={parties[party]}
                  balance={balances[party]}
                />
              ))}
            </div>
          </section>
          
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 items-start">
             <div className="lg:col-span-1">
                <TransactionForm onTransaction={handleTransaction} balances={balances} isSubmitting={isSubmitting} />
             </div>
             <div className="lg:col-span-1">
                <TransactionHistory transactions={transactions} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

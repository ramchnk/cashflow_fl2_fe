"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import BalanceCard from '@/components/dashboard/balance-card';
import TransactionForm from '@/components/dashboard/transaction-form';
import TransactionHistory from '@/components/dashboard/transaction-history';
import { useToast } from "@/hooks/use-toast";
import { getPartyDetails, type Party } from '@/app/lib/parties';
import type { Balances, Transaction } from '@/app/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


export default function Home() {
  const [balances, setBalances] = useState<Balances>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccountInfo = async () => {
    setIsLoading(true);
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
        if (data.account && data.account.cashFlow) {
          setBalances(data.account.cashFlow);
        } else {
          throw new Error('Account cashFlow not found in response.');
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
    } finally {
        setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchAccountInfo();
  }, []);

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

    if (from !== 'expenses' && (balances[from] ?? 0) < amount) {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: `Insufficient funds in ${getPartyDetails(from).name}.`,
      });
      return false;
    }
    
    setIsSubmitting(true);

    const payload = {
        date: Math.floor(date.getTime() / 1000),
        fromAccount: from,
        toAccount: to,
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

        const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          from,
          to,
          amount,
          date,
          description,
        };

        setTransactions(prev => [newTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
        
        const fromDetails = getPartyDetails(from);
        const toDetails = getPartyDetails(to);

        let toastDescription = `Transferred ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${fromDetails.name} to ${toDetails.name}.`;

        if (to === 'expenses') {
          toastDescription = `Logged expense of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)} from ${fromDetails.name}.`;
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

  const totalBalance = Object.values(balances).reduce((acc, cur) => acc + (typeof cur === 'number' ? cur : 0), 0);
  const accountKeys = Object.keys(balances);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">Account Balances</h2>
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[109px] rounded-lg" />)}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <BalanceCard
                  party={getPartyDetails('total')}
                  balance={totalBalance}
                />
                {accountKeys.map((party) => (
                  <BalanceCard
                    key={party}
                    party={getPartyDetails(party)}
                    balance={balances[party]}
                  />
                ))}
              </div>
            )}
          </section>
          
          <div className="grid grid-cols-1 gap-8 items-start">
             <div className="lg:col-span-1">
                <TransactionForm onTransaction={handleTransaction} balances={balances} isSubmitting={isSubmitting} />
             </div>
             <div className="lg:col-span-1">
                <TransactionHistory transactions={transactions} allParties={accountKeys} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

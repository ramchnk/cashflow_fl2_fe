
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
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
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Filter state lifted up
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [partyFilter, setPartyFilter] = useState<string>('all');


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

  const fetchTransactions = useCallback(async (filterType: string, range?: DateRange) => {
    setIsHistoryLoading(true);
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      if (range?.from) {
        params.append('startDate', Math.floor(range.from.getTime() / 1000).toString());
      }
      if (range?.to) {
        params.append('endDate', Math.floor(range.to.getTime() / 1000).toString());
      }
      
      const response = await fetch(`https://tnfl2-cb6ea45c64b3.herokuapp.com/services/cashflow?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Assuming the API returns an array of transactions in a property, e.g., `cashflows`
        // And that each transaction needs to be mapped to our Transaction type
        const apiTransactions = data.cashflows || [];
        const formattedTransactions: Transaction[] = apiTransactions.map((tx: any) => ({
          id: tx._id || crypto.randomUUID(),
          from: tx.fromAccount,
          to: tx.toAccount,
          amount: tx.amount,
          date: new Date(tx.date * 1000), // Assuming date is a UNIX timestamp
          description: tx.naration,
        }));
        setTransactions(formattedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
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
            throw new Error('Failed to fetch transaction history');
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: error.message || "Could not fetch transaction history.",
      });
      setTransactions([]); // Clear transactions on error
    } finally {
      setIsHistoryLoading(false);
    }
  }, [router, toast]);


  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      fetchAccountInfo();
      fetchTransactions(partyFilter, dateRange);
    } else {
      router.push('/login');
    }
  }, [partyFilter, dateRange, fetchTransactions, router]);

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

    const toAccount = to === 'expenses' ? from : to;

    const payload: {
        date: number;
        fromAccount: string;
        toAccount: string;
        amount: number;
        naration?: string;
        fromAccountOpeningBalance: number;
        toAccountOpeningBalance: number;
    } = {
        date: Math.floor(date.getTime() / 1000),
        fromAccount: from,
        toAccount: toAccount,
        amount,
        fromAccountOpeningBalance: balances[from] ?? 0,
        toAccountOpeningBalance: balances[toAccount] ?? 0,
    };

    if (description) {
        payload.naration = description;
    }


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

        // Re-fetch account info and transactions to get the latest state from the server
        await fetchAccountInfo();
        await fetchTransactions(partyFilter, dateRange);
        
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

  const totalBalance = Object.entries(balances)
    .filter(([key]) => key !== 'stock')
    .reduce((acc, [, value]) => acc + (typeof value === 'number' ? value : 0), 0);

  const accountKeys = Object.keys(balances);
  const regularAccounts = accountKeys.filter(key => key !== 'stock' && key !== 'expenses');
  const stockAccount = accountKeys.find(key => key === 'stock');

  const onFiltersChange = (newPartyFilter: string, newDateRange?: DateRange) => {
    setPartyFilter(newPartyFilter);
    setDateRange(newDateRange);
  }


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
              <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {regularAccounts.map((party) => (
                      <BalanceCard
                        key={party}
                        party={getPartyDetails(party)}
                        balance={balances[party]}
                      />
                    ))}
                    {stockAccount && (
                        <BalanceCard
                          key={stockAccount}
                          party={getPartyDetails(stockAccount)}
                          balance={balances[stockAccount]}
                        />
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 pt-4">
                     <BalanceCard
                        party={getPartyDetails('total')}
                        balance={totalBalance}
                      />
                  </div>
              </div>
            )}
          </section>
          
          <div className="grid grid-cols-1 gap-8 items-start">
             <div className="lg:col-span-1">
                <TransactionForm onTransaction={handleTransaction} balances={balances} isSubmitting={isSubmitting} />
             </div>
             <div className="lg:col-span-1">
                <TransactionHistory 
                    transactions={transactions} 
                    allParties={accountKeys}
                    dateRange={dateRange}
                    partyFilter={partyFilter}
                    onFiltersChange={onFiltersChange}
                    isLoading={isHistoryLoading}
                />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
import Header from '@/components/layout/header';
import BalanceCard from '@/components/dashboard/balance-card';
import TransactionForm from '@/components/dashboard/transaction-form';
import TransactionHistory from '@/components/dashboard/transaction-history';
import { useToast } from "@/hooks/use-toast";
import { getPartyDetails, type Party } from '@/app/lib/parties';
import type { Balances, Transaction, ApiTransaction } from '@/app/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserStore } from '@/app/lib/user-store';


export default function Home() {
  const [balances, setBalances] = useState<Balances>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investAmount, setInvestAmount] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const { setShopName } = useUserStore();


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
        if (data.account && data.account.investAmount) {
            setInvestAmount(data.account.investAmount);
        }
         if (data.account && data.account.shopName) {
          setShopName(data.account.shopName);
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

  const fetchTransactions = useCallback(async () => {
    setIsHistoryLoading(true);
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (partyFilter !== 'all') {
        params.append('type', partyFilter);
      }
      if (dateRange?.from) {
        params.append('startDate', Math.floor(startOfDay(dateRange.from).getTime() / 1000).toString());
      }
      if (dateRange?.to) {
        params.append('endDate', Math.floor(endOfDay(dateRange.to).getTime() / 1000).toString());
      }
      
      const response = await fetch(`https://tnfl2-cb6ea45c64b3.herokuapp.com/services/cashflow?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const apiTransactions: ApiTransaction[] = data.transactions || [];
        
        const formattedTransactions: Transaction[] = apiTransactions.map((tx) => {
            const rawDate = typeof tx.date === 'object' && tx.date !== null && '$numberLong' in tx.date ? tx.date.$numberLong : tx.date;
            const timestamp = typeof rawDate === 'string' ? parseInt(rawDate, 10) : Number(rawDate);

            return {
                id: tx._id.$oid,
                from: tx.fromAccount,
                to: tx.toAccount,
                amount: tx.amount,
                date: new Date(timestamp * 1000),
                description: tx.naration,
                fromAccountOpeningBalance: tx.fromAccountOpeningBalance,
                toAccountOpeningBalance: tx.toAccountOpeningBalance,
            };
        });
        
        setTransactions(formattedTransactions);

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
      setTransactions([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [router, toast, partyFilter, dateRange]);


  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      fetchAccountInfo();
    } else {
      router.push('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

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

        // Re-fetch account info to get the latest state from the server
        await fetchAccountInfo();
        if (dateRange || partyFilter !== 'all') {
            await fetchTransactions();
        }
        
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
    .reduce((acc, [, value]) => acc + (typeof value === 'number' ? value : 0), 0);

  const profit = totalBalance - investAmount;

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
          <section className="print-hidden">
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
                  <div className="grid gap-4 md:grid-cols-2 pt-4">
                     <BalanceCard
                        party={getPartyDetails('total')}
                        balance={totalBalance}
                      />
                     <BalanceCard
                        party={getPartyDetails('profit')}
                        balance={profit}
                      />
                  </div>
              </div>
            )}
          </section>
          
          <div className="grid grid-cols-1 gap-8 items-start">
             <div className="lg:col-span-1 print-hidden">
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
                    onGetReport={fetchTransactions}
                />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

    
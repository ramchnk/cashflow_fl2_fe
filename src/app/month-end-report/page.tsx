
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import { Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPartyDetails } from '@/app/lib/parties';
import { useUserStore } from '@/app/lib/user-store';
import { format } from 'date-fns';

interface Balances {
    [key: string]: number;
}

export default function MonthEndReportPage() {
  const [balances, setBalances] = useState<Balances>({});
  const [investAmount, setInvestAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { shopName, setShopName } = useUserStore();

  useEffect(() => {
    const fetchReportData = async () => {
        setIsLoading(true);
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/account/getAccountInfo', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.account) {
                    setBalances(data.account.cashFlow || {});
                    setInvestAmount(data.account.investAmount || 0);
                    if (data.account.shopName) {
                        setShopName(data.account.shopName);
                    }
                } else {
                    throw new Error('Account data not found in response.');
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
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch report data');
                }
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'An Error Occurred',
                description: error.message || 'Could not fetch report data.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchReportData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, toast]);
  
  const handlePrint = () => {
    window.print();
  }
  
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
    }).format(amount);
  }
  
  const detailsOrder = ['stock', 'CashInHand'];

  const reportDetails = Object.keys(balances)
    .filter(key => key !== 'expenses' && key !== 'readyToCollect')
    .sort((a, b) => {
        const aIndex = detailsOrder.indexOf(a);
        const bIndex = detailsOrder.indexOf(b);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        if (a.toLowerCase().includes('bank') && !b.toLowerCase().includes('bank')) return 1;
        if (!a.toLowerCase().includes('bank') && b.toLowerCase().includes('bank')) return -1;
        return a.localeCompare(b);
    });

    const closeTotal = reportDetails.reduce((acc, key) => acc + (balances[key] || 0), 0);
    const profit = closeTotal - investAmount;


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-center text-xl text-primary font-bold">MONTHLY PROFIT CALCULATION</CardTitle>
                            <CardDescription className="text-center text-lg font-semibold">{shopName}</CardDescription>
                            <CardDescription className="text-center text-md">{format(new Date(), 'MMMM-yyyy')}</CardDescription>
                        </div>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="print-hidden" disabled={isLoading}>
                            <Printer className="h-5 w-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                      <div className="h-96 flex items-center justify-center">
                          <p>Loading Report...</p>
                      </div>
                  ) : (
                    <Table>
                        <TableHeader className="bg-yellow-300">
                        <TableRow>
                            <TableHead className="font-bold text-black">DETAILS</TableHead>
                            <TableHead className="text-right font-bold text-black">OPEN</TableHead>
                            <TableHead className="text-right font-bold text-black">CLOSE</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportDetails.map(key => (
                            <TableRow key={key}>
                                <TableCell className="font-medium">{getPartyDetails(key).name}</TableCell>
                                <TableCell className="text-right"></TableCell>
                                <TableCell className="text-right">{formatCurrency(balances[key] || 0)}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter className="text-lg font-bold">
                            <TableRow>
                                <TableCell>TOTAL</TableCell>
                                <TableCell className="text-right">{formatCurrency(investAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(closeTotal)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>PROFIT = (CLOSE - OPEN)</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">{formatCurrency(profit)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-green-200">
                                <TableCell>Total Profit</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right text-green-700">{formatCurrency(profit)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                  )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}

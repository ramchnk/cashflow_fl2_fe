
'use client';

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
import Header from '@/components/layout/header';
import { Printer } from 'lucide-react';
import { getPartyDetails } from '@/app/lib/parties';
import { format } from 'date-fns';

interface Balances {
    [key: string]: number;
}

export default function MonthEndReportPage() {
  // --- Static Data ---
  const shopName = "Gobi's Shop";
  const investAmount = 250000;
  const balances: Balances = {
      stock: 150000,
      CashInHand: 75000,
      IOBBank: 50000,
      HDFCBank: 25000,
      'Sundry Debtors': 30000,
  };
  const isLoading = false;
  // -------------------

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


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
import { Printer, Camera } from 'lucide-react';
import { getPartyDetails } from '@/app/lib/parties';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';


interface Balances {
    [key: string]: number;
}

interface MonthEndReportProps {
    balances: Balances;
    investAmount: number;
    shopName: string | null;
    isLoading: boolean;
}

export default function MonthEndReport({ balances, investAmount, shopName, isLoading }: MonthEndReportProps) {

  const handlePrint = () => {
    const printContent = document.getElementById('report-content');
    if (printContent) {
        const originalContents = document.body.innerHTML;
        const header = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 1.5rem; font-weight: bold; color: #3F51B5;">MONTHLY PROFIT CALCULATION</h1>
                <h2 style="font-size: 1.25rem; font-weight: 600;">${shopName || "Gobi's Shop"}</h2>
                <p style="font-size: 1rem;">${format(new Date(), 'MMMM-yyyy')}</p>
            </div>
        `;
        document.body.innerHTML = header + printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
    }
  }

  const handleCapture = () => {
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
      html2canvas(reportContent, { 
        useCORS: true,
        scale: 2 // Increase scale for better resolution
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `monthly-profit-report-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  }
  
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
  }
  
  const detailsOrder = ['stock', 'CashInHand', 'CashInOffice'];

  const reportBalances = { ...balances };

  if (reportBalances.readyToCollect) {
    reportBalances.CashInOffice = reportBalances.readyToCollect;
  }

  const reportDetails = Object.keys(reportBalances)
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

    const closeTotal = reportDetails.reduce((acc, key) => acc + (reportBalances[key] || 0), 0);
    const profit = closeTotal - investAmount;

    const getRowName = (key: string) => {
      if (key === 'CashInOffice') {
        return 'Cash in Office';
      }
      return getPartyDetails(key).name;
    }


  return (
    <div className="space-y-6">
        <style>
            {`
            @media print {
                body {
                    background: white !important;
                    color: black !important;
                }
                .print-hidden { display: none; }
                .report-card { box-shadow: none; border: none; }
            }
            `}
        </style>
        <Card className="report-card border-0 shadow-none">
            <CardHeader className="print-hidden">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-center text-xl text-primary font-bold">MONTHLY PROFIT CALCULATION</CardTitle>
                        <CardDescription className="text-center text-lg font-semibold">{shopName || "Gobi's Shop"}</CardDescription>
                        <CardDescription className="text-center text-md">{format(new Date(), 'MMMM-yyyy')}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCapture} variant="outline" size="icon" className="print-hidden" disabled={isLoading}>
                            <Camera className="h-5 w-5"/>
                        </Button>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="print-hidden" disabled={isLoading}>
                            <Printer className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent id="report-content" className="pt-0 bg-background p-6">
              {isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                      <p>Loading Report...</p>
                  </div>
              ) : (
                <Table>
                    <TableHeader className="bg-yellow-300">
                    <TableRow>
                        <TableHead className="font-bold text-black text-lg">DETAILS</TableHead>
                        <TableHead className="text-right font-bold text-black text-lg">OPEN</TableHead>
                        <TableHead className="text-right font-bold text-black text-lg">CLOSE</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody className="text-lg">
                        {reportDetails.map(key => (
                        <TableRow key={key}>
                            <TableCell className="font-medium">{getRowName(key)}</TableCell>
                            <TableCell className="text-right"></TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(reportBalances[key] || 0)}</TableCell>
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
  );
}

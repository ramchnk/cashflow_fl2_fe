
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import { CalendarIcon, Printer } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useRouter } from 'next/navigation';
import { getPartyDetails } from '@/app/lib/parties';
import { useUserStore } from '@/app/lib/user-store';


interface ReportData {
  opening: Record<string, number>;
  closing: Record<string, number>;
}

export default function MonthEndReportPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { shopName } = useUserStore();

  const handleGenerateReport = async () => {
    if (!selectedMonth) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a month to generate the report.',
      });
      return;
    }

    setIsLoading(true);
    setReportData(null);

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
        const fromTime = Math.floor(startOfMonth(selectedMonth).getTime() / 1000);
        const toTime = Math.floor(endOfMonth(selectedMonth).getTime() / 1000);
        
        const url = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/account/profitAndLoss?fromTime=${fromTime}&toTime=${toTime}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data) {
                setReportData(data.data);
                toast({
                    title: 'Report Generated',
                    description: `Profit & Loss report for ${format(selectedMonth, 'MMMM yyyy')} is ready.`
                });
            } else {
                throw new Error('Report data is missing from the server response.');
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
            description: error.message || 'Could not generate the report.',
        });
        setReportData(null);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  }
  
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
    }).format(amount);
  }
  
  const detailsOrder = [
    'stock',
    'CashInHand',
  ];

  const reportDetails = reportData ? 
    Object.keys(reportData.closing)
    .filter(key => key !== 'expenses' && key !== 'readyToCollect')
    .sort((a, b) => {
        const aIndex = detailsOrder.indexOf(a);
        const bIndex = detailsOrder.indexOf(b);

        if (aIndex > -1 && bIndex > -1) {
            return aIndex - bIndex;
        }
        if (aIndex > -1) {
            return -1;
        }
        if (bIndex > -1) {
            return 1;
        }
        // crude sort for bank accounts
        if (a.toLowerCase().includes('bank') && !b.toLowerCase().includes('bank')) {
          return 1;
        }
        if (!a.toLowerCase().includes('bank') && b.toLowerCase().includes('bank')) {
          return -1;
        }
        return a.localeCompare(b);
    }) : [];

    const openTotal = reportData ? Object.values(reportData.opening).reduce((acc, val) => acc + val, 0) : 0;
    const closeTotal = reportData ? Object.values(reportData.closing).reduce((acc, val) => acc + val, 0) : 0;
    const profit = closeTotal - openTotal;


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-6">
          <Card className="print-hidden">
            <CardHeader>
              <CardTitle>Generate Month End Report</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="month-picker">Select Month</Label>
                       <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="month-picker"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !selectedMonth && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedMonth ? format(selectedMonth, "MMMM yyyy") : <span>Pick a month</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedMonth}
                                    onSelect={setSelectedMonth}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateReport} disabled={isLoading || !selectedMonth}>
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardFooter>
          </Card>
          
          {reportData && (
              <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-center text-xl text-primary font-bold">PROFIT CALCULATION</CardTitle>
                            <CardDescription className="text-center text-lg font-semibold">{shopName}</CardDescription>
                            {selectedMonth && isValid(selectedMonth) && (
                                 <CardDescription className="text-center text-md">{format(selectedMonth, 'MMMM-yyyy')}</CardDescription>
                            )}
                        </div>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="print-hidden">
                            <Printer className="h-5 w-5"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
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
                             <TableCell className="text-right">{formatCurrency(reportData.opening[key] || 0)}</TableCell>
                             <TableCell className="text-right">{formatCurrency(reportData.closing[key] || 0)}</TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter className="text-lg font-bold">
                        <TableRow>
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(openTotal)}</TableCell>
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
                </CardContent>
              </Card>
          )}
        </div>
      </main>
    </div>
  );
}

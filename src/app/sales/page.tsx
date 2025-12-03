
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
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
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import type { DateRange } from 'react-day-picker';

interface ApiSaleItem {
    profitAmount: number;
    invoiceNumber: string;
    finalCashSettlement: number;
    _id: { $oid: string };
    totalDigitalAmount: number;
    timeCreatedAt: number;
    totalSalesAmount: number;
    totalExpensesAmount: number;
    basePrice: number;
    kitchenSales?: number;
}

const formatCurrency = (amount?: number) => {
    if (amount == null || isNaN(amount)) return '₹ 0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function SalesPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sales, setSales] = useState<ApiSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);


  const { toast } = useToast();
  const router = useRouter();

  const handleGetSales = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({
        variant: 'destructive',
        title: 'Please select a date range.',
      });
      return;
    }
    
    setIsLoading(true);
    setSales([]);
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
      const fromTime = Math.floor(startOfDay(dateRange.from).getTime() / 1000);
      const toTime = Math.floor(endOfDay(dateRange.to).getTime() / 1000);
      const url = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/sales?startDate=${fromTime}&endDate=${toTime}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        setSales(responseData.data || []);
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
            throw new Error(errorData.message || 'Failed to fetch sales');
        }
      }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'An Error Occurred',
            description: error.message || 'Could not fetch sales data.',
        });
        setSales([]);
    } finally {
        setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totals = sales.reduce((acc, sale) => {
    acc.totalSalesAmount += sale.totalSalesAmount;
    acc.totalExpensesAmount += sale.totalExpensesAmount;
    acc.totalDigitalAmount += sale.totalDigitalAmount;
    acc.kitchenSales += sale.kitchenSales || 0;
    acc.finalCashSettlement += sale.finalCashSettlement;
    return acc;
  }, {
    totalSalesAmount: 0,
    totalExpensesAmount: 0,
    totalDigitalAmount: 0,
    kitchenSales: 0,
    finalCashSettlement: 0,
  });

  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    setDateRange(selectedRange);
    if (selectedRange?.from && selectedRange?.to) {
        setIsDatePickerOpen(false);
    }
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end print-hidden">
                <div className="grid gap-2">
                  <Label htmlFor="date-range">Date Range</Label>
                   <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[300px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={handleDateSelect}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={handleGetSales} disabled={isLoading || !dateRange?.from || !dateRange.to}>
                  {isLoading ? 'Getting Sales...' : 'Get Sales'}
                </Button>
            </div>
            
            <Card>
                <CardHeader className="print-hidden">
                    <div className="flex justify-between items-center">
                        <CardTitle>Sales Report</CardTitle>
                        <Button variant="outline" onClick={handlePrint} disabled={sales.length === 0}>
                            <Printer className="mr-2 h-4 w-4"/>
                            Print
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Sales Amount</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Digital Pay</TableHead>
                        <TableHead className="text-right">Kitchen Sales</TableHead>
                        <TableHead className="text-right">Final Settlement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Loading...
                            </TableCell>
                        </TableRow>
                      ) : sales.length > 0 ? (
                        sales.map((sale) => (
                          <TableRow key={sale._id.$oid}>
                            <TableCell>{format(new Date(sale.timeCreatedAt * 1000), 'yyyy-MM-dd')}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.totalSalesAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.totalExpensesAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.totalDigitalAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.kitchenSales)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.finalCashSettlement)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No sales data found for the selected period.
                            </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {sales.length > 0 && (
                        <TableFooter className="font-bold">
                            <TableRow>
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.totalSalesAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.totalExpensesAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.totalDigitalAmount)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.kitchenSales)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.finalCashSettlement)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                  </Table>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}

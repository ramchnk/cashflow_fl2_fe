
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
import { Printer, Camera, CalendarIcon } from 'lucide-react';
import { getPartyDetails } from '@/app/lib/parties';
import { format, startOfDay, endOfDay } from 'date-fns';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


interface Balances {
    [key: string]: number;
}

interface MonthEndReportProps {
    balances: Balances;
    investAmount: number;
    shopName: string | null;
    isLoading: boolean;
}

const CashFlowReport = ({ balances, investAmount, shopName, isLoading }: MonthEndReportProps) => {
    const handlePrint = () => {
    const printContent = document.getElementById('report-content-cashflow');
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
    const reportCard = document.getElementById('report-card-cashflow');
    if (reportCard) {
      const buttons = reportCard.querySelectorAll('button');
      buttons.forEach(btn => btn.style.visibility = 'hidden');

      html2canvas(reportCard, { 
        useCORS: true,
        scale: 2, 
        onclone: (document) => {
            const header = document.getElementById('report-header-cashflow');
            if (header) {
                header.classList.remove('print-hidden');
            }
        }
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `monthly-profit-report-cashflow-${format(new Date(), 'yyyy-MM-dd')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        buttons.forEach(btn => btn.style.visibility = 'visible');
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
    reportBalances.CashInHand = (reportBalances.CashInHand || 0);
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
         <Card id="report-card-cashflow" className="report-card border-0 shadow-none">
            <CardHeader id="report-header-cashflow">
                <div className="flex justify-between items-start">
                    <div className="flex-grow"></div>
                    <div className="text-center flex-shrink-0">
                        <CardTitle className="text-xl text-primary font-bold">MONTHLY PROFIT CALCULATION</CardTitle>
                        <CardDescription className="text-lg font-semibold">{shopName || "Gobi's Shop"}</CardDescription>
                        <CardDescription className="text-md">{format(new Date(), 'MMMM-yyyy')}</CardDescription>
                    </div>
                     <div className="flex-grow flex justify-end gap-2">
                        <Button onClick={handleCapture} variant="outline" size="icon" className="print-hidden" disabled={isLoading}>
                            <Camera className="h-5 w-5"/>
                        </Button>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="print-hidden" disabled={isLoading}>
                            <Printer className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent id="report-content-cashflow" className="pt-0 bg-background p-6">
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
    );
}

interface PLStatementProps extends Omit<MonthEndReportProps, 'balances' | 'investAmount'> {}

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

interface ReportData {
    salesValue: number;
    costOfSales: number;
    kitchenIncome: number;
    shopExpenses: number;
}


const PLStatement = ({ shopName }: PLStatementProps) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);


    const handlePrint = () => {
        const printContent = document.getElementById('report-content-pl');
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const header = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="font-size: 1.5rem; font-weight: bold; color: #1E3A8A;">${shopName || 'THENDRAL CLUB THIRUMAYAM'}</h1>
                    <p style="font-size: 1.25rem;">Statement for ${dateRange?.from ? format(dateRange.from, 'MMM yyyy') : 'selected period'}</p>
                </div>
            `;
            document.body.innerHTML = header + printContent.innerHTML;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        }
    }

    const handleCapture = () => {
        const reportCard = document.getElementById('report-card-pl');
        if (reportCard) {
            const buttons = reportCard.querySelectorAll('button');
            buttons.forEach(btn => btn.style.visibility = 'hidden');

            html2canvas(reportCard, { 
                useCORS: true,
                scale: 2
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `pl-statement-${format(new Date(), 'yyyy-MM-dd')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                buttons.forEach(btn => btn.style.visibility = 'visible');
            });
        }
    }

    const handleDateChange = (newDateRange?: DateRange) => {
        setDateRange(newDateRange);
        if (newDateRange?.from && newDateRange?.to) {
            setIsDatePickerOpen(false);
        }
    }

    const handleGetReport = async () => {
        if (!dateRange || !dateRange.from || !dateRange.to) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Range',
                description: 'Please select a valid start and end date.',
            });
            return;
        }

        setIsLoading(true);
        setReportData(null);
        
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            setIsLoading(false);
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
                const result: { data: ApiSaleItem[] } = await response.json();
                const salesValue = result.data.reduce((sum, item) => sum + item.totalSalesAmount, 0);
                const costOfSales = result.data.reduce((sum, item) => sum + item.basePrice, 0);
                const kitchenIncome = result.data.reduce((sum, item) => sum + (item.kitchenSales || 0), 0);
                const shopExpenses = result.data.reduce((sum, item) => sum + (item.totalExpensesAmount || 0), 0);

                setReportData({ salesValue, costOfSales, kitchenIncome, shopExpenses });

                toast({
                    title: 'Report Generated',
                    description: 'P&L statement has been fetched.',
                });
            } else {
                if (response.status === 401) {
                     toast({
                        variant: "destructive",
                        title: "Session Expired",
                        description: "Please login again.",
                    });
                    sessionStorage.removeItem('accessToken');
                    router.push('/login');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch P&L data');
                }
            }

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: error.message || 'Could not fetch P&L data.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

    const SectionHeader = ({ children, value }: { children: React.ReactNode, value?: number }) => (
        <TableRow className="bg-blue-100">
            <TableCell colSpan={value ? 3: 4} className="font-bold text-blue-900">{children}</TableCell>
            {value != null && <TableCell className="text-right font-bold text-blue-900">{formatNumber(value)}</TableCell>}
        </TableRow>
    );
    
    const TotalRow = ({ label, value, isDebit = false, isCredit = false }: { label: string, value: number, isDebit?: boolean, isCredit?: boolean }) => (
         <TableRow className="bg-gray-200 font-bold">
            <TableCell colSpan={isDebit ? 2 : 3} className="text-right">{label}</TableCell>
            {isDebit && <TableCell className="text-right">{formatNumber(value)}</TableCell>}
            {isCredit && <TableCell className="text-right">{formatNumber(value)}</TableCell>}
            {!isDebit && !isCredit && <TableCell colSpan={1}></TableCell>}
        </TableRow>
    );

    const NetProfitRow = ({label, value}: {label: string, value: number}) => (
        <TableRow className="bg-blue-900 text-white font-bold text-lg">
            <TableCell colSpan={3} className="text-right">{label}</TableCell>
            <TableCell className="text-right">{formatNumber(value)}</TableCell>
        </TableRow>
    );
    
    const salesValue = reportData?.salesValue ?? 0;
    const costOfSales = reportData?.costOfSales ?? 0;
    const grossProfit = salesValue - costOfSales;
    const kitchenIncome = reportData?.kitchenIncome ?? 0;
    const emptyBottleSales = 0;
    const totalIncome = grossProfit + kitchenIncome + emptyBottleSales;
    const shopExpenses = reportData?.shopExpenses ?? 0;
    const bankCharges = 607;
    const totalExpenses = shopExpenses + bankCharges;
    const netProfit = totalIncome - totalExpenses;


    return (
        <Card id="report-card-pl" className="border-0 shadow-none">
            <CardHeader id="report-header-pl" className="text-center bg-blue-900 text-white rounded-t-lg py-4">
                 <div className="flex justify-between items-start">
                    <div className="flex-grow"></div>
                    <div className="text-center">
                        <CardTitle className="text-2xl font-bold">{shopName || 'THENDRAL CLUB THIRUMAYAM'}</CardTitle>
                        <CardDescription className="text-lg text-blue-200">
                           {dateRange?.from ? `Statement for ${format(dateRange.from, 'MMM yyyy')}`: 'P&L Statement'}
                        </CardDescription>
                    </div>
                    <div className="flex-grow flex justify-end gap-2 print-hidden">
                        <Button onClick={handleCapture} variant="outline" size="icon" className="bg-transparent text-white hover:bg-white/20" disabled={isLoading || !reportData}>
                            <Camera className="h-5 w-5"/>
                        </Button>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="bg-transparent text-white hover:bg-white/20" disabled={isLoading || !reportData}>
                            <Printer className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
                <div className="p-4 bg-background text-foreground print-hidden">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="grid gap-2">
                          <Label htmlFor="date-range-pl">Date Range</Label>
                           <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-range-pl"
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal",
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
                                        onSelect={handleDateChange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button onClick={handleGetReport} disabled={isLoading || !dateRange?.from || !dateRange?.to}>
                          {isLoading ? 'Getting Report...' : 'Get Report'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent id="report-content-pl" className="p-0">
                 {isLoading ? (
                    <div className="h-96 flex items-center justify-center">
                        <p>Loading Report...</p>
                    </div>
                 ) : !reportData ? (
                    <div className="h-96 flex items-center justify-center text-muted-foreground">
                        <p>Select a date range and click "Get Report" to view the P&L Statement.</p>
                    </div>
                 ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-blue-200">
                                <TableHead className="w-[5%]">S.No</TableHead>
                                <TableHead>Particulars</TableHead>
                                <TableHead className="text-right w-[20%]">Debit</TableHead>
                                <TableHead className="text-right w-[20%]">Credit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell rowSpan={2} className="font-bold align-top pt-6">LIQUOR</TableCell>
                                <TableCell>
                                    <span className="font-bold">A) Sales Value</span>
                                    <p className="text-xs text-muted-foreground">(TOTAL SALES AMOUNT)</p>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">{formatNumber(salesValue)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>
                                <span className="font-bold">B) Cost of Sales</span>
                                    <p className="text-xs text-muted-foreground">(PURCHASE VALUE)</p>
                                </TableCell>
                                <TableCell className="text-right">{formatNumber(costOfSales)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            
                            <SectionHeader value={grossProfit}>GROSS PROFIT</SectionHeader>

                            <SectionHeader>C) OTHER INCOME</SectionHeader>
                            <TableRow>
                                <TableCell>1</TableCell>
                                <TableCell>Kitchen Income</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">{formatNumber(kitchenIncome)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>2</TableCell>
                                <TableCell>Empty Bottle Sales</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">{formatNumber(emptyBottleSales)}</TableCell>
                            </TableRow>
                            <TotalRow label="TOTAL INCOME" value={totalIncome} isCredit />
                            
                            <SectionHeader>D) OTHER EXPENSES</SectionHeader>
                            <TableRow>
                                <TableCell>1</TableCell>
                                <TableCell>Shop Expenses</TableCell>
                                <TableCell className="text-right">{formatNumber(shopExpenses)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>2</TableCell>
                                <TableCell>Bank Charges</TableCell>
                                <TableCell className="text-right">{formatNumber(bankCharges)}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            <TotalRow label="TOTAL EXPENSES" value={totalExpenses} isDebit />

                        </TableBody>
                        <TableFooter>
                            <NetProfitRow label="NET PROFIT" value={netProfit} />
                        </TableFooter>
                    </Table>
                 )}
            </CardContent>
        </Card>
    )
}


export default function MonthEndReport(props: MonthEndReportProps) {

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
                #report-header-cashflow, #report-header-pl { display: block !important; }
            }
            `}
        </style>
        <Tabs defaultValue="cashflow">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                <TabsTrigger value="plstatement">P&amp;L Statement</TabsTrigger>
            </TabsList>
            <TabsContent value="cashflow">
                <CashFlowReport {...props} />
            </TabsContent>
            <TabsContent value="plstatement">
                <PLStatement shopName={props.shopName} isLoading={props.isLoading} />
            </TabsContent>
        </Tabs>
    </div>
  );
}

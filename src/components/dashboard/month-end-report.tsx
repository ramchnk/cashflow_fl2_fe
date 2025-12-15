
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
import { format, startOfDay, endOfDay, parse, isValid } from 'date-fns';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React, { useState } from 'react';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';


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
  }
  
  const cashInHandKey = Object.keys(reportBalances).find(k => k.toLowerCase() === 'cashinhand');


  const reportDetails = Object.keys(reportBalances)
    .filter(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'expenses' || lowerKey === 'readytocollect') return false;
        if (lowerKey === 'cashinhand' && key !== cashInHandKey) return false;
        return true;
    })
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

interface PLStatementProps {
    balances: Balances;
    shopName: string | null;
    isLoading: boolean;
}

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

interface ApiBankChargeItem {
  date: number;
  toAccount: string;
  amount: number;
  toAccountOpeningBalance: number;
  naration: string;
  fromAccount: string;
  fromAccountOpeningBalance: number;
  shopNumber: string;
  _id: { $oid: string };
}

interface ApiExpenseReportItem {
  expenseDetail: string;
  totalAmount: string;
}


interface ReportData {
    salesValue: number;
    costOfSales: number;
    kitchenIncome: number;
    shopExpenses: number;
    bankCharges: number;
    billPayments: number;
}


const PLStatement = ({ shopName, balances, isLoading: isPropsLoading }: PLStatementProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    
    const [startDateString, setStartDateString] = useState('');
    const [endDateString, setEndDateString] = useState('');


    const handlePrint = () => {
        const printContent = document.getElementById('report-content-pl');
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const startDate = parse(startDateString, 'yyyy-MM-dd', new Date());
            const header = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="font-size: 1.5rem; font-weight: bold; color: #1E3A8A;">${shopName || 'THENDRAL CLUB THIRUMAYAM'}</h1>
                    <p style="font-size: 1.25rem;">Statement for ${isValid(startDate) ? format(startDate, 'MMM yyyy') : 'selected period'}</p>
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
            const datePicker = reportCard.querySelector('#pl-date-picker-container');
            const buttons = reportCard.querySelectorAll('button');
            
            if(datePicker) (datePicker as HTMLElement).style.display = 'none';
            buttons.forEach(btn => btn.style.visibility = 'hidden');

            html2canvas(reportCard, { 
                useCORS: true,
                scale: 2
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `pl-statement-${format(new Date(), 'yyyy-MM-dd')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                if(datePicker) (datePicker as HTMLElement).style.display = 'flex';
                buttons.forEach(btn => btn.style.visibility = 'visible');
            });
        }
    }

    const validateDate = (dateString: string) => {
        const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) && format(parsedDate, 'yyyy-MM-dd') === dateString;
    }

    const handleGetReport = async () => {
        const isStartDateValid = validateDate(startDateString);
        const isEndDateValid = validateDate(endDateString);

        if (!isStartDateValid || !isEndDateValid) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Format',
                description: 'Please enter dates in YYYY-MM-DD format.',
            });
            return;
        }

        const startDate = parse(startDateString, 'yyyy-MM-dd', new Date());
        const endDate = parse(endDateString, 'yyyy-MM-dd', new Date());

        if (endDate < startDate) {
            toast({
                variant: 'destructive',
                title: 'Invalid Date Range',
                description: 'End date cannot be before the start date.',
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
            const fromTime = Math.floor(startOfDay(startDate).getTime() / 1000);
            const toTime = Math.floor(endOfDay(endDate).getTime() / 1000);
            
            const salesUrl = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/sales?startDate=${fromTime}&endDate=${toTime}`;
            const expensesUrl = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/expenses/expensesReport?fromTime=${fromTime}&toTime=${toTime}`;
            const headers = { 'Authorization': `Bearer ${token}` };

            const bankAccounts = Object.keys(balances).filter(key => key.toLowerCase().includes('bank'));
            
            const apiCalls = [
              fetch(salesUrl, { method: 'GET', headers }),
              fetch(expensesUrl, { method: 'GET', headers }),
            ];

            bankAccounts.forEach(bank => {
                const bankChargesUrl = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/cashflow?type=${bank}&startDate=${fromTime}&endDate=${toTime}`;
                apiCalls.push(fetch(bankChargesUrl, { method: 'GET', headers }));
            });

            const responses = await Promise.all(apiCalls);

            for (const response of responses) {
                if (!response.ok) {
                    if (response.status === 401) {
                        toast({
                            variant: "destructive",
                            title: "Session Expired",
                            description: "Please login again.",
                        });
                        sessionStorage.removeItem('accessToken');
                        router.push('/login');
                        return;
                    }
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch report data');
                }
            }

            const [salesResponse, expensesResponse, ...bankChargesResponses] = responses;
            
            const salesResult: { data: ApiSaleItem[] } = await salesResponse.json();
            const expensesResult: { data: ApiExpenseReportItem[] } = await expensesResponse.json();
            
            let totalBankCharges = 0;
            let totalBillPayments = 0;

            for (const res of bankChargesResponses) {
                const bankFlowResult: { transactions: ApiBankChargeItem[] } = await res.json();
                
                const charges = bankFlowResult.transactions
                    .filter(tx => tx.naration?.toUpperCase().includes('CHARGE'))
                    .reduce((sum, item) => sum + item.amount, 0);
                totalBankCharges += charges;

                const billPayments = bankFlowResult.transactions
                    .filter(tx => tx.naration?.toUpperCase().includes('BILL'))
                    .reduce((sum, item) => sum + item.amount, 0);
                totalBillPayments += billPayments;
            }

            const salesValue = salesResult.data.reduce((sum, item) => sum + item.totalSalesAmount, 0);
            const costOfSales = salesResult.data.reduce((sum, item) => sum + item.basePrice, 0);
            const kitchenIncome = salesResult.data.reduce((sum, item) => sum + (item.kitchenSales || 0), 0);
            
            const filteredExpenses = expensesResult.data.filter(
              item => !item.expenseDetail.toLowerCase().includes("taken amount")
            );

            const shopExpenses = filteredExpenses.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);


            setReportData({ salesValue, costOfSales, kitchenIncome, shopExpenses, bankCharges: totalBankCharges, billPayments: totalBillPayments });

            toast({
                title: 'Report Generated',
                description: 'P&L statement has been fetched.',
            });


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

    const formatNumber = (num: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);

    const SectionHeader = ({ children, value }: { children: React.ReactNode, value?: number }) => (
        <TableRow className="bg-blue-100">
            <TableCell colSpan={value ? 3: 4} className="font-extrabold text-blue-900 text-xl">{children}</TableCell>
            {value != null && <TableCell className="text-right font-extrabold text-blue-900 text-xl">{formatNumber(value)}</TableCell>}
        </TableRow>
    );
    
    const TotalRow = ({ label, value, isDebit = false, isCredit = false }: { label: string, value: number, isDebit?: boolean, isCredit?: boolean }) => (
         <TableRow className="bg-gray-200 font-extrabold text-xl">
            <TableCell colSpan={isDebit ? 2 : 3} className="text-right">{label}</TableCell>
            {isDebit && <TableCell className="text-right">{formatNumber(value)}</TableCell>}
            {isCredit && <TableCell className="text-right">{formatNumber(value)}</TableCell>}
            {!isDebit && !isCredit && <TableCell colSpan={1}></TableCell>}
        </TableRow>
    );

    const NetProfitRow = ({label, value}: {label: string, value: number}) => (
        <TableRow className="bg-blue-900 text-white font-extrabold text-2xl">
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
    const bankCharges = reportData?.bankCharges ?? 0;
    const billPayments = reportData?.billPayments ?? 0;
    const totalExpenses = shopExpenses + bankCharges + billPayments;
    const netProfit = totalIncome - totalExpenses;


    return (
        <Card id="report-card-pl" className="border-0 shadow-none">
            <CardHeader id="report-header-pl" className="text-center bg-blue-900 text-white rounded-t-lg py-4">
                 <div className="flex justify-between items-start">
                    <div className="flex-grow"></div>
                    <div className="text-center">
                        <CardTitle className="text-2xl font-bold">{shopName || 'THENDRAL CLUB THIRUMAYAM'}</CardTitle>
                        <CardDescription className="text-lg text-blue-200">
                           {isValid(parse(startDateString, 'yyyy-MM-dd', new Date())) ? `Statement for ${format(parse(startDateString, 'yyyy-MM-dd', new Date()), 'MMM yyyy')}`: 'P&L Statement'}
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
                <div id="pl-date-picker-container" className="p-4 bg-background text-foreground print-hidden flex items-center justify-center">
                     <div className="flex flex-wrap gap-4 items-end">
                        <div className="grid gap-2">
                          <Label htmlFor="start-date-pl">Start Date</Label>
                           <Input
                                id="start-date-pl"
                                type="text"
                                value={startDateString}
                                onChange={(e) => setStartDateString(e.target.value)}
                                className="w-[240px]"
                                placeholder="YYYY-MM-DD"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="end-date-pl">End Date</Label>
                            <Input
                                id="end-date-pl"
                                type="text"
                                value={endDateString}
                                onChange={(e) => setEndDateString(e.target.value)}
                                className="w-[240px]"
                                placeholder="YYYY-MM-DD"
                                disabled={isLoading}
                            />
                        </div>
                        <Button onClick={handleGetReport} disabled={isLoading || !startDateString || !endDateString}>
                          {isLoading ? 'Getting Report...' : 'Get Report'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent id="report-content-pl" className="p-0">
                 {(isLoading || isPropsLoading) ? (
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
                                <TableHead className="w-[5%] text-xl font-extrabold">S.No</TableHead>
                                <TableHead className="text-xl font-extrabold">Particulars</TableHead>
                                <TableHead className="text-right w-[20%] text-xl font-extrabold">Debit</TableHead>
                                <TableHead className="text-right w-[20%] text-xl font-extrabold">Credit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="text-xl font-bold">
                            <TableRow>
                                <TableCell rowSpan={2} className="font-extrabold align-top pt-6 text-2xl">LIQUOR</TableCell>
                                <TableCell>
                                    <span className="font-extrabold">A) Sales Value</span>
                                    <p className="text-base text-muted-foreground font-medium">(TOTAL SALES AMOUNT)</p>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">{formatNumber(salesValue)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>
                                <span className="font-extrabold">B) Cost of Sales</span>
                                    <p className="text-base text-muted-foreground font-medium">(PURCHASE VALUE)</p>
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
                             <TableRow>
                                <TableCell>3</TableCell>
                                <TableCell>Bill Payment</TableCell>
                                <TableCell className="text-right">{formatNumber(billPayments)}</TableCell>
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
        <Tabs defaultValue="cashflow" className="w-full">
            <TabsList className="grid w-full grid-cols-2 print-hidden">
                <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                <TabsTrigger value="plstatement">P&L Statement</TabsTrigger>
            </TabsList>
            <TabsContent value="cashflow">
                <CashFlowReport {...props} />
            </TabsContent>
            <TabsContent value="plstatement">
                <PLStatement shopName={props.shopName} isLoading={props.isLoading} balances={props.balances} />
            </TabsContent>
        </Tabs>
    </div>
  );
}

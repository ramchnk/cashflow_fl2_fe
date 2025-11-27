

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


interface Balances {
    [key: string]: number;
}

interface MonthEndReportProps {
    balances: Balances;
    investAmount: number;
    shopName: string | null;
    isLoading: boolean;
}

const Method1Report = ({ balances, investAmount, shopName, isLoading }: MonthEndReportProps) => {
    const handlePrint = () => {
    const printContent = document.getElementById('report-content-m1');
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
    const reportCard = document.getElementById('report-card-m1');
    if (reportCard) {
      const buttons = reportCard.querySelectorAll('button');
      buttons.forEach(btn => btn.style.visibility = 'hidden');

      html2canvas(reportCard, { 
        useCORS: true,
        scale: 2, 
        onclone: (document) => {
            const header = document.getElementById('report-header-m1');
            if (header) {
                header.classList.remove('print-hidden');
            }
        }
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `monthly-profit-report-m1-${format(new Date(), 'yyyy-MM-dd')}.png`;
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
         <Card id="report-card-m1" className="report-card border-0 shadow-none">
            <CardHeader id="report-header-m1">
                <div className="flex justify-between items-start">
                    <div className="flex-grow"></div>
                     <div className="text-center">
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
            <CardContent id="report-content-m1" className="pt-0 bg-background p-6">
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

const Method2Report = ({ shopName, isLoading }: Omit<MonthEndReportProps, 'balances' | 'investAmount'>) => {

    const handlePrint = () => {
        const printContent = document.getElementById('report-content-m2');
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const header = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="font-size: 1.5rem; font-weight: bold; color: #1E3A8A;">${shopName || 'THENDRAL CLUB THIRUMAYAM'}</h1>
                    <p style="font-size: 1.25rem;">Statement OCT-2025</p>
                </div>
            `;
            document.body.innerHTML = header + printContent.innerHTML;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        }
    }

    const handleCapture = () => {
        const reportCard = document.getElementById('report-card-m2');
        if (reportCard) {
            const buttons = reportCard.querySelectorAll('button');
            buttons.forEach(btn => btn.style.visibility = 'hidden');

            html2canvas(reportCard, { 
                useCORS: true,
                scale: 2
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `monthly-statement-m2-${format(new Date(), 'yyyy-MM-dd')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                buttons.forEach(btn => btn.style.visibility = 'visible');
            });
        }
    }

    const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);

    const SectionHeader = ({ children, value }: { children: React.ReactNode, value?: number }) => (
        <TableRow className="bg-blue-100">
            <TableCell colSpan={value ? 3: 4} className="font-bold text-blue-900">{children}</TableCell>
            {value && <TableCell className="text-right font-bold text-blue-900">{formatNumber(value)}</TableCell>}
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

    return (
        <Card id="report-card-m2" className="border-0 shadow-none">
            <CardHeader id="report-header-m2" className="text-center bg-blue-900 text-white rounded-t-lg py-4">
                 <div className="flex justify-between items-start">
                    <div className="flex-grow"></div>
                    <div className="text-center">
                        <CardTitle className="text-2xl font-bold">{shopName || 'THENDRAL CLUB THIRUMAYAM'}</CardTitle>
                        <CardDescription className="text-lg text-blue-200">Statement OCT-2025</CardDescription>
                    </div>
                    <div className="flex-grow flex justify-end gap-2">
                        <Button onClick={handleCapture} variant="outline" size="icon" className="print-hidden bg-transparent text-white hover:bg-white/20" disabled={isLoading}>
                            <Camera className="h-5 w-5"/>
                        </Button>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="print-hidden bg-transparent text-white hover:bg-white/20" disabled={isLoading}>
                            <Printer className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent id="report-content-m2" className="p-0">
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
                                <p className="text-xs text-muted-foreground">(30 DAYS SALES AMOUNT)</p>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">{formatNumber(11675210)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                               <span className="font-bold">B) Cost of Sales</span>
                                <p className="text-xs text-muted-foreground">(PURCHASE VALUE)</p>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(10497577)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        
                        <SectionHeader value={1177633}>GROSS PROFIT</SectionHeader>

                        <SectionHeader>C) OTHER INCOME</SectionHeader>
                        <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell>Kitchen Income</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">{formatNumber(224000)}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell>2</TableCell>
                            <TableCell>Empty Bottle Sales</TableCell>
                             <TableCell></TableCell>
                            <TableCell className="text-right">{formatNumber(16800)}</TableCell>
                        </TableRow>
                        <TotalRow label="TOTAL INCOME" value={1418433} isCredit />
                        
                        <SectionHeader>D) OTHER EXPENSES</SectionHeader>
                        <TableRow>
                            <TableCell>1</TableCell>
                            <TableCell>Shop Expenses</TableCell>
                            <TableCell className="text-right">{formatNumber(318250)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell>2</TableCell>
                            <TableCell>Stock or Profit Difference</TableCell>
                            <TableCell className="text-right">{formatNumber(234)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell>3</TableCell>
                            <TableCell>Shortage</TableCell>
                            <TableCell className="text-right">{formatNumber(119)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>4</TableCell>
                            <TableCell>Bank Charges</TableCell>
                            <TableCell className="text-right">{formatNumber(866)}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        <TotalRow label="TOTAL EXPENSES" value={322842} isDebit />

                    </TableBody>
                    <TableFooter>
                        <NetProfitRow label="NET PROFIT" value={1095591} />
                    </TableFooter>
                </Table>
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
                #report-header-m1, #report-header-m2 { display: block !important; }
            }
            `}
        </style>
        <Tabs defaultValue="method1">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="method1">Method 1</TabsTrigger>
                <TabsTrigger value="method2">Method 2</TabsTrigger>
            </TabsList>
            <TabsContent value="method1">
                <Method1Report {...props} />
            </TabsContent>
            <TabsContent value="method2">
                <Method2Report shopName={props.shopName} isLoading={props.isLoading} />
            </TabsContent>
        </Tabs>
    </div>
  );
}

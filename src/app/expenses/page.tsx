
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Eye } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Header from '@/components/layout/header';

interface ApiResponseExpense {
  expenseDetail: string;
  totalAmount: string;
  shopNumber: string;
}

interface Expense {
  _id: string;
  name: string;
  amount: number;
  shopNumber: string;
  originalNames: string[];
}

interface DetailedItem {
  saleDate: number;
  expenseList: {
    amount: number;
    narration: string;
    details: string;
  };
}

export default function ExpensesPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [detailedItems, setDetailedItems] = useState<DetailedItem[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [fromDatePickerOpen, setFromDatePickerOpen] = useState(false);
  const [toDatePickerOpen, setToDatePickerOpen] = useState(false);

  const { toast } = useToast();
  const router = useRouter();


  const handleGetExpenses = async () => {
    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Please select a date range.',
      });
      return;
    }
    
    setIsLoading(true);
    setExpenses([]); // Clear previous expenses
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
      const fromTime = Math.floor(startOfDay(fromDate).getTime() / 1000);
      const toTime = Math.floor(endOfDay(toDate).getTime() / 1000);
      const url = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/expenses/expensesReport?fromTime=${fromTime}&toTime=${toTime}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        const apiExpenses: ApiResponseExpense[] = responseData.data || [];
        
        const filteredApiExpenses = apiExpenses.filter(
          item => !item.expenseDetail.toLowerCase().includes("taken amount")
        );
        
        // Grouping logic
        const groupedExpenses = filteredApiExpenses.reduce((acc, item) => {
            const expenseName = item.expenseDetail;
            // Split by space or hyphen to get the first word as the group key
            const groupKey = expenseName.split(/[\s-]/)[0].toUpperCase();
            
            if (!acc[groupKey]) {
                acc[groupKey] = {
                    _id: groupKey,
                    name: groupKey,
                    amount: 0,
                    shopNumber: item.shopNumber,
                    originalNames: []
                };
            }
            acc[groupKey].amount += parseFloat(item.totalAmount);
            acc[groupKey].originalNames.push(expenseName);

            return acc;
        }, {} as Record<string, Expense>);

        const formattedExpenses: Expense[] = Object.values(groupedExpenses);

        setExpenses(formattedExpenses);
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
            throw new Error(errorData.message || 'Failed to fetch expenses');
        }
      }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'An Error Occurred',
            description: error.message || 'Could not fetch expenses.',
        });
        setExpenses([]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleViewDetails = async (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDetailLoading(true);
    setDetailedItems([]);

    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Date range not selected',
        description: 'Please select a date range to view details.',
      });
      setIsDetailLoading(false);
      return;
    }

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        return;
    }
    
    try {
        const fromTime = Math.floor(startOfDay(fromDate).getTime() / 1000);
        const toTime = Math.floor(endOfDay(toDate).getTime() / 1000);
        
        // Joining original names to send to the API
        const expenseItemsQuery = expense.originalNames.map(name => `expenseItem=${encodeURIComponent(name)}`).join('&');
        const url = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/expenses/expensesReport/item?fromTime=${fromTime}&toTime=${toTime}&${expenseItemsQuery}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            setDetailedItems(data.data || []);
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
                throw new Error(errorData.message || 'Failed to fetch expense details');
            }
        }

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'An Error Occurred',
            description: error.message || 'Could not fetch expense details.',
        });
        setDetailedItems([]);
    } finally {
        setIsDetailLoading(false);
    }
  }
  
  const filteredExpenses = expenses.filter(expense =>
    expense.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(totalAmount);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (filteredExpenses.length === 0) return;
    const header = "Expense Detail\tTotal Amount";
    const rows = filteredExpenses.map(e => `${e.name}\t${e.amount.toFixed(2)}`);
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
        toast({ title: "Copied to clipboard!" });
    }, () => {
        toast({ variant: 'destructive', title: "Failed to copy." });
    });
  };

  const handleCSV = () => {
      if (filteredExpenses.length === 0) return;
      const header = "Expense Detail,Total Amount";
      const rows = filteredExpenses.map(e => `"${e.name.replace(/"/g, '""')}",${e.amount}`);
      let csvContent = "data:text/csv;charset=utf-8," + header + "\n" + rows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end print-hidden">
                <div className="grid gap-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Popover open={fromDatePickerOpen} onOpenChange={setFromDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="from-date"
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "yyyy-MM-dd") : <span>Select Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(date) => {
                          setFromDate(date);
                          setFromDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                   <Label htmlFor="to-date">To Date</Label>
                  <Popover open={toDatePickerOpen} onOpenChange={setToDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="to-date"
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "yyyy-MM-dd") : <span>Select Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(date) => {
                          setToDate(date);
                          setToDatePickerOpen(false);
                        }}
                        disabled={{ before: fromDate }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleGetExpenses} disabled={isLoading || !fromDate || !toDate}>
                  {isLoading ? 'Getting Expenses...' : 'Get Expenses'}
                </Button>
            </div>
            
            <Card>
                <CardHeader className="print-hidden">
                    <div className="flex flex-wrap gap-4 justify-between items-center">
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCopy} disabled={filteredExpenses.length === 0}>Copy</Button>
                            <Button variant="outline" onClick={handleCSV} disabled={filteredExpenses.length === 0}>CSV</Button>
                            <Button variant="outline" onClick={handlePrint} disabled={filteredExpenses.length === 0}>Print</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="search">Search:</Label>
                            <Input 
                                id="search"
                                className="w-auto"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">#</TableHead>
                        <TableHead>Expense Detail</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Loading...
                            </TableCell>
                        </TableRow>
                      ) : filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense, index) => (
                          <TableRow key={expense._id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{expense.name}</TableCell>
                            <TableCell className="text-right">
                               {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleViewDetails(expense)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                No expenses found.
                            </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {filteredExpenses.length > 0 && (
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="text-right text-lg font-bold">Total:</TableCell>
                                <TableCell className="text-right text-lg font-bold">{formattedTotal}</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                  </Table>
                </CardContent>
            </Card>
        </div>
         {selectedExpense && (
          <AlertDialog open={!!selectedExpense} onOpenChange={(isOpen) => !isOpen && setSelectedExpense(null)}>
            <AlertDialogContent className="max-w-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>{selectedExpense.name}</AlertDialogTitle>
                <AlertDialogDescription>
                    Detailed breakdown for this expense.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="max-h-96 overflow-y-auto">
                  {isDetailLoading ? (
                      <div className="flex justify-center items-center h-40">
                          <p>Loading details...</p>
                      </div>
                  ) : detailedItems.length > 0 ? (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Narration</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {detailedItems.map((item, index) => {
                                const date = new Date(item.saleDate * 1000);
                                const itemAmount = item.expenseList?.amount || 0;
                                return (
                                  <TableRow key={index}>
                                      <TableCell>{!isNaN(date.getTime()) ? format(date, 'yyyy-MM-dd') : 'Invalid Date'}</TableCell>
                                      <TableCell>{item.expenseList?.narration}</TableCell>
                                      <TableCell className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(isNaN(itemAmount) ? 0 : itemAmount)}</TableCell>
                                  </TableRow>
                                )
                              })}
                          </TableBody>
                      </Table>
                  ) : (
                    <div className="flex justify-center items-center h-40">
                        <p>No detailed items found.</p>
                    </div>
                  )}
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setSelectedExpense(null)}>Close</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        )}
      </main>
    </div>
  );
}

    
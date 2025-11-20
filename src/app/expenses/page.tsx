'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle } from 'lucide-react';
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

interface Expense {
  _id: string;
  name: string;
  amount: number;
}

export default function ExpensesPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        const data = await response.json();
        setExpenses(data.expenses || []);
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

  const totalAmount = expenses.reduce((acc, expense) => acc + expense.amount, 0);
  
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(totalAmount);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Expenses List</CardTitle>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
                <div className="grid gap-2 w-full sm:w-auto">
                  <Label htmlFor="from-date">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="from-date"
                        variant={"outline"}
                        className={cn(
                          "w-full sm:w-[240px] justify-start text-left font-normal",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "PPP") : <span>Select Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2 w-full sm:w-auto">
                   <Label htmlFor="to-date">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="to-date"
                        variant={"outline"}
                        className={cn(
                          "w-full sm:w-[240px] justify-start text-left font-normal",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "PPP") : <span>Select Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Expense Detail</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            Loading...
                        </TableCell>
                    </TableRow>
                  ) : expenses.length > 0 ? (
                    expenses.map((expense, index) => (
                      <TableRow key={expense._id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{expense.name}</TableCell>
                        <TableCell className="text-right">
                           {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            No expenses found.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {expenses.length > 0 && (
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right text-lg font-bold">Total:</TableCell>
                            <TableCell className="text-right text-lg font-bold">{formattedTotal}</TableCell>
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

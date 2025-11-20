'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
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

interface Expense {
  id: number;
  detail: string;
  amount: number;
}

export default function ExpensesPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetExpenses = () => {
    // This is where you would fetch data from an API
    // For now, it just shows an empty state.
    setIsLoading(true);
    console.log('Fetching expenses from', fromDate, 'to', toDate);
    // Simulating API call
    setTimeout(() => {
      setExpenses([]); 
      setIsLoading(false);
    }, 1000);
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
                <Button onClick={handleGetExpenses} disabled={isLoading}>
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
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{expense.detail}</TableCell>
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
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2} className="text-right text-lg font-bold">Total:</TableCell>
                        <TableCell className="text-right text-lg font-bold">{formattedTotal}</TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

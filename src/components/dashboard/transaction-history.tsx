"use client";

import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ArrowRight, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import type { Transaction } from '@/app/lib/types';
import { parties } from '@/app/lib/parties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface TransactionHistoryProps {
    transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [type, setType] = useState<string>('all');

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

    const formatDate = (date: Date) => new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);

    const transactionTypes = useMemo(() => {
        const types = new Set<string>();
        transactions.forEach(tx => {
            if (tx.to === 'expenses') {
                types.add('deduction');
            } else {
                types.add(`${tx.from}-${tx.to}`);
            }
        });
        return Array.from(types);
    }, [transactions]);


    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const isDateInRange = !dateRange || (
                (!dateRange.from || tx.date >= dateRange.from) &&
                (!dateRange.to || tx.date <= dateRange.to)
            );

            const isTypeMatch = type === 'all' || (type === 'deduction' && tx.to === 'expenses') || type === `${tx.from}-${tx.to}`;

            return isDateInRange && isTypeMatch;
        });
    }, [transactions, dateRange, type]);
    
    const clearFilters = () => {
        setDateRange(undefined);
        setType('all');
    }

    const hasActiveFilters = dateRange !== undefined || type !== 'all';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>A log of all your recent transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Date range</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full sm:w-[300px] justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
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
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid gap-2">
                         <label className="text-sm font-medium">Type</label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="w-full sm:w-[220px]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {transactionTypes.map(txType => {
                                    if (txType === 'deduction') {
                                        return <SelectItem key={txType} value="deduction">Deduction</SelectItem>
                                    }
                                    const [from, to] = txType.split('-');
                                    return (
                                        <SelectItem key={txType} value={txType}>
                                            {parties[from as keyof typeof parties].name} to {parties[to as keyof typeof parties].name}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    {hasActiveFilters && (
                        <div className="flex items-end">
                             <Button variant="ghost" onClick={clearFilters} className="sm:ml-auto">
                                <FilterX className="mr-2 h-4 w-4"/> Clear Filters
                             </Button>
                        </div>
                    )}
                </div>
                <Separator className="my-4"/>
                <ScrollArea className="h-96">
                    {filteredTransactions.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No transactions match your filters.
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {filteredTransactions.map(tx => {
                                const FromIcon = parties[tx.from].icon;
                                const ToIcon = parties[tx.to].icon;

                                return (
                                    <li key={tx.id} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center space-x-2">
                                           <div className="p-2 bg-secondary rounded-full"><FromIcon className="w-5 h-5 text-secondary-foreground" /></div>
                                           <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                           <div className="p-2 bg-secondary rounded-full"><ToIcon className="w-5 h-5 text-secondary-foreground" /></div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-semibold">
                                                {tx.to === 'expenses' ? tx.description : `${parties[tx.from].name} to ${parties[tx.to].name}`}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{formatDate(tx.date)}</div>
                                        </div>
                                        <div className={`font-bold text-lg ${tx.to === 'expenses' ? 'text-destructive' : 'text-foreground'}`}>
                                            {tx.to === 'expenses' ? '-' : ''}{formatCurrency(tx.amount)}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

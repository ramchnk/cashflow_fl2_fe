
"use client";

import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ArrowRight, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import type { Transaction } from '@/app/lib/types';
import { getPartyDetails, type Party } from '@/app/lib/parties';
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
    allParties: Party[];
}

export default function TransactionHistory({ transactions, allParties }: TransactionHistoryProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [partyFilter, setPartyFilter] = useState<string>('all');

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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const isDateInRange = !dateRange || (
                (!dateRange.from || tx.date >= dateRange.from) &&
                (!dateRange.to || tx.date <= dateRange.to)
            );

            const isPartyMatch = partyFilter === 'all' || tx.from === partyFilter || tx.to === partyFilter;

            return isDateInRange && isPartyMatch;
        });
    }, [transactions, dateRange, partyFilter]);
    
    const clearFilters = () => {
        setDateRange(undefined);
        setPartyFilter('all');
    }

    const hasActiveFilters = dateRange !== undefined || partyFilter !== 'all';

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
                         <label className="text-sm font-medium">Account</label>
                        <Select value={partyFilter} onValueChange={setPartyFilter}>
                            <SelectTrigger className="w-full sm:w-[220px]">
                                <SelectValue placeholder="Filter by account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {allParties.filter(p => p !== 'expenses').map(party => (
                                    <SelectItem key={party} value={party}>
                                        {getPartyDetails(party).name}
                                    </SelectItem>
                                ))}
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
                                const fromDetails = getPartyDetails(tx.from);
                                const toDetails = getPartyDetails(tx.to);
                                const FromIcon = fromDetails.icon;
                                const ToIcon = toDetails.icon;

                                const title = tx.to === 'expenses' 
                                    ? fromDetails.name
                                    : `${fromDetails.name} to ${toDetails.name}`;
                                
                                const description = tx.to === 'expenses'
                                    ? tx.description
                                    : tx.description;


                                return (
                                    <li key={tx.id} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center space-x-2">
                                           <div className="p-2 bg-secondary rounded-full"><FromIcon className="w-5 h-5 text-secondary-foreground" /></div>
                                           <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                           <div className="p-2 bg-secondary rounded-full"><ToIcon className="w-5 h-5 text-secondary-foreground" /></div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="font-semibold">
                                                {title}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {description ? (
                                                    <p className="text-sm text-muted-foreground">{description}</p>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">{formatDate(tx.date)}</p>
                                                )}
                                            </div>
                                             {description && <div className="text-xs text-muted-foreground pt-1">{formatDate(tx.date)}</div>}
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

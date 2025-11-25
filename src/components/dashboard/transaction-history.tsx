
"use client";

import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, FilterX, Printer } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import LedgerView from './ledger-view';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface TransactionHistoryProps {
    transactions: Transaction[];
    allParties: Party[];
    dateRange: DateRange | undefined;
    partyFilter: string;
    onFiltersChange: (partyFilter: string, dateRange?: DateRange) => void;
    isLoading: boolean;
    onGetReport: () => void;
}

const SimpleListView = ({ transactions }: { transactions: Transaction[] }) => {
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

    return (
        <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map(tx => {
                    const isDeduction = tx.to === 'expenses';
                    return (
                        <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground w-28">{formatDate(tx.date)}</TableCell>
                            <TableCell>
                                 <div className="font-medium">{isDeduction ? `Expense from ${getPartyDetails(tx.from).name}` : `${getPartyDetails(tx.from).name} → ${getPartyDetails(tx.to).name}`}</div>
                                 {tx.description && <div className="text-xs text-muted-foreground">{tx.description}</div>}
                            </TableCell>
                            <TableCell className={`font-bold text-right ${isDeduction ? 'text-destructive' : 'text-foreground'}`}>
                                {formatCurrency(tx.amount)}
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

export default function TransactionHistory({ transactions, allParties, dateRange, partyFilter, onFiltersChange, isLoading, onGetReport }: TransactionHistoryProps) {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const clearFilters = () => {
        onFiltersChange('all', undefined);
    }
    
    const handleDateChange = (newDateRange?: DateRange) => {
        onFiltersChange(partyFilter, newDateRange);
        // Close the popover once a range is selected
        if (newDateRange?.from && newDateRange?.to) {
            setIsDatePickerOpen(false);
        }
    }

    const handlePartyChange = (newPartyFilter: string) => {
        onFiltersChange(newPartyFilter, dateRange);
    }

    const handleGetReport = () => {
        setInitialLoad(false);
        onGetReport();
    }
    
    const handlePrint = () => {
        window.print();
    }

    const hasActiveFilters = dateRange !== undefined || partyFilter !== 'all';
    
    const showLedgerView = partyFilter !== 'all';
    
    const isReportButtonDisabled = isLoading || !dateRange?.from || !dateRange?.to;


    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="transaction-history" className="border-none" id="transaction-history-card">
                <AccordionTrigger>
                    <div className="flex flex-col items-start">
                        <CardTitle>Transaction History</CardTitle>
                        <CardDescription className="text-left">A log of all your recent transactions.</CardDescription>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end print-hidden">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Date range</label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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
                                        onSelect={handleDateChange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Account</label>
                            <Select value={partyFilter} onValueChange={handlePartyChange}>
                                <SelectTrigger className="w-full sm:w-[220px]">
                                    <SelectValue placeholder="Filter by account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Accounts</SelectItem>
                                    {allParties.filter(p => p !== 'expenses' && p !== 'stock').map(party => (
                                        <SelectItem key={party} value={party}>
                                            {getPartyDetails(party).name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleGetReport} disabled={isReportButtonDisabled}>
                            Get Report
                        </Button>
                        <Button onClick={handlePrint} variant="outline" disabled={isLoading || transactions.length === 0}>
                            <Printer className="mr-2 h-4 w-4"/> Print
                        </Button>
                        {hasActiveFilters && (
                            <div className="flex items-end">
                                <Button variant="ghost" onClick={clearFilters} className="sm:ml-auto">
                                    <FilterX className="mr-2 h-4 w-4"/> Clear
                                </Button>
                            </div>
                        )}
                    </div>
                    <Separator className="my-4 print-hidden"/>
                    <ScrollArea className="h-[70vh] print:h-auto print:overflow-visible">
                        {isLoading ? (
                            <div className="space-y-4 p-2">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4">
                                        <Skeleton className="h-6 w-24" />
                                        <div className="flex-grow space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                        </div>
                                        <Skeleton className="h-6 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : initialLoad ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select filters and click "Get Report" to view transactions.
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                            No transactions found for the selected filters.
                            </div>
                        ) : showLedgerView ? (
                            <LedgerView transactions={transactions} accountFilter={partyFilter} />
                        ) : (
                        <SimpleListView transactions={transactions} />
                        )}
                    </ScrollArea>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}

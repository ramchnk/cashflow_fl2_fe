"use client";

import type { Transaction } from '@/app/lib/types';
import { parties } from '@/app/lib/parties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight } from 'lucide-react';

interface TransactionHistoryProps {
    transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

    const formatDate = (date: Date) => new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>A log of all your recent transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    {transactions.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No transactions yet.
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {transactions.map(tx => {
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

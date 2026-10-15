
'use client';

import type { Transaction } from '@/app/lib/types';
import { getPartyDetails } from '@/app/lib/parties';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export default function SimpleListView({ transactions }: { transactions: Transaction[] }) {
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
                    const isAddition = tx.from.toLowerCase() === 'addition';

                    let particularsText = `${getPartyDetails(tx.from).name} → ${getPartyDetails(tx.to).name}`;
                    if (isDeduction) {
                        particularsText = `Expense from ${getPartyDetails(tx.from).name}`;
                    } else if (isAddition) {
                        particularsText = `Direct Deposit to ${getPartyDetails(tx.to).name}`;
                    }

                    return (
                        <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground w-28">{formatDate(tx.date)}</TableCell>
                            <TableCell>
                                 <div className="font-medium">{particularsText}</div>
                                 {tx.description && <div className="text-xs text-muted-foreground">{tx.description}</div>}
                            </TableCell>
                            <TableCell className={`font-bold text-right ${isDeduction ? 'text-destructive' : isAddition ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                {isDeduction ? '-' : isAddition ? '+' : ''}{formatCurrency(tx.amount)}
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

import type { Transaction } from '@/app/lib/types';
import { getPartyDetails } from '@/app/lib/parties';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface LedgerViewProps {
  transactions: Transaction[];
  accountFilter: string;
}

const formatCurrency = (amount: number | null) => {
    if (amount === null || isNaN(amount)) return '-';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
        return '-';
    }
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
};

export default function LedgerView({ transactions, accountFilter }: LedgerViewProps) {
  if (accountFilter === 'all') return null;
  
  return (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {transactions.map(tx => {
                let openingBalance, credit, debit, closingBalance, particulars;

                if (tx.from === accountFilter) {
                    // It's a debit from the selected account
                    openingBalance = tx.fromAccountOpeningBalance;
                    credit = null;
                    debit = tx.amount;
                    closingBalance = openingBalance - debit;
                    particulars = `To: ${getPartyDetails(tx.to).name}`;
                    if(tx.description) particulars += ` (${tx.description})`;
                    
                } else if (tx.to === accountFilter) {
                    // It's a credit to the selected account
                    openingBalance = tx.toAccountOpeningBalance;
                    credit = tx.amount;
                    debit = null;
                    closingBalance = openingBalance + credit;
                    particulars = `From: ${getPartyDetails(tx.from).name}`;
                     if(tx.description) particulars += ` (${tx.description})`;
                } else {
                    return null; // Should not happen if API filtering is correct
                }

                return (
                    <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
                        <TableCell>
                            <div className="font-medium">{particulars}</div>
                            {tx.description && tx.from !== accountFilter && (
                               <div className="text-sm text-muted-foreground">{tx.description}</div>
                            )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(openingBalance)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(credit)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(debit)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(closingBalance)}</TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
    </Table>
  );
}

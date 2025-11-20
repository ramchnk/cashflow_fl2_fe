
import type { Transaction } from '@/app/lib/types';
import { getPartyDetails } from '@/app/lib/parties';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
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

  let openingBalance: number | null = null;
  if (transactions.length > 0) {
      const firstTx = transactions[transactions.length - 1]; // API returns in descending order, so the last item is the oldest in the filtered set
      if (firstTx.to.toLowerCase() === accountFilter.toLowerCase()) {
        openingBalance = firstTx.toAccountOpeningBalance;
      } else if (firstTx.from.toLowerCase() === accountFilter.toLowerCase()) {
        openingBalance = firstTx.fromAccountOpeningBalance;
      }
  }


  const { totalCredit, totalDebit } = transactions.reduce((acc, tx) => {
    if (tx.to.toLowerCase() === accountFilter.toLowerCase()) {
      acc.totalCredit += tx.amount;
    } else if (tx.from.toLowerCase() === accountFilter.toLowerCase()) {
      acc.totalDebit += tx.amount;
    }
    
    // This logic handles cases where ReadyToCollect is debited but the toAccount is changed to `collected`
    if (accountFilter.toLowerCase() === 'readytocollect' && tx.from.toLowerCase() === 'readytocollect') {
        // This transaction is a debit from ReadyToCollect, but it might not be caught above if toAccount is not ReadyToCollect.
        const isAlreadyCounted = tx.to.toLowerCase() === accountFilter.toLowerCase();
        if (!isAlreadyCounted) {
             acc.totalDebit += tx.amount;
        }
    }

    return acc;
  }, { totalCredit: 0, totalDebit: 0 });

  const finalBalance = openingBalance !== null ? openingBalance + totalCredit - totalDebit : null;

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
                let currentOpeningBalance, credit, debit, closingBalance, particulars;

                if (tx.from.toLowerCase() === accountFilter.toLowerCase()) {
                    // It's a debit from the selected account
                    currentOpeningBalance = tx.fromAccountOpeningBalance;
                    credit = null;
                    debit = tx.amount;
                    closingBalance = currentOpeningBalance - debit;
                    particulars = `To: ${getPartyDetails(tx.to).name}`;
                    if(tx.description) particulars += ` (${tx.description})`;
                    
                } else if (tx.to.toLowerCase() === accountFilter.toLowerCase()) {
                    // It's a credit to the selected account
                    currentOpeningBalance = tx.toAccountOpeningBalance;
                    credit = tx.amount;
                    debit = null;
                    closingBalance = currentOpeningBalance + credit;
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
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(currentOpeningBalance)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(credit)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(debit)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(closingBalance)}</TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
        <TableFooter>
          {accountFilter.toLowerCase() === 'readytocollect' ? (
              <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                  <TableCell className="text-right font-bold text-lg text-green-600">{formatCurrency(totalCredit)}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-red-600">{formatCurrency(totalDebit)}</TableCell>
                  <TableCell></TableCell>
              </TableRow>
          ) : (
              <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                  <TableCell className="text-right font-bold text-lg text-green-600">{formatCurrency(totalCredit)}</TableCell>
                  <TableCell className="text-right font-bold text-lg text-red-600">{formatCurrency(totalDebit)}</TableCell>
                  <TableCell></TableCell>
              </TableRow>
          )}
        </TableFooter>
    </Table>
  );
}

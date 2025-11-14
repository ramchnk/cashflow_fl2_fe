import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartyDetails } from '@/app/page';

interface BalanceCardProps {
  party: PartyDetails;
  balance: number;
}

export default function BalanceCard({ party, balance }: BalanceCardProps) {
  const { name, icon: Icon } = party;

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(balance);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 ease-in-out">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {formattedBalance}
        </div>
      </CardContent>
    </Card>
  );
}

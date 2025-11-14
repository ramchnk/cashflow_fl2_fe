import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartyDetails } from '@/app/lib/parties';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  party: PartyDetails;
  balance: number;
}

export default function BalanceCard({ party, balance }: BalanceCardProps) {
  const { name, icon: Icon } = party;

  const isTotalCard = name === 'Total';

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(balance);

  return (
    <Card className={cn(
      "hover:shadow-lg transition-shadow duration-300 ease-in-out",
      isTotalCard && "bg-accent text-accent-foreground"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium",
          isTotalCard ? "text-accent-foreground/80" : "text-muted-foreground"
        )}>{name}</CardTitle>
        <Icon className={cn(
            "h-5 w-5",
            isTotalCard ? "text-accent-foreground/80" : "text-muted-foreground"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          <div className={cn("text-2xl font-bold", isTotalCard ? "text-accent-foreground" : "text-foreground")}>
            {formattedBalance}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const isProfitCard = name === 'Profit';
  const isLoss = isProfitCard && balance < 0;
  const isReadyToCollectCard = name === 'Ready to Collect';

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(balance);

  return (
    <Card className={cn(
      "hover:shadow-lg transition-shadow duration-300 ease-in-out",
      isTotalCard && "bg-primary text-primary-foreground",
      isProfitCard && !isLoss && "bg-green-600 text-white",
      isLoss && "bg-destructive text-destructive-foreground",
      isReadyToCollectCard && "bg-yellow-400 text-yellow-900"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium",
          (isTotalCard || (isProfitCard && !isLoss)) ? "text-white/80" : "text-muted-foreground",
          isLoss && "text-destructive-foreground/80",
          isReadyToCollectCard && "text-yellow-900/80"
        )}>{name}</CardTitle>
        <Icon className={cn(
            "h-5 w-5",
            (isTotalCard || (isProfitCard && !isLoss)) ? "text-white/80" : "text-muted-foreground",
            isLoss && "text-destructive-foreground/80",
            isReadyToCollectCard && "text-yellow-900/80"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <div className={cn("text-2xl font-bold", 
            (isTotalCard || isProfitCard) ? "text-white" : "text-foreground",
            isLoss && "text-destructive-foreground",
            isReadyToCollectCard && "text-yellow-900"
          )}>
            {formattedBalance}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const isReadyToCollectCard = name === 'Ready to Collect';
  const isLoss = isProfitCard && balance < 0;

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
      isReadyToCollectCard && "bg-yellow-400 text-yellow-900",
      isLoss && "bg-destructive text-destructive-foreground"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn(
          "text-sm font-medium",
          (isTotalCard || (isProfitCard && !isLoss) || isReadyToCollectCard) ? "text-white/80" : "text-muted-foreground",
          isReadyToCollectCard && "text-yellow-900/80",
          isLoss && "text-destructive-foreground/80"
        )}>{name}</CardTitle>
        <Icon className={cn(
            "h-5 w-5",
            (isTotalCard || (isProfitCard && !isLoss) || isReadyToCollectCard) ? "text-white/80" : "text-muted-foreground",
            isReadyToCollectCard && "text-yellow-900/80",
            isLoss && "text-destructive-foreground/80"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <div className={cn("text-2xl font-bold", 
            (isTotalCard || isProfitCard || isReadyToCollectCard) ? "text-white" : "text-foreground",
            isReadyToCollectCard && "text-yellow-900",
            isLoss && "text-destructive-foreground"
          )}>
            {formattedBalance}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

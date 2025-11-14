import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
                <Wallet className="w-6 h-6" />
            </div>
            <h1 className={cn("text-2xl font-bold text-foreground font-headline tracking-tight")}>
              LedgerLink
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}

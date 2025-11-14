'use client';

import { Wallet, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"

export default function Header() {
    const router = useRouter();

    const handleLogout = () => {
        // TODO: Call your actual logout API endpoint
        router.push('/login');
    };

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
          <div>
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span className="sr-only">Logout</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Logout</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </header>
  );
}

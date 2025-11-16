
'use client';

import { Wallet, LogOut, Store } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { useUserStore } from '@/app/lib/user-store';


export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const { shopNumber } = useUserStore();


    const handleLogout = () => {
        sessionStorage.removeItem('accessToken');
        router.push('/login');
    };

    const navLinks = [
        { href: '/', label: 'Dashboard' },
        { href: '/purchase', label: 'Purchase' },
    ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10 print-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
                  <Wallet className="w-6 h-6" />
              </div>
              <h1 className={cn("text-2xl font-bold text-foreground font-headline tracking-tight")}>
                LedgerLink
              </h1>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === link.href ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {shopNumber && (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Store className="w-5 h-5 text-muted-foreground" />
                    <span>Shop No: {shopNumber}</span>
                </div>
            )}
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

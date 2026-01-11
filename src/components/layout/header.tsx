'use client';

import { Wallet, LogOut, Store, Home, Package, Receipt, Calculator, BarChart3, BookCopy } from 'lucide-react';
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
    const { shopName } = useUserStore();


    const handleLogout = () => {
        sessionStorage.removeItem('accessToken');
        router.push('/login');
    };

    const navLinks = [
        { href: "/", label: "Dashboard", icon: Home },
        { href: "/purchase", label: "Purchase", icon: Package },
        { href: "/expenses", label: "Expenses", icon: Receipt },
        { href: "/sales", label: "Sales", icon: BarChart3 },
        { href: "/purchase-estimate", label: "Purchase Estimate", icon: Calculator },
        { href: "/month-end-report", label: "Reports", icon: BookCopy },
    ]

  return (
    <header className="bg-card sticky top-0 z-10 print-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
                <Wallet className="w-6 h-6" />
            </div>
            <h1 className={cn("text-2xl font-bold text-foreground font-headline tracking-tight")}>
              LedgerLink
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {shopName && (
                <div className="hidden md:flex items-center gap-2 text-sm font-bold text-foreground">
                    <Store className="w-5 h-5 text-muted-foreground" />
                    <span>Shop: {shopName}</span>
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
        <div className="flex items-center justify-center h-14 border-b overflow-x-auto">
             <nav className="flex items-center gap-2">
                 {navLinks.map((link) => (
                    <Button key={link.href} variant={pathname === link.href ? 'secondary' : 'ghost'} asChild>
                        <Link href={link.href}>
                            <link.icon className="mr-2 h-4 w-4" />
                            {link.label}
                        </Link>
                    </Button>
                ))}
            </nav>
        </div>
      </div>
    </header>
  );
}

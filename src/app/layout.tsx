import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { SidebarProvider } from '@/components/ui/sidebar';
import AppShell from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'LedgerLink',
  description: 'Ledger Transaction Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("h-full font-body antialiased")}>
        <SidebarProvider>
            <AppShell>
              {children}
            </AppShell>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}

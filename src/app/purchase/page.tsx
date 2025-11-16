'use client';

import Header from '@/components/layout/header';

export default function PurchasePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-foreground">
              Purchase
            </h2>
            <p className="text-muted-foreground">
              This is the purchase page. You can add purchase management functionality here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

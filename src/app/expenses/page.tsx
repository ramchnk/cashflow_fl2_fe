
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExpensesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Expenses Breakdown</CardTitle>
              <CardDescription>
                A detailed view of all expenses will be displayed here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Expense data coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

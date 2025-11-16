'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PurchaseItem {
  srNo: string;
  brandName: string;
  packSize: string;
  qty: string;
  totalValue: string;
}

export default function PurchasePage() {
  const [pastedData, setPastedData] = useState('');
  const [parsedItems, setParsedItems] = useState<PurchaseItem[]>([]);

  const processData = () => {
    if (!pastedData) {
        setParsedItems([]);
        return;
    };

    const lines = pastedData.trim().split('\n');
    const items: PurchaseItem[] = [];

    // Skip header line if present
    const startIndex = lines[0].toLowerCase().includes('brand name') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const columns = lines[i].split('\t'); // Assuming tab-separated values

        if (columns.length >= 7) { // We need at least 7 columns to get Total Value
            const srNo = columns[0];
            const brandName = columns[1];
            const packSize = columns[2];
            const qty = columns[4]; 
            const totalValue = columns[6];

            if (srNo && brandName && packSize && qty && totalValue) {
                items.push({
                    srNo,
                    brandName,
                    packSize,
                    qty,
                    totalValue
                });
            }
        }
    }
    setParsedItems(items);
  };

  const grandTotal = parsedItems.reduce((acc, item) => {
    // Sanitize totalValue by removing commas before parsing
    const value = parseFloat(item.totalValue.replace(/,/g, ''));
    return acc + (isNaN(value) ? 0 : value);
  }, 0);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
                <CardTitle>Process Purchase Data</CardTitle>
                <CardDescription>
                    மூன்றாம் தரப்பு போர்ட்டலில் இருந்து தரவை நகலெடுத்து கீழே உள்ள டெக்ஸ்ட் ஏரியாவில் ஒட்டவும். பிறகு, வடிவமைக்கப்பட்ட அட்டவணையைக் காண, பிராசஸ் என்பதைக் கிளிக் செய்யவும்.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Textarea
                    placeholder="Paste your copied data here..."
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                />
                <Button onClick={processData}>Process Data</Button>
            </CardContent>
          </Card>

          {parsedItems.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Purchase Order Preview</CardTitle>
                    <CardDescription>
                        Review the parsed items below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sr.No</TableHead>
                                    <TableHead>Brand Name</TableHead>
                                    <TableHead>Pack Size</TableHead>
                                    <TableHead className="text-right">Qty (Cases.Bottle)</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.srNo}</TableCell>
                                    <TableCell>{item.brandName}</TableCell>
                                    <TableCell>{item.packSize}</TableCell>
                                    <TableCell className="text-right">{item.qty}</TableCell>
                                    <TableCell className="text-right">{item.totalValue}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="justify-end font-bold text-lg">
                    Grand Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(grandTotal)}
                </CardFooter>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

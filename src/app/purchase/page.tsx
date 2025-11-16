
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import { Textarea } from '@/components/ui/textarea';
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
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

interface PurchaseItem {
  srNo: string;
  brandName: string;
  packSize: string;
  qty: string;
  calculatedQty: number;
  totalValue: string;
  matchStatus: 'found' | 'not found';
  apiSku?: string;
}

export default function PurchasePage() {
  const [pastedData, setPastedData] = useState('');
  const [parsedItems, setParsedItems] = useState<PurchaseItem[]>([]);
  const [productMaster, setProductMaster] = useState<any | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchProductMaster = async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/productmaster', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProductMaster(data || {});
      } else {
        if(response.status === 401) {
            toast({
                variant: "destructive",
                title: "Session Expired",
                description: "Please login again.",
            });
            sessionStorage.removeItem('accessToken');
            router.push('/login');
        } else {
            throw new Error('Failed to fetch product master');
        }
      }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "An Error Occurred",
            description: error.message || "Could not fetch product master data.",
        });
    }
  };

  useEffect(() => {
    fetchProductMaster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

                const sizeValue = packSize.toLowerCase().replace('ml', '').trim();
                const skuToMatch = `${brandName.trim().toUpperCase()}-${sizeValue}ML`;
                
                let matchStatus: 'found' | 'not found' = 'not found';
                let matchedSku: string | undefined = undefined;
                if (productMaster && productMaster.productList) {
                    const foundProduct = productMaster.productList.find((product: any) => product.SKU.toUpperCase() === skuToMatch);
                    if (foundProduct) {
                        matchStatus = 'found';
                        matchedSku = foundProduct.SKU;
                    }
                }

                let calculatedQty = 0;
                const caseQty = parseFloat(qty);
                if (!isNaN(caseQty)) {
                    if (packSize.includes('180')) {
                        calculatedQty = caseQty * 48;
                    } else if (packSize.includes('375')) {
                        calculatedQty = caseQty * 24;
                    }
                }
                
                items.push({
                    srNo,
                    brandName: matchedSku || brandName,
                    packSize,
                    qty,
                    calculatedQty,
                    totalValue,
                    matchStatus,
                    apiSku: matchedSku
                });
            }
        }
    }
    setParsedItems(items);
  };
  
  useEffect(() => {
    processData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastedData, productMaster]);


  const totalQty = parsedItems.reduce((acc, item) => {
    const value = parseFloat(item.qty);
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
                    மூன்றாம் தரப்பு போர்ட்டலில் இருந்து தரவை நகலெடுத்து கீழே உள்ள டெக்ஸ்ட் ஏரியாவில் ஒட்டவும். தரவு தானாகவே செயலாக்கப்படும்.
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
                                    <TableHead className="text-right">Case</TableHead>
                                    <TableHead className="text-right">QTY</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedItems.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.srNo}</TableCell>
                                    <TableCell>{item.brandName}</TableCell>
                                    <TableCell>{item.packSize}</TableCell>
                                    <TableCell className="text-right">{item.qty}</TableCell>
                                    <TableCell className="text-right">{item.calculatedQty}</TableCell>
                                    <TableCell className="text-right">{item.totalValue}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.matchStatus === 'found' ? 'default' : 'destructive'} className={item.matchStatus === 'found' ? 'bg-green-600' : ''}>
                                            {item.matchStatus === 'found' ? 'Found' : 'Not Found'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="justify-end font-bold text-lg">
                    Total Quantity: {totalQty.toFixed(2)}
                </CardFooter>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}

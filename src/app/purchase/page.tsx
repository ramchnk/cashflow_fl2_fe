
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProductMasterItem {
  SKU: string;
  stock: number;
  purchasePrice: number;
  [key: string]: any;
}

interface PurchaseItem {
  srNo: string;
  brandName: string;
  packSize: string;
  qty: string;
  calculatedQty: number;
  totalValue: string;
  numericTotalValue: number;
  matchStatus: 'found' | 'not found';
  apiSku?: string;
  matchedProduct?: ProductMasterItem;
}

export default function PurchasePage() {
  const [pastedData, setPastedData] = useState('');
  const [parsedItems, setParsedItems] = useState<PurchaseItem[]>([]);
  const [productMaster, setProductMaster] = useState<{ productList: ProductMasterItem[] } | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            let totalValue = columns[6];
            let numericTotalValue = 0;

            if (srNo && brandName && packSize && qty && totalValue) {
                
                let calculatedQty = 0;
                const caseQty = parseFloat(qty);
                if (!isNaN(caseQty)) {
                    if (packSize.includes('180')) {
                        calculatedQty = caseQty * 48;
                    } else if (packSize.includes('375')) {
                        calculatedQty = caseQty * 24;
                    } else if (packSize.includes('750')) {
                        calculatedQty = caseQty * 12;
                    } else if (packSize.includes('650')) {
                        calculatedQty = caseQty * 12;
                    } else if (packSize.includes('500')) {
                        calculatedQty = caseQty * 24;
                    } else if (packSize.includes('325')) {
                        calculatedQty = caseQty * 24;
                    }
                }

                const sizeValue = packSize.toLowerCase().replace('ml', '').trim();
                const skuToMatch = `${brandName.trim().toUpperCase()}-${sizeValue}ML`;
                
                let matchStatus: 'found' | 'not found' = 'not found';
                let matchedSku: string | undefined = undefined;
                let matchedProduct: ProductMasterItem | undefined = undefined;

                if (productMaster && productMaster.productList) {
                    const foundProduct = productMaster.productList.find((product: any) => product.SKU.toUpperCase() === skuToMatch);
                    if (foundProduct) {
                        matchStatus = 'found';
                        matchedSku = foundProduct.SKU;
                        matchedProduct = foundProduct;

                        if(foundProduct.purchasePrice && calculatedQty > 0) {
                           const calculatedTotal = calculatedQty * foundProduct.purchasePrice;
                            totalValue = new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                            }).format(calculatedTotal);
                            numericTotalValue = calculatedTotal;
                        }
                    }
                }
                
                items.push({
                    srNo,
                    brandName: matchedSku || brandName,
                    packSize,
                    qty,
                    calculatedQty,
                    totalValue,
                    numericTotalValue,
                    matchStatus,
                    apiSku: matchedSku,
                    matchedProduct
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
  
  const totalValue = parsedItems.reduce((acc, item) => {
    return acc + item.numericTotalValue;
  }, 0);

  const handleSubmitPurchase = async () => {
    if (!billNumber || !billDate) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please enter Bill Number and Bill Date.",
        });
        return;
    }

    if (parsedItems.some(item => item.matchStatus === 'not found')) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Some items could not be matched. Please correct them before submitting.",
        });
        return;
    }

    if (parsedItems.length === 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "There are no items to submit.",
        });
        return;
    }
    
    setIsSubmitting(true);
    
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        setIsSubmitting(false);
        return;
    }

    const payload = {
        billNo: billNumber,
        purchaseDate: Math.floor(billDate.getTime() / 1000),
        purchaseAmount: totalValue.toFixed(2),
        totalQuantity: totalQty,
        productList: parsedItems.map(item => ({
            SKU: item.apiSku,
            openingStock: item.matchedProduct?.stock || 0,
            purchaseStock: item.calculatedQty,
            stock: (item.matchedProduct?.stock || 0) + item.calculatedQty,
            purchaseAmount: item.numericTotalValue
        }))
    };

    try {
        const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/productmaster', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            toast({
                title: "Purchase Submitted",
                description: `Bill ${billNumber} has been successfully submitted.`,
            });
            // Reset form
            setPastedData('');
            setParsedItems([]);
            setBillNumber('');
            setBillDate(new Date());
            await fetchProductMaster();
        } else {
             const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit purchase.');
        }

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }


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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="bill-number">Bill Number</Label>
                      <Input
                        id="bill-number"
                        placeholder="Enter bill number"
                        value={billNumber}
                        onChange={(e) => setBillNumber(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bill-date">Bill Date</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="bill-date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !billDate && "text-muted-foreground"
                            )}
                             disabled={isSubmitting}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={billDate}
                            onSelect={setBillDate}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
                 <Textarea
                    placeholder="Paste your copied data here..."
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    disabled={isSubmitting}
                />
            </CardContent>
          </Card>

          {parsedItems.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Purchase Order Preview</CardTitle>
                    <CardDescription>
                        Review the parsed items below before submitting.
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
                <CardFooter className="flex justify-between items-center font-bold text-lg">
                    <div className="flex gap-8">
                       <div>
                            Total Cases: {totalQty.toFixed(2)}
                        </div>
                        <div>
                            Total Value: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalValue)}
                        </div>
                    </div>
                     <Button onClick={handleSubmitPurchase} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Purchase'}
                    </Button>
                </CardFooter>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}


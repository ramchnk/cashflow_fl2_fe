
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useRouter } from 'next/navigation';


interface EstimateItem {
  SKU: string;
  totalSalesQty: number;
  avgSalesPerDay: number;
  estimatedQuantity: number;
  estInCase: number;
  purchasePrice: number;
  inHand: number;
}

interface ApiResponseItem {
    SKU: string;
    totalSalesQty: number;
}

interface ProductMasterItem {
  SKU: string;
  stock: number;
  purchasePrice: number;
  [key: string]: any;
}


export default function PurchaseEstimatePage() {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [purchaseDays, setPurchaseDays] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [productMaster, setProductMaster] = useState<ProductMasterItem[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    const fetchProductMaster = async () => {
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/productmaster', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setProductMaster(data?.productList || []);
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
                title: "Error fetching products",
                description: error.message || "Could not fetch product master data.",
            });
        }
    };

    fetchProductMaster();
  }, [router, toast]);

  const handleGenerateEstimate = async () => {
    if (!dateRange || !dateRange.from || !dateRange.to || purchaseDays === '' || +purchaseDays <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a valid date range and enter a positive number of days for purchase.',
      });
      return;
    }

    setIsLoading(true);
    setItems([]);

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
        const startTimestamp = Math.floor(startOfDay(dateRange.from).getTime() / 1000);
        const endTimestamp = Math.floor(endOfDay(dateRange.to).getTime() / 1000);
        
        const url = `https://tnfl2-cb6ea45c64b3.herokuapp.com/services/sales/estimate?startDate=${startTimestamp}&endDate=${endTimestamp}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const responseData = await response.json();
            const apiItems: ApiResponseItem[] = responseData.data || [];

            const daysInRange = (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24) + 1;
            
            const productMasterMap = new Map(productMaster.map(p => [p.SKU, p]));

            const estimatedItems: EstimateItem[] = apiItems.map(item => {
                const dailyAvg = item.totalSalesQty / daysInRange;
                const productInfo = productMasterMap.get(item.SKU);
                const inHandStock = productInfo?.stock || 0;
                const purchasePrice = productInfo?.purchasePrice || 0;
                
                const projectedNeed = dailyAvg * +purchaseDays;
                const requiredQuantity = projectedNeed - inHandStock;
                const estimatedQuantity = Math.max(0, Math.ceil(requiredQuantity));

                let estInCase = 0;
                let packSize = 1;
                const skuParts = item.SKU.split('-');
                if (skuParts.length > 1) {
                    const size = skuParts[1].toUpperCase();
                    if (size.includes('180ML')) {
                        packSize = 48;
                    } else if (size.includes('375ML')) {
                        packSize = 24;
                    } else if (size.includes('750ML') || size.includes('650ML')) {
                        packSize = 12;
                    } else if (size.includes('1000ML')) {
                        packSize = 9;
                    } else if (size.includes('325ML') || size.includes('500ML')) {
                        packSize = 24;
                    }
                }
                if (packSize > 0) {
                    estInCase = estimatedQuantity / packSize;
                }
                
                return {
                    SKU: item.SKU,
                    totalSalesQty: item.totalSalesQty,
                    avgSalesPerDay: dailyAvg,
                    inHand: inHandStock,
                    estimatedQuantity: estimatedQuantity,
                    estInCase: estInCase,
                    purchasePrice: purchasePrice,
                }
            });

            setItems(estimatedItems);
            toast({
                title: 'Estimate Generated',
                description: `Purchase estimate created for ${purchaseDays} days based on selected sales data.`
            });

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
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch estimate data');
            }
        }
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'An Error Occurred',
            description: error.message || 'Could not generate estimate.',
        });
        setItems([]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleEstInCaseChange = (index: number, newEstInCaseStr: string) => {
    const newEstInCase = Number(newEstInCaseStr);
    if (isNaN(newEstInCase)) return;

    setItems(prevItems => {
        const newItems = [...prevItems];
        const item = newItems[index];
        if (!item) return prevItems;

        let packSize = 1;
        const skuParts = item.SKU.split('-');
        if (skuParts.length > 1) {
            const size = skuParts[1].toUpperCase();
            if (size.includes('180ML')) {
                packSize = 48;
            } else if (size.includes('375ML')) {
                packSize = 24;
            } else if (size.includes('750ML') || size.includes('650ML')) {
                packSize = 12;
            } else if (size.includes('1000ML')) {
                packSize = 9;
            } else if (size.includes('325ML') || size.includes('500ML')) {
                packSize = 24;
            }
        }

        const newEstimatedQuantity = newEstInCase * packSize;
        
        newItems[index] = {
            ...item,
            estInCase: newEstInCase,
            estimatedQuantity: newEstimatedQuantity,
        };

        return newItems;
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Purchase Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="date-range">Sales Date Range</Label>
                   <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                                disabled={isLoading}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-days">No. of Days for Purchase</Label>
                  <Input
                    id="purchase-days"
                    type="number"
                    placeholder="e.g., 7"
                    value={purchaseDays}
                    onChange={(e) => setPurchaseDays(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateEstimate} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Estimate'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Purchase Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Total Sales Qty</TableHead>
                    <TableHead className="text-right">AVG Sales/Day</TableHead>
                    <TableHead className="text-right">In Hand</TableHead>
                    <TableHead className="text-right">Purchase Price per Item</TableHead>
                    <TableHead className="text-right">Estimated Quantity</TableHead>
                    <TableHead className="text-right">Est In Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Loading estimate...
                      </TableCell>
                    </TableRow>
                  ) : items.length > 0 ? (
                    items.map((item, index) => (
                      <TableRow key={item.SKU}>
                        <TableCell>{item.SKU}</TableCell>
                        <TableCell className="text-right">{item.totalSalesQty}</TableCell>
                        <TableCell className="text-right">{Math.round(item.avgSalesPerDay)}</TableCell>
                        <TableCell className="text-right">{item.inHand}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{item.estimatedQuantity}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={item.estInCase}
                            onChange={(e) => handleEstInCaseChange(index, e.target.value)}
                            className="text-right h-8"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Generate an estimate to see results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

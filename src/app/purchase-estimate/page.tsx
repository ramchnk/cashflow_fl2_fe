
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
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import { CalendarIcon, File, Printer } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [filterColumn, setFilterColumn] = useState<keyof EstimateItem | 'none'>('estInCase');
  const [filterOperator, setFilterOperator] = useState<'>' | '<' | '='>('>');
  const [filterValue, setFilterValue] = useState<number | ''>(0);

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

  const getPackSize = (sku: string) => {
    const size = sku.split('-')[1]?.toUpperCase() || '';
    if (size.includes('180ML')) return 48;
    if (size.includes('375ML')) return 24;
    if (size.includes('750ML') || size.includes('650ML')) return 12;
    if (size.includes('1000ML')) return 9;
    if (size.includes('500ML') || size.includes('325ML')) return 24;
    return 1;
  }

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
                const packSize = getPackSize(item.SKU);
                if (packSize > 0) {
                    estInCase = estimatedQuantity / packSize;
                }
                
                return {
                    SKU: item.SKU,
                    totalSalesQty: item.totalSalesQty,
                    avgSalesPerDay: dailyAvg,
                    inHand: inHandStock,
                    estimatedQuantity: estimatedQuantity,
                    estInCase: Math.ceil(estInCase),
                    purchasePrice: purchasePrice,
                }
            });
            
            const sortedItems = estimatedItems.sort((a, b) => b.estInCase - a.estInCase);

            setItems(sortedItems);
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
        const itemToUpdate = filteredItems[index]; // Get item from filtered list
        const originalIndex = prevItems.findIndex(i => i.SKU === itemToUpdate.SKU); // Find its index in original list
        const item = prevItems[originalIndex];

        if (!item) return prevItems;

        const packSize = getPackSize(item.SKU);

        const newEstimatedQuantity = newEstInCase * packSize;
        
        newItems[originalIndex] = {
            ...item,
            estInCase: newEstInCase,
            estimatedQuantity: newEstimatedQuantity,
        };

        return newItems;
    });
  };

  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    setDateRange(selectedRange);
    if (selectedRange?.from && selectedRange?.to) {
        setIsDatePickerOpen(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCSV = () => {
      if (filteredItems.length === 0) return;
      const header = "Item Name,Total Sales Qty,AVG Sales/Day,In Hand,Purchase Price per Item,Estimated Quantity,Est In Case,Approved Qty";
      const rows = filteredItems.map(i => {
        const packSize = getPackSize(i.SKU);
        const approvedQty = i.estInCase * packSize;
        return `"${i.SKU.replace(/"/g, '""')}",${i.totalSalesQty},${Math.round(i.avgSalesPerDay)},${i.inHand},${i.purchasePrice},${i.estimatedQuantity},${i.estInCase},${approvedQty}`;
      });
      let csvContent = "data:text/csv;charset=utf-8," + header + "\n" + rows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `purchase_estimate_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const filteredItems = items.filter(item => {
    if (filterColumn === 'none' || filterValue === '') return true;
    const itemValue = item[filterColumn];
    if (typeof itemValue !== 'number') return true;

    switch (filterOperator) {
        case '>': return itemValue > filterValue;
        case '<': return itemValue < filterValue;
        case '=': return itemValue === filterValue;
        default: return true;
    }
  });

  const totalEstimatedValue = filteredItems.reduce((acc, item) => {
    const packSize = getPackSize(item.SKU);
    const approvedQty = item.estInCase * packSize;
    return acc + (approvedQty * item.purchasePrice);
  }, 0);
  const totalCases = filteredItems.reduce((acc, item) => acc + item.estInCase, 0);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="space-y-6">
          <Card className="print-hidden">
            <CardHeader>
              <CardTitle>Generate Purchase Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="grid gap-2">
                  <Label htmlFor="date-range">Sales Date Range</Label>
                   <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[300px] justify-start text-left font-normal",
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
                                onSelect={handleDateSelect}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purchase-days">No. of Days for Purchase</Label>
                  <Input
                    id="purchase-days"
                    type="number"
                    placeholder="e.g., 7"
                    value={purchaseDays}
                    onChange={(e) => setPurchaseDays(e.target.value === '' ? '' : Number(e.target.value))}
                    onWheel={(e) => e.currentTarget.blur()}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  />
                </div>
                <Button onClick={handleGenerateEstimate} disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Estimate'}
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Filter</Label>
                  <div className="flex flex-wrap gap-2">
                    <Select value={filterColumn} onValueChange={(v) => setFilterColumn(v as keyof EstimateItem | 'none')}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Filter</SelectItem>
                        <SelectItem value="totalSalesQty">Total Sales Qty</SelectItem>
                        <SelectItem value="avgSalesPerDay">Avg Sales/Day</SelectItem>
                        <SelectItem value="inHand">In Hand</SelectItem>
                        <SelectItem value="estimatedQuantity">Estimated Qty</SelectItem>
                        <SelectItem value="estInCase">Est In Case</SelectItem>
                      </SelectContent>
                    </Select>
                     <Select value={filterOperator} onValueChange={(v) => setFilterOperator(v as '>' | '<' | '=')}>
                      <SelectTrigger className="w-full sm:w-[80px]">
                        <SelectValue placeholder="Op" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value="=">=</SelectItem>
                      </SelectContent>
                    </Select>
                     <Input
                        type="number"
                        placeholder="Value"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full sm:w-[100px]"
                        disabled={filterColumn === 'none'}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex flex-wrap justify-between items-center gap-4">
                  <CardTitle>Purchase Estimate</CardTitle>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8 font-bold text-lg print-hidden">
                      {items.length > 0 && (
                        <>
                            <div>
                                <span>Total Cases: </span>
                                <span className="text-primary">{totalCases}</span>
                            </div>
                            <div>
                                <span>Total Estimated Value: </span>
                                <span className="text-primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalEstimatedValue)}</span>
                            </div>
                        </>
                      )}
                  </div>
                  <div className="flex gap-2 print-hidden">
                      <Button variant="outline" onClick={handleCSV} disabled={items.length === 0}>
                        <File className="mr-2 h-4 w-4"/>
                        CSV
                      </Button>
                      <Button variant="outline" onClick={handlePrint} disabled={items.length === 0}>
                          <Printer className="mr-2 h-4 w-4"/>
                          Print
                      </Button>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right print-hidden">Total Sales Qty</TableHead>
                    <TableHead className="text-right print-hidden">AVG Sales/Day</TableHead>
                    <TableHead className="text-right print-hidden">In Hand</TableHead>
                    <TableHead className="text-right print-hidden">Purchase Price per Item</TableHead>
                    <TableHead className="text-right print-hidden">Estimated Quantity</TableHead>
                    <TableHead className="text-right">Est In Case</TableHead>
                    <TableHead className="text-right print-hidden">Approved Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Loading estimate...
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => {
                       const packSize = getPackSize(item.SKU);
                       const approvedQty = item.estInCase * packSize;
                      return (
                        <TableRow key={item.SKU}>
                          <TableCell>{item.SKU}</TableCell>
                          <TableCell className="text-right print-hidden">{item.totalSalesQty}</TableCell>
                          <TableCell className="text-right print-hidden">{Math.round(item.avgSalesPerDay)}</TableCell>
                          <TableCell className="text-right print-hidden">{item.inHand}</TableCell>
                          <TableCell className="text-right print-hidden">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.purchasePrice)}</TableCell>
                          <TableCell className="text-right print-hidden">{item.estimatedQuantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.estInCase}
                              onChange={(e) => handleEstInCaseChange(index, e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="text-right h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold print-hidden">{approvedQty}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {items.length > 0 ? 'No items match the current filter.' : 'Generate an estimate to see results.'}
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

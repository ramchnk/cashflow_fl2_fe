
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { CalendarIcon, File, Printer, PlusCircle, Check, ChevronsUpDown, HelpCircle, Sheet, Layers } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import RangeAnalytics from '@/components/purchase-estimate/range-analytics';
import { useUserStore } from '@/app/lib/user-store';


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
  const [groupByRange, setGroupByRange] = useState(true);

  const [isAddManuallyDialogOpen, setIsAddManuallyDialogOpen] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [manualEstInCase, setManualEstInCase] = useState<number | ''>('');
  const [permittedUnit, setPermittedUnit] = useState<string | null>(null);
  const [availableUnit, setAvailableUnit] = useState<number | null>(null);
  const [categoryUnits, setCategoryUnits] = useState({
      BRANDY: 0,
      WINE: 0,
      VODKA: 0,
      RUM: 0,
      WHISKY: 0,
      BEER: 0
  });

  const { toast } = useToast();
  const router = useRouter();
  const { shopName } = useUserStore();

  useEffect(() => {
    const fetchAccountInfo = async () => {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return;

      try {
        const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/account/getAccountInfo', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.account && data.account.permittedUnit) {
            setPermittedUnit(data.account.permittedUnit);
          }
        }
      } catch (error) {
        console.error("Failed to fetch account info:", error);
      }
    };

    const fetchDashboardData = async () => {
      const token = sessionStorage.getItem('accessToken');
      if (!token) return;

      try {
        const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/dashboard', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const totalUnits = data.totalUnits || {};
          const brandy = totalUnits.BRANDY || 0;
          const wine = totalUnits.WINE || 0;
          const vodka = totalUnits.VODKA || 0;
          const rum = totalUnits.RUM || 0;
          const whisky = totalUnits.WHISKY || 0;
          const beer = totalUnits.BEER || 0;

          setCategoryUnits({
              BRANDY: brandy,
              WINE: wine,
              VODKA: vodka,
              RUM: rum,
              WHISKY: whisky,
              BEER: beer
          });

          setAvailableUnit(brandy + wine + vodka + rum + whisky + beer);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };

    fetchAccountInfo();
    fetchDashboardData();
  }, []);
  
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
    const size = sku.toUpperCase();
    if (size.includes('180ML')) return 48;
    if (size.includes('375ML') || size.includes('200ML')) return 24;
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

  const handleAddManualItem = () => {
    if (!manualSku || manualEstInCase === '' || +manualEstInCase <= 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Input',
            description: 'Please select a product and enter a positive case quantity.',
        });
        return;
    }

    const productInfo = productMaster.find(p => p.SKU === manualSku);
    if (!productInfo) {
        toast({
            variant: 'destructive',
            title: 'Product not found',
            description: 'The selected product could not be found in the master list.',
        });
        return;
    }

    const packSize = getPackSize(manualSku);
    const newEstimatedQuantity = +manualEstInCase * packSize;

    setItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(item => item.SKU === manualSku);

        if (existingItemIndex > -1) {
            // Update existing item
            const newItems = [...prevItems];
            newItems[existingItemIndex] = {
                ...newItems[existingItemIndex],
                estInCase: +manualEstInCase,
                estimatedQuantity: newEstimatedQuantity,
            };
            toast({
                title: 'Item Updated',
                description: `${manualSku} quantity has been updated to ${manualEstInCase} cases.`,
            });
            return newItems.sort((a, b) => b.estInCase - a.estInCase);
        } else {
            // Add new item
            const newItem: EstimateItem = {
                SKU: manualSku,
                totalSalesQty: 0, // Manual add
                avgSalesPerDay: 0, // Manual add
                inHand: productInfo.stock || 0,
                purchasePrice: productInfo.purchasePrice || 0,
                estInCase: +manualEstInCase,
                estimatedQuantity: newEstimatedQuantity,
            };
            toast({
                title: 'Item Added',
                description: `${manualSku} has been added to the estimate.`,
            });
            return [...prevItems, newItem].sort((a, b) => b.estInCase - a.estInCase);
        }
    });

    setIsAddManuallyDialogOpen(false);
    setManualSku('');
    setManualEstInCase('');
  };

  const handleEstInCaseChange = (sku: string, newEstInCaseStr: string) => {
    const newEstInCase = Number(newEstInCaseStr);
    if (isNaN(newEstInCase)) return;

    setItems(prevItems => {
        const newItems = [...prevItems];
        const originalIndex = prevItems.findIndex(i => i.SKU === sku);
        if (originalIndex === -1) return prevItems;

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

  const handleExcelDownload = () => {
      if (filteredItems.length === 0 || productMaster.length === 0) return;

      const productMasterMap = new Map(productMaster.map(p => [p.SKU, p]));

      interface GroupedProduct {
        SKU: string;
        itemCode: string;
        brandName: string;
        packSizeNum: string;
        avgSale: number | string;
        cb: number | string;
        req: number | string;
        reqPass: string;
        mlSize: number;
      }

      const orderedGroups: string[] = [];
      const orderedBrandsByGroup: Record<string, string[]> = {};
      const groupedData: Record<string, Record<string, GroupedProduct[]>> = {};

      productMaster.forEach(p => {
        const rangeVal = p.range ? String(p.range).trim() : '';
        const brandVal = p.brand ? String(p.brand).trim() : '';
        let groupHeader = '';
        if (rangeVal) {
          groupHeader = `${rangeVal.toUpperCase()} CATEGORY ${brandVal.toUpperCase()}`;
        } else if (brandVal) {
          groupHeader = brandVal.toUpperCase();
        } else {
          groupHeader = 'OTHER';
        }

        const brandName = p.SKU.split('-').slice(0, -1).join('-') || p.SKU;

        if (!orderedGroups.includes(groupHeader)) {
          orderedGroups.push(groupHeader);
        }
        if (!orderedBrandsByGroup[groupHeader]) {
          orderedBrandsByGroup[groupHeader] = [];
        }
        if (!orderedBrandsByGroup[groupHeader].includes(brandName)) {
          orderedBrandsByGroup[groupHeader].push(brandName);
        }
      });

      filteredItems.forEach(item => {
        const productInfo = productMasterMap.get(item.SKU);
        const rangeVal = productInfo?.range ? String(productInfo.range).trim() : '';
        const brandVal = productInfo?.brand ? String(productInfo.brand).trim() : '';
        
        let groupHeader = '';
        if (rangeVal) {
          groupHeader = `${rangeVal.toUpperCase()} CATEGORY ${brandVal.toUpperCase()}`;
        } else if (brandVal) {
          groupHeader = brandVal.toUpperCase();
        } else {
          groupHeader = 'OTHER';
        }

        const skuParts = item.SKU.split('-');
        const brandName = skuParts.slice(0, -1).join('-') || item.SKU;
        const sizePart = skuParts[skuParts.length - 1] || '';
        const packSizeNum = sizePart.replace(/ML/i, '').trim();
        const mlSize = parseInt(sizePart, 10) || 0;

        const itemCode = productInfo?.itemCode || productInfo?.code || productInfo?.item_code || productInfo?.serialNumber || productInfo?.id || productInfo?.srNo || '';

        const groupedObj: GroupedProduct = {
          SKU: item.SKU,
          itemCode: String(itemCode),
          brandName,
          packSizeNum,
          avgSale: item.avgSalesPerDay > 0 ? Math.round(item.avgSalesPerDay) : '',
          cb: item.inHand > 0 ? item.inHand : '',
          req: item.estInCase > 0 ? item.estInCase : '',
          reqPass: '',
          mlSize,
        };

        if (!groupedData[groupHeader]) {
          groupedData[groupHeader] = {};
        }
        if (!groupedData[groupHeader][brandName]) {
          groupedData[groupHeader][brandName] = [];
        }
        groupedData[groupHeader][brandName].push(groupedObj);

        if (!orderedGroups.includes(groupHeader)) {
          orderedGroups.push(groupHeader);
        }
        if (!orderedBrandsByGroup[groupHeader]) {
          orderedBrandsByGroup[groupHeader] = [];
        }
        if (!orderedBrandsByGroup[groupHeader].includes(brandName)) {
          orderedBrandsByGroup[groupHeader].push(brandName);
        }
      });

      interface FlatRow {
        type: 'header' | 'product';
        text?: string;
        categoryTotal?: number | string;
        itemCode?: string;
        brandName?: string;
        packSizeNum?: string;
        avgSale?: string | number;
        cb?: string | number;
        req?: string | number;
        reqPass?: string;
      }

      const allRows: FlatRow[] = [];

      orderedGroups.forEach(groupHeader => {
        const brandsObj = groupedData[groupHeader];
        if (!brandsObj) return;

        const activeBrands = orderedBrandsByGroup[groupHeader].filter(brandName => brandsObj[brandName] && brandsObj[brandName].length > 0);
        if (activeBrands.length === 0) return;

        // Calculate total REQ cases for this group
        let categoryTotal = 0;
        activeBrands.forEach(brandName => {
          brandsObj[brandName].forEach(p => {
            const reqVal = Number(p.req);
            if (!isNaN(reqVal)) {
              categoryTotal += reqVal;
            }
          });
        });

        const headerText = groupHeader;
        allRows.push({ type: 'header', text: headerText, categoryTotal: categoryTotal });

        activeBrands.forEach(brandName => {
          const products = brandsObj[brandName];
          products.sort((a, b) => b.mlSize - a.mlSize);

          products.forEach(p => {
            allRows.push({
              type: 'product',
              itemCode: p.itemCode,
              brandName: p.brandName,
              packSizeNum: p.packSizeNum,
              avgSale: p.avgSale,
              cb: p.cb,
              req: p.req,
              reqPass: p.reqPass,
            });
          });
        });
      });

      if (allRows.length === 0) return;

      const headers = [
        'Item Code', 'Brand Name', 'Pack Size', 'Avg Sale', 'CB', 'REQ', 'REQ PASS'
      ];

      const grid: any[][] = [headers];

      for (let r = 0; r < allRows.length; r++) {
        const row = allRows[r];
        const rowCells = new Array(7).fill('');

        if (row.type === 'header') {
          rowCells[0] = row.text;
          rowCells[5] = row.categoryTotal;
        } else {
          rowCells[0] = row.itemCode;
          rowCells[1] = row.brandName;
          rowCells[2] = row.packSizeNum;
          rowCells[3] = row.avgSale;
          rowCells[4] = row.cb;
          rowCells[5] = row.req;
          rowCells[6] = row.reqPass;
        }

        grid.push(rowCells);
      }

      const merges: any[] = [];

      let brandStart = -1;
      let currentBrand = '';
      for (let r = 0; r < allRows.length; r++) {
        const row = allRows[r];
        if (row.type === 'header') {
          merges.push({ s: { r: r + 1, c: 0 }, e: { r: r + 1, c: 4 } });
          if (brandStart !== -1 && (r - 1) > brandStart) {
            merges.push({ s: { r: brandStart + 1, c: 1 }, e: { r: r, c: 1 } });
          }
          currentBrand = '';
          brandStart = -1;
        } else {
          if (row.brandName !== currentBrand) {
            if (brandStart !== -1 && (r - 1) > brandStart) {
              merges.push({ s: { r: brandStart + 1, c: 1 }, e: { r: r, c: 1 } });
            }
            currentBrand = row.brandName || '';
            brandStart = r;
          }
        }
      }
      if (brandStart !== -1 && (allRows.length - 1) > brandStart) {
        merges.push({ s: { r: brandStart + 1, c: 1 }, e: { r: allRows.length, c: 1 } });
      }

      const ws = XLSX.utils.aoa_to_sheet(grid);
      ws['!merges'] = merges;
      ws['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
      ];
      ws['!views'] = [{ showGridLines: true }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purchase Estimate');
      XLSX.writeFile(wb, `purchase_estimate_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };
  
  const productMasterMap = useMemo(() => {
    return new Map(productMaster.map(p => [p.SKU, p]));
  }, [productMaster]);

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

  const groupedItems = useMemo(() => {
    if (!groupByRange) return null;

    const map = new Map<string, EstimateItem[]>();
    const orderPriority = ['ORDINARY', 'MEDIUM', 'PREMIUM', 'SUPER PREMIUM', 'BEER', 'WINE', 'OTHER'];

    filteredItems.forEach((item) => {
      const productInfo = productMasterMap.get(item.SKU);
      const rangeName = productInfo?.range && String(productInfo.range).trim() 
        ? String(productInfo.range).trim().toUpperCase() 
        : 'OTHER';

      if (!map.has(rangeName)) {
        map.set(rangeName, []);
      }
      map.get(rangeName)!.push(item);
    });

    const groups = Array.from(map.entries()).map(([rangeName, groupItems]) => {
      const totalRangeCases = groupItems.reduce((acc, i) => acc + i.estInCase, 0);
      const totalRangeValue = groupItems.reduce((acc, i) => {
        const packSize = getPackSize(i.SKU);
        return acc + (i.estInCase * packSize * i.purchasePrice);
      }, 0);
      return {
        rangeName,
        items: groupItems,
        totalCases: totalRangeCases,
        totalValue: totalRangeValue,
      };
    });

    groups.sort((a, b) => {
      const idxA = orderPriority.indexOf(a.rangeName);
      const idxB = orderPriority.indexOf(b.rangeName);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.rangeName.localeCompare(b.rangeName);
    });

    return groups;
  }, [filteredItems, groupByRange, productMasterMap]);

  const rangeSummaryData = useMemo(() => {
    const map = new Map<string, { skuCount: number; estCases: number; totalQty: number; totalValue: number }>();
    const orderPriority = ['ORDINARY', 'MEDIUM', 'PREMIUM', 'SUPER PREMIUM', 'BEER', 'WINE', 'OTHER'];

    filteredItems.forEach((item) => {
      const productInfo = productMasterMap.get(item.SKU);
      const rangeName = productInfo?.range && String(productInfo.range).trim() 
        ? String(productInfo.range).trim().toUpperCase() 
        : 'OTHER';

      const packSize = getPackSize(item.SKU);
      const approvedQty = item.estInCase * packSize;
      const itemValue = approvedQty * item.purchasePrice;

      if (!map.has(rangeName)) {
        map.set(rangeName, { skuCount: 0, estCases: 0, totalQty: 0, totalValue: 0 });
      }
      const current = map.get(rangeName)!;
      current.skuCount += 1;
      current.estCases += item.estInCase;
      current.totalQty += approvedQty;
      current.totalValue += itemValue;
    });

    const list = Array.from(map.entries()).map(([rangeName, data]) => ({
      rangeName,
      ...data,
    }));

    list.sort((a, b) => {
      const idxA = orderPriority.indexOf(a.rangeName);
      const idxB = orderPriority.indexOf(b.rangeName);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.rangeName.localeCompare(b.rangeName);
    });

    return list;
  }, [filteredItems, productMasterMap]);

  const totalSummaryCases = useMemo(() => rangeSummaryData.reduce((acc, r) => acc + r.estCases, 0), [rangeSummaryData]);
  const totalSummaryValue = useMemo(() => rangeSummaryData.reduce((acc, r) => acc + r.totalValue, 0), [rangeSummaryData]);
  const totalSummaryQty = useMemo(() => rangeSummaryData.reduce((acc, r) => acc + r.totalQty, 0), [rangeSummaryData]);
  const totalSummarySkus = useMemo(() => rangeSummaryData.reduce((acc, r) => acc + r.skuCount, 0), [rangeSummaryData]);

  const totalEstimatedValue = filteredItems.reduce((acc, item) => {
    const packSize = getPackSize(item.SKU);
    const approvedQty = item.estInCase * packSize;
    return acc + (approvedQty * item.purchasePrice);
  }, 0);
  const totalCases = filteredItems.reduce((acc, item) => acc + item.estInCase, 0);

  const getProposedUnits = () => {
    let proposedLiquorMl = 0;
    let proposedBeerMl = 0;
    let proposedWineMl = 0;

    const productMasterMap = new Map(productMaster.map(p => [p.SKU, p]));

    filteredItems.forEach(item => {
      const productInfo = productMasterMap.get(item.SKU);
      const brand = (productInfo?.brand || '').toUpperCase();
      const skuParts = item.SKU.split('-');
      const sizePart = skuParts[skuParts.length - 1] || '';
      const ml = parseInt(sizePart, 10) || 0;

      const packSize = getPackSize(item.SKU);
      const approvedQty = item.estInCase * packSize;
      const mlTotal = approvedQty * ml;

      if (brand === "BRANDY" || brand === "WHISKY" || brand === "RUM" || brand === "VODKA") {
        proposedLiquorMl += mlTotal;
      } else if (brand === "BEER") {
        proposedBeerMl += mlTotal;
      } else if (brand === "WINE") {
        proposedWineMl += mlTotal;
      }
    });

    const liquor = proposedLiquorMl / 750;
    const beer = proposedBeerMl / 7800;
    const wine = proposedWineMl / 2250;

    return liquor + beer + wine;
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* 80% Main Purchase Estimate Content */}
          <div className="w-full lg:w-[78%] space-y-6 print:w-full">
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
                <Dialog open={isAddManuallyDialogOpen} onOpenChange={(isOpen) => {
                    setIsAddManuallyDialogOpen(isOpen);
                    if (!isOpen) {
                        setManualSku('');
                        setManualEstInCase('');
                    }
                }}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Manual Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Manual Item</DialogTitle>
                        <DialogDescription>
                          Select a product and specify the estimated case quantity.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="manual-product" className="text-right">
                            Product
                          </Label>
                          <div className="col-span-3">
                            {manualSku ? (
                                <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <span className="truncate pr-2">{manualSku}</span>
                                    <Button type="button" variant="ghost" size="sm" className="h-auto p-1" onClick={() => setManualSku('')}>Change</Button>
                                </div>
                            ) : (
                                <Command>
                                    <CommandInput placeholder="Search product..." />
                                    <CommandList>
                                        <CommandEmpty>No product found.</CommandEmpty>
                                        <CommandGroup>
                                            {productMaster
                                                .map((p) => (
                                                <CommandItem
                                                    key={p.SKU}
                                                    value={p.SKU}
                                                    onSelect={(currentValue) => {
                                                        setManualSku(p.SKU);
                                                    }}
                                                >
                                                    <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        manualSku === p.SKU ? "opacity-100" : "opacity-0"
                                                    )}
                                                    />
                                                    {p.SKU}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="manual-est-in-case" className="text-right">
                            Est. In Case
                          </Label>
                          <Input
                            id="manual-est-in-case"
                            type="number"
                            value={manualEstInCase}
                            onChange={(e) => setManualEstInCase(e.target.value === '' ? '' : Number(e.target.value))}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddManuallyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddManualItem}>Add/Update Item</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 items-end justify-between">
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

                <div className="flex items-center space-x-2 bg-muted/60 px-3 py-2 rounded-lg border">
                  <Switch
                    id="group-by-range"
                    checked={groupByRange}
                    onCheckedChange={setGroupByRange}
                  />
                  <Label htmlFor="group-by-range" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Group items by Range
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                      <CardTitle>Purchase Estimate</CardTitle>
                      {permittedUnit && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm transition-all duration-300 hover:scale-105">
                              Permitted Unit: {permittedUnit}
                          </span>
                      )}
                      {availableUnit !== null && (
                          <div className="flex items-center gap-1">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 shadow-sm transition-all duration-300 hover:scale-105">
                                  Available Unit: {availableUnit.toFixed(2)}
                              </span>
                              <Dialog>
                                  <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors print-hidden">
                                          <HelpCircle className="h-4 w-4" />
                                      </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[300px] border border-muted shadow-lg rounded-lg">
                                      <DialogHeader className="border-b pb-3">
                                          <DialogTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100 font-headline">Units By Category</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-3 py-4 text-base font-semibold text-slate-700 dark:text-slate-300 font-mono">
                                          <div>BRANDY : {Math.round(categoryUnits.BRANDY)}</div>
                                          <div>WINE : {Math.round(categoryUnits.WINE)}</div>
                                          <div>VODKA : {Math.round(categoryUnits.VODKA)}</div>
                                          <div>RUM : {Math.round(categoryUnits.RUM)}</div>
                                          <div>WHISKY : {Math.round(categoryUnits.WHISKY)}</div>
                                          <div>BEER : {Math.round(categoryUnits.BEER)}</div>
                                      </div>
                                  </DialogContent>
                              </Dialog>
                          </div>
                      )}
                  </div>
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
                            <div>
                                <span>Estimated Unit: </span>
                                <span className="text-primary">{getProposedUnits().toFixed(2)}</span>
                            </div>
                            {(() => {
                                const proposedUnits = getProposedUnits();
                                const totalUnits = (availableUnit || 0) + proposedUnits;
                                const permittedVal = permittedUnit ? (parseFloat(permittedUnit) || 0) : 0;
                                const diff = permittedVal - totalUnits;
                                if (permittedVal === 0) return null;
                                return diff >= 0 ? (
                                    <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-md text-base font-semibold">
                                        Remaining: <span className="underline decoration-2">{diff.toFixed(2)} Units</span>
                                    </div>
                                ) : (
                                    <div className="text-destructive bg-destructive/5 border border-destructive/20 px-3 py-1 rounded-md text-base font-semibold animate-pulse">
                                        Over Stock: <span className="underline decoration-2">{Math.abs(diff).toFixed(2)} Units</span>
                                    </div>
                                );
                            })()}
                        </>
                      )}
                  </div>
                  <div className="flex gap-2 print-hidden">
                      <Button variant="outline" onClick={handleExcelDownload} disabled={items.length === 0}>
                        <Sheet className="mr-2 h-4 w-4"/>
                        Excel
                      </Button>
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
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {items.length > 0 ? 'No items match the current filter.' : 'Generate an estimate to see results.'}
                      </TableCell>
                    </TableRow>
                  ) : groupByRange && groupedItems ? (
                    groupedItems.map((group) => (
                      <React.Fragment key={group.rangeName}>
                        <TableRow className="bg-primary/10 hover:bg-primary/15 font-bold border-t-2 border-primary/20">
                          <TableCell colSpan={6} className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary text-primary-foreground font-bold px-2.5 py-0.5 text-xs tracking-wider">
                                {group.rangeName}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-normal">
                                ({group.items.length} {group.items.length === 1 ? 'item' : 'items'})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <span className="text-xs font-bold text-primary">
                              {group.totalCases} Cases
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2.5 print-hidden">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(group.totalValue)}
                            </span>
                          </TableCell>
                        </TableRow>
                        {group.items.map((item) => {
                          const packSize = getPackSize(item.SKU);
                          const approvedQty = item.estInCase * packSize;
                          return (
                            <TableRow key={item.SKU} className="hover:bg-muted/40 transition-colors">
                              <TableCell className="pl-6 font-medium">{item.SKU}</TableCell>
                              <TableCell className="text-right print-hidden">{item.totalSalesQty}</TableCell>
                              <TableCell className="text-right print-hidden">{Math.round(item.avgSalesPerDay)}</TableCell>
                              <TableCell className="text-right print-hidden">{item.inHand}</TableCell>
                              <TableCell className="text-right print-hidden">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.purchasePrice)}
                              </TableCell>
                              <TableCell className="text-right print-hidden">{item.estimatedQuantity}</TableCell>
                              <TableCell className="text-right font-medium">
                                <span className="hidden print:inline font-bold">{item.estInCase}</span>
                                <Input
                                  type="number"
                                  value={item.estInCase}
                                  onChange={(e) => handleEstInCaseChange(item.SKU, e.target.value)}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="text-right h-8 print:hidden"
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold print-hidden">{approvedQty}</TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    filteredItems.map((item) => {
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
                          <TableCell className="text-right font-medium">
                            <span className="hidden print:inline font-bold">{item.estInCase}</span>
                            <Input
                              type="number"
                              value={item.estInCase}
                              onChange={(e) => handleEstInCaseChange(item.SKU, e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="text-right h-8 print:hidden"
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold print-hidden">{approvedQty}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Print Only: New Page with Range-wise Case Summary */}
          {filteredItems.length > 0 && (
            <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
              <div className="border border-slate-300 rounded-lg p-6 space-y-4 bg-white text-slate-900">
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                      Purchase Estimate - Range-wise Summary
                    </h2>
                    {dateRange?.from && dateRange?.to && (
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Sales Period: {format(dateRange.from, 'dd/MM/yyyy')} to {format(dateRange.to, 'dd/MM/yyyy')} ({purchaseDays} Days Purchase)
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-600 space-y-0.5">
                    <div>Generated: {format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
                    {shopName && <div className="font-bold text-slate-800">Shop: {shopName}</div>}
                  </div>
                </div>

                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px]">
                      <th className="border border-slate-300 px-3 py-2 text-center">S.No</th>
                      <th className="border border-slate-300 px-3 py-2">Range Category</th>
                      <th className="border border-slate-300 px-3 py-2 text-right">No. of SKUs</th>
                      <th className="border border-slate-300 px-3 py-2 text-right">Est. Quantity (Btls)</th>
                      <th className="border border-slate-300 px-3 py-2 text-right font-extrabold text-slate-900">Total Est. Cases</th>
                      <th className="border border-slate-300 px-3 py-2 text-right">% Share (Cases)</th>
                      <th className="border border-slate-300 px-3 py-2 text-right">Est. Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangeSummaryData.map((row, idx) => {
                      const casePercent = totalSummaryCases > 0 ? (row.estCases / totalSummaryCases) * 100 : 0;
                      return (
                        <tr key={row.rangeName} className="border-b border-slate-200">
                          <td className="border border-slate-300 px-3 py-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 px-3 py-2 font-bold">{row.rangeName}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right">{row.skuCount}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right">{row.totalQty.toLocaleString('en-IN')}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-extrabold text-slate-900 text-sm">
                            {row.estCases}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono">{casePercent.toFixed(1)}%</td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-semibold">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(row.totalValue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 text-slate-900 font-extrabold text-xs">
                      <td colSpan={2} className="border border-slate-400 px-3 py-2.5 text-left uppercase">Total</td>
                      <td className="border border-slate-400 px-3 py-2.5 text-right">{totalSummarySkus}</td>
                      <td className="border border-slate-400 px-3 py-2.5 text-right">{totalSummaryQty.toLocaleString('en-IN')}</td>
                      <td className="border border-slate-400 px-3 py-2.5 text-right text-sm font-black text-slate-900">
                        {totalSummaryCases} Cases
                      </td>
                      <td className="border border-slate-400 px-3 py-2.5 text-right font-mono">100.0%</td>
                      <td className="border border-slate-400 px-3 py-2.5 text-right text-sm">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalSummaryValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {permittedUnit && (
                  <div className="border border-slate-300 rounded p-3 text-xs bg-slate-50 flex justify-between items-center mt-4">
                    <div>
                      <span className="font-bold text-slate-700">Permitted Limit: </span>
                      <span>{permittedUnit} Units</span>
                      {availableUnit !== null && (
                        <span className="ml-4 font-bold text-slate-700">Available: {availableUnit.toFixed(2)} Units</span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Proposed Purchase: </span>
                      <span className="font-extrabold text-slate-900">{getProposedUnits().toFixed(2)} Units</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          {/* 20% Product Range Analytics Sidebar */}
          <div className="w-full lg:w-[22%] space-y-6 print:hidden">
            <RangeAnalytics productMaster={productMaster} items={filteredItems} />
          </div>
        </div>
      </main>
    </div>
  );
}

    
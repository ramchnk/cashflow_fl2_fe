
'use client';

import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Sheet, Check, ChevronsUpDown, Loader2, KeyRound, Database, Trash2, RefreshCw, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/app/lib/user-store';
import Header from '@/components/layout/header';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  qty: string; // This is the case quantity
  calculatedQty: number; // This is the bottle quantity
  rate?: string;
  addedValue?: string;
  itemPrice?: number;
  taxRate?: number;
  totalValue: string;
  numericTotalValue: number;
  matchStatus: 'found' | 'not found';
  apiSku?: string;
  matchedProduct?: ProductMasterItem;
  tasmacBrandName?: string;
  tasmacPackSize?: string;
}

interface ProductMasterResponse {
  productList: ProductMasterItem[];
  [key: string]: any;
}

interface AccountInfoResponse {
    account: {
        shopName?: string;
        sheetLink?: string;
        [key: string]: any;
    }
}

export default function PurchasePage() {
  const [pastedData, setPastedData] = useState('');
  const [parsedItems, setParsedItems] = useState<PurchaseItem[]>([]);
  const [productMaster, setProductMaster] = useState<ProductMasterResponse | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shopName, setShopName } = useUserStore();
  const [actualBillValue, setActualBillValue] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [sheetLink, setSheetLink] = useState<string | null>(null);
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [openRatePopoverIndex, setOpenRatePopoverIndex] = useState<number | null>(null);
  const [updatingPriceIndex, setUpdatingPriceIndex] = useState<number | null>(null);

  const [isFetchDialogOpen, setIsFetchDialogOpen] = useState(false);
  const [tasmacUsername, setTasmacUsername] = useState('');
  const [tasmacPassword, setTasmacPassword] = useState('');
  const [tasmacDate, setTasmacDate] = useState('');
  const [isFetchingTasmac, setIsFetchingTasmac] = useState(false);
  const [routeThroughLocal, setRouteThroughLocal] = useState(true);
  const [localPort, setLocalPort] = useState('9002');
  const [skuMappings, setSkuMappings] = useState<Record<string, string>>({});
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [mappingSheetTab, setMappingSheetTab] = useState('Mapping');
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [pastedMappingData, setPastedMappingData] = useState('');

  const getMappingKey = (brand: string, size: string) => {
    const cleanBrand = brand.trim().replace(/\s+/g, ' ').replace(/-/g, ' ').toUpperCase();
    const cleanSize = size.trim().replace(/\s+/g, '').toUpperCase();
    return `${cleanBrand}--${cleanSize}`;
  };

  const handleFetchTasmac = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasmacUsername || !tasmacPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter both TASMAC Username and Password.",
      });
      return;
    }

    setIsFetchingTasmac(true);
    try {
      const fetchUrl = routeThroughLocal 
        ? `http://localhost:${localPort}/api/fetch-tasmac`
        : '/api/fetch-tasmac';

      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: tasmacUsername,
          password: tasmacPassword,
          targetDate: tasmacDate || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Data Fetched Successfully",
          description: `Successfully fetched indent ${result.data.indentNo} details.`,
        });

        // Set inputs
        setPastedData(result.data.tsv);
        setBillNumber(result.data.indentNo);
        setActualBillValue(result.data.netAmount.toString());

        // Parse date "DD/MM/YYYY" to Date object
        if (result.data.indentDate) {
          const parts = result.data.indentDate.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-indexed
            const year = parseInt(parts[2], 10);
            const parsedDate = new Date(year, month, day);
            if (!isNaN(parsedDate.getTime())) {
              setBillDate(parsedDate);
            }
          }
        }

        // Close dialog and reset password and date selection
        setIsFetchDialogOpen(false);
        setTasmacPassword('');
        setTasmacDate('');
      } else {
        throw new Error(result.error || 'Failed to fetch data from TASMAC.');
      }
    } catch (error: any) {
      let desc = error.message || "An unexpected error occurred during fetch.";
      if (routeThroughLocal && (error.message === 'Failed to fetch' || error.name === 'TypeError')) {
        desc = `Could not connect to your local server on port ${localPort}. Please ensure you have run 'npm run dev' on your computer (port 9002), or uncheck the 'Route through client machine' checkbox to try using the Vercel server.`;
      }
      toast({
        variant: "destructive",
        title: "Fetch Failed",
        description: desc,
      });
    } finally {
      setIsFetchingTasmac(false);
    }
  };

  const fetchData = async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
        const [productResponse, accountResponse] = await Promise.all([
             fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/productmaster', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/account/getAccountInfo', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (productResponse.ok) {
            const data = await productResponse.json();
            setProductMaster(data || {});
        } else {
            if(productResponse.status === 401) throw new Error('Session Expired');
            throw new Error('Failed to fetch product master');
        }

        if (accountResponse.ok) {
            const data: AccountInfoResponse = await accountResponse.json();
            if (data.account) {
                 if (data.account.shopName) {
                    setShopName(data.account.shopName);
                }
                if (data.account.sheetLink) {
                    setSheetLink(data.account.sheetLink);
                }
            }
        } else {
             if(accountResponse.status === 401) throw new Error('Session Expired');
             throw new Error('Failed to fetch account info');
        }

    } catch (error: any) {
        if (error.message === 'Session Expired') {
            toast({
                variant: "destructive",
                title: "Session Expired",
                description: "Please login again.",
            });
            sessionStorage.removeItem('accessToken');
            router.push('/login');
        } else {
            toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: error.message || "Could not fetch required data.",
            });
        }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = `tasmac_sku_mappings_${shopName || 'default'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setSkuMappings(JSON.parse(saved));
      } else {
        setSkuMappings({});
      }
    }
  }, [shopName]);

  const getPackSizeNumber = (packSize: string): number => {
    const size = packSize.toUpperCase();
    if (size.includes('180ML') || size.includes('180 ML')) return 48;
    if (size.includes('375ML') || size.includes('375 ML') || size.includes('200ML') || size.includes('200 ML')) return 24;
    if (size.includes('750ML') || size.includes('750 ML') || size.includes('650ML') || size.includes('650 ML')) return 12;
    if (size.includes('1000ML') || size.includes('1000 ML') || size.includes('1LTR') || size.includes('1 LTR')) return 9;
    if (size.includes('325ML') || size.includes('325 ML') || size.includes('500ML') || size.includes('500 ML') || size.includes('330ML') || size.includes('330 ML')) return 24;
    
    // Numeric fallback if packSize is just number e.g. "180", "375"
    const numMatch = size.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      if (num === 180) return 48;
      if (num === 375 || num === 200 || num === 325 || num === 500 || num === 330) return 24;
      if (num === 750 || num === 650) return 12;
      if (num === 1000) return 9;
    }
    return 1;
  };

  const getItemTaxRate = (
    brandName?: string,
    tasmacBrandName?: string,
    apiSku?: string,
    matchedProduct?: ProductMasterItem
  ): number => {
    // 1. Check matched product's brand / category property
    const productBrand = (matchedProduct?.brand || matchedProduct?.category || matchedProduct?.group || '').toString().trim().toUpperCase();
    if (productBrand === 'BEER' || productBrand.includes('BEER')) return 2.60;
    if (productBrand === 'WINE' || productBrand.includes('WINE')) return 2.50;

    // 2. Check all relevant names for keywords
    const allNames = `${brandName || ''} ${tasmacBrandName || ''} ${apiSku || ''} ${matchedProduct?.SKU || ''}`.toUpperCase();

    // Check for Beer keywords (Beer: 260%)
    if (/\b(BEER|LAGER|DRAUGHT|ALE|STOUT|PILSNER)\b/i.test(allNames) || allNames.includes('BEER')) {
      return 2.60;
    }

    // Check for Wine keywords (Wine: 250%)
    if (/\b(WINE|PORT)\b/i.test(allNames) || allNames.includes('WINE')) {
      return 2.50;
    }

    // 3. Default: Remaining liquor (Brandy, Whisky, Rum, Vodka, etc.) is 220%
    return 2.20;
  };

  const calculateItemPrice = (
    addedValue: string | number | undefined,
    rate: string | number | undefined,
    packSize: string,
    taxRate: number = 2.20
  ): number => {
    const avNum = typeof addedValue === 'number' ? addedValue : (parseFloat(String(addedValue || '').replace(/,/g, '')) || 0);
    const rateNum = typeof rate === 'number' ? rate : (parseFloat(String(rate || '').replace(/,/g, '')) || 0);
    const packSizeNum = getPackSizeNumber(packSize);

    if (packSizeNum <= 0) return 0;
    if (avNum === 0 && rateNum === 0) return 0;

    // Formula: =(((Rate1 * Tax) + Rate2) / PackQty) * 2% + (((Rate1 * Tax) + Rate2) / PackQty)
    // Rate 1 = Added Value (from API)
    // Rate 2 = Rate (from API)
    // Tax = dynamic (Beer: 260% = 2.60, Wine: 250% = 2.50, Remaining Liquor: 220% = 2.20)
    const base = ((avNum * taxRate) + rateNum) / packSizeNum;
    return (base * 0.02) + base;
  };

  const getCalculatedQty = (packSize: string, caseQtyVal: string | number): number => {
    let calculatedQty = 0;
    const caseQtyStr = typeof caseQtyVal === 'number' ? caseQtyVal.toString() : caseQtyVal;
    if (caseQtyStr && caseQtyStr.trim() !== '') {
        const packSizeNum = getPackSizeNumber(packSize);
        const qtyTrimmed = caseQtyStr.trim();
        if (qtyTrimmed.includes('.')) {
            const parts = qtyTrimmed.split('.');
            const intPart = parseInt(parts[0], 10) || 0;
            const decPart = parseInt(parts[1], 10) || 0;
            calculatedQty = (intPart * packSizeNum) + decPart;
        } else {
            const caseQty = parseFloat(qtyTrimmed);
            if (!isNaN(caseQty)) {
                calculatedQty = caseQty * packSizeNum;
            }
        }
    }
    return calculatedQty;
  };

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
        let columns = lines[i].split('\t'); // Assuming tab-separated values
        if (columns.length === 1 && lines[i].includes('  ')) {
            columns = lines[i].split(/ {2,}|\t/).map(c => c.trim());
        }

        if (columns.length >= 7) { // We need at least 7 columns to get Total Value
            const srNo = columns[0]?.trim();
            const brandName = columns[1]?.trim();
            const packSize = columns[2]?.trim();
            const rate = columns[3]?.trim();
            const qty = columns[4]?.trim(); 
            const addedValue = columns[5]?.trim();
            let totalValue = columns[6]?.trim();
            let numericTotalValue = 0;

            if (srNo && brandName && packSize && qty && totalValue) {
                
                const calculatedQty = getCalculatedQty(packSize, qty);

                const sizeValue = packSize.toLowerCase().replace('ml', '').trim();
                const normalizedBrandName = brandName.trim().replace(/-/g, ' ');
                const skuToMatch = `${normalizedBrandName.toUpperCase()}-${sizeValue}ML`;
                
                // Lookup mapped SKU
                const mappingKey = getMappingKey(brandName, packSize);
                const mappedSku = skuMappings[mappingKey];

                let matchStatus: 'found' | 'not found' = 'not found';
                let matchedSku: string | undefined = undefined;
                let matchedProduct: ProductMasterItem | undefined = undefined;

                if (productMaster && productMaster.productList) {
                    const foundProduct = productMaster.productList.find((product: any) => {
                        if (mappedSku) {
                            // 1. Direct match
                            if (product.SKU.toUpperCase() === mappedSku.toUpperCase()) return true;
                            // 2. Match with dashes normalized
                            const normProductSku = product.SKU.replace(/-/g, ' ').toUpperCase();
                            const normMappedSku = mappedSku.replace(/-/g, ' ').toUpperCase();
                            if (normProductSku === normMappedSku) return true;
                            // 3. Match by appending size suffix if mappedSku doesn't have it
                            const suffix = `${sizeValue.toUpperCase()}ML`;
                            const mappedSkuWithSuffix = mappedSku.toUpperCase().endsWith(suffix)
                                ? mappedSku
                                : `${mappedSku}-${suffix}`;
                            
                            const normMappedSkuWithSuffix = mappedSkuWithSuffix.replace(/-/g, ' ').toUpperCase();
                            if (normProductSku === normMappedSkuWithSuffix) return true;
                            
                            return false;
                        }
                        const normalizedApiSku = product.SKU.replace(/-/g, ' ');
                        return normalizedApiSku.toUpperCase() === skuToMatch.replace(/-/g, ' ');
                    });

                    if (foundProduct) {
                        matchStatus = 'found';
                        matchedSku = foundProduct.SKU;
                        matchedProduct = foundProduct;
                    }
                }
                
                const taxRate = getItemTaxRate(matchedSku || brandName, brandName, matchedSku, matchedProduct);
                const itemPrice = calculateItemPrice(addedValue, rate, packSize, taxRate);

                const unitPrice = itemPrice > 0 ? itemPrice : (matchedProduct?.purchasePrice || 0);
                if (unitPrice > 0 && calculatedQty > 0) {
                    const calculatedTotal = calculatedQty * unitPrice;
                    totalValue = new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                    }).format(calculatedTotal);
                    numericTotalValue = calculatedTotal;
                }

                items.push({
                    srNo,
                    brandName: matchedSku || brandName,
                    packSize,
                    qty,
                    calculatedQty,
                    rate,
                    addedValue,
                    itemPrice,
                    taxRate,
                    totalValue,
                    numericTotalValue,
                    matchStatus,
                    apiSku: matchedSku,
                    matchedProduct,
                    tasmacBrandName: brandName,
                    tasmacPackSize: packSize
                });
            }
        }
    }
    setParsedItems(items);
  };
  
  useEffect(() => {
    processData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastedData, productMaster, skuMappings]);

  const handleBottleQtyChange = (index: number, newBottleQtyStr: string) => {
    const newBottleQty = parseFloat(newBottleQtyStr);
    if (isNaN(newBottleQty)) return;

    setParsedItems(prevItems => {
        const newItems = [...prevItems];
        const item = newItems[index];

        const packSizeNum = getPackSizeNumber(item.packSize);
        let newCaseQtyStr = '0';
        if (packSizeNum > 0) {
            const wholeCases = Math.floor(newBottleQty / packSizeNum);
            const looseBottles = newBottleQty % packSizeNum;
            newCaseQtyStr = looseBottles > 0 ? `${wholeCases}.${looseBottles}` : wholeCases.toString();
        }
        
        const unitPrice = (item.itemPrice && item.itemPrice > 0) ? item.itemPrice : (item.matchedProduct?.purchasePrice || 0);
        const newNumericTotalValue = unitPrice * newBottleQty;

        newItems[index] = {
            ...item,
            qty: newCaseQtyStr, // case qty
            calculatedQty: newBottleQty, // bottle qty
            numericTotalValue: newNumericTotalValue,
            totalValue: new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
            }).format(newNumericTotalValue),
        };
        
        return newItems;
    });
  }

  const extractMl = (str: string): string => {
    if (!str) return '';
    const match = str.toUpperCase().match(/(\d+)\s*ML/);
    if (match) return match[1];
    const numMatch = str.match(/\d+/);
    return numMatch ? numMatch[0] : '';
  };

  const handleSelectProduct = (index: number, selectedProduct: ProductMasterItem) => {
    const originalItem = parsedItems[index];
    if (originalItem) {
        const rawBrand = originalItem.tasmacBrandName || originalItem.brandName;
        const rawPack = originalItem.tasmacPackSize || originalItem.packSize;

        const originalMl = extractMl(rawPack);
        const selectedMl = extractMl(selectedProduct.SKU);

        if (originalMl && selectedMl && originalMl !== selectedMl) {
            const proceed = window.confirm(
                `Warning: ML Mismatch!\n` +
                `The pasted item size is ${originalMl}ML, but you selected a product of size ${selectedMl}ML ("${selectedProduct.SKU}").\n` +
                `Do you want to proceed with this mapping?`
            );
            if (!proceed) return;
        }

        const mappingKey = getMappingKey(rawBrand, rawPack);
        
        const newMappings = {
            ...skuMappings,
            [mappingKey]: selectedProduct.SKU
        };
        setSkuMappings(newMappings);
        if (typeof window !== 'undefined') {
            const key = `tasmac_sku_mappings_${shopName || 'default'}`;
            localStorage.setItem(key, JSON.stringify(newMappings));
        }
        
        toast({
            title: "Mapping Saved",
            description: `Mapped "${rawBrand}" (${rawPack}) to "${selectedProduct.SKU}".`,
        });
    }

    setParsedItems(prevItems => {
        const newItems = [...prevItems];
        const item = newItems[index];

        const skuParts = selectedProduct.SKU.split('-');
        const newPackSize = skuParts[skuParts.length - 1] || item.packSize;

        const newCalculatedQty = getCalculatedQty(newPackSize, item.qty);
        const newTaxRate = getItemTaxRate(selectedProduct.SKU, item.tasmacBrandName, selectedProduct.SKU, selectedProduct);
        const newItemPrice = calculateItemPrice(item.addedValue, item.rate, newPackSize, newTaxRate);
        
        const unitPrice = newItemPrice > 0 ? newItemPrice : (selectedProduct.purchasePrice || 0);
        const newNumericTotalValue = unitPrice * newCalculatedQty;

        newItems[index] = {
            ...item,
            brandName: selectedProduct.SKU,
            packSize: newPackSize,
            calculatedQty: newCalculatedQty,
            itemPrice: newItemPrice,
            taxRate: newTaxRate,
            numericTotalValue: newNumericTotalValue,
            totalValue: new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
            }).format(newNumericTotalValue),
            matchStatus: 'found',
            apiSku: selectedProduct.SKU,
            matchedProduct: selectedProduct
        };
        
        return newItems;
    });
    setOpenPopoverIndex(null);
  };


  const totalQty = parsedItems.reduce((acc, item) => {
    const value = parseFloat(item.qty);
    return acc + (isNaN(value) ? 0 : value);
  }, 0);
  
  const totalValue = parsedItems.reduce((acc, item) => {
    return acc + item.numericTotalValue;
  }, 0);

  const difference = (parseFloat(actualBillValue) || 0) - totalValue;

  const validateDuplicates = (): boolean => {
    const counts: { [key: string]: number } = {};
    const duplicates: string[] = [];

    parsedItems.forEach(item => {
      const key = `${item.brandName}-${item.packSize}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    for (const key in counts) {
      if (counts[key] > 1) {
        duplicates.push(key);
      }
    }

    if (duplicates.length > 0) {
      toast({
        variant: "destructive",
        title: "Duplicate Items Found",
        description: `The following items are duplicates: ${duplicates.join(', ')}`,
      });
      return false;
    }
    return true;
  };

  const handleSubmitPurchase = async () => {
    if (!billNumber || !billDate) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please enter Bill Number and Bill Date.",
        });
        return;
    }
    
    if (!actualBillValue || parseFloat(actualBillValue) <= 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please enter a valid Actual Bill Value.",
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

    if (!validateDuplicates()) {
        return;
    }
    
    setIsSubmitting(true);
    
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        router.push('/login');
        setIsSubmitting(false);
        return;
    }

    const finalPurchaseAmount = parseFloat(actualBillValue) > 0 ? parseFloat(actualBillValue) : totalValue;

    const payload = {
        billNo: billNumber,
        purchaseDate: Math.floor(billDate.getTime() / 1000),
        purchaseAmount: Math.round(finalPurchaseAmount),
        totalQuantity: Math.round(totalQty),
        productList: parsedItems.map(item => ({
            SKU: item.apiSku,
            openingStock: Math.round(item.matchedProduct?.stock || 0),
            purchaseStock: Math.round(item.calculatedQty),
            stock: Math.round((item.matchedProduct?.stock || 0) + item.calculatedQty),
            purchaseAmount: Math.round(item.numericTotalValue)
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
            setActualBillValue('');
            await fetchData();
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

  const handleUpdatePurchasePrice = async (item: PurchaseItem, index: number) => {
    const sku = item.apiSku || item.matchedProduct?.SKU;
    if (!sku) {
      toast({
        variant: "destructive",
        title: "Missing SKU",
        description: "Please select or match a valid SKU before updating the purchase price.",
      });
      return;
    }

    if (typeof item.itemPrice !== 'number' || isNaN(item.itemPrice) || item.itemPrice <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Price",
        description: "TASMAC calculated price is not available for this item.",
      });
      return;
    }

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const calculatedPurchasePrice = parseFloat(item.itemPrice.toFixed(4));

    setUpdatingPriceIndex(index);
    try {
      const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/productmaster/updatePurchasePrice', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          SKU: sku,
          purchasePrice: calculatedPurchasePrice
        })
      });

      if (response.ok) {
        toast({
          title: "Purchase Price Updated",
          description: `Successfully updated purchase price for "${sku}" to ₹${calculatedPurchasePrice.toFixed(4)}.`,
        });

        // Update productMaster state
        setProductMaster(prev => {
          if (!prev || !prev.productList) return prev;
          const updatedList = prev.productList.map(p => {
            if (p.SKU === sku) {
              return { ...p, purchasePrice: calculatedPurchasePrice };
            }
            return p;
          });
          return { ...prev, productList: updatedList };
        });

        // Update parsedItems state for items matching this SKU
        setParsedItems(prev => {
          return prev.map(pItem => {
            if (pItem.apiSku === sku || pItem.matchedProduct?.SKU === sku) {
              return {
                ...pItem,
                matchedProduct: pItem.matchedProduct ? {
                  ...pItem.matchedProduct,
                  purchasePrice: calculatedPurchasePrice
                } : pItem.matchedProduct
              };
            }
            return pItem;
          });
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update purchase price (${response.status})`);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected error occurred while updating the purchase price.",
      });
    } finally {
      setUpdatingPriceIndex(null);
    }
  };


  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentToken = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentToken += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentToken.trim());
        currentToken = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentToken.trim());
        lines.push(row);
        row = [];
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    if (currentToken || row.length > 0) {
      row.push(currentToken.trim());
      lines.push(row);
    }
    return lines;
  };

  const handleSyncFromGoogleSheet = async () => {
    if (!sheetLink) {
      toast({
        variant: "destructive",
        title: "No Sheet Linked",
        description: "There is no Google Sheet link associated with this account.",
      });
      return;
    }

    const match = sheetLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : null;

    if (!spreadsheetId) {
      toast({
        variant: "destructive",
        title: "Invalid Sheet Link",
        description: "Failed to extract Spreadsheet ID from the account's sheet link.",
      });
      return;
    }

    setIsSyncingSheet(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(mappingSheetTab)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load sheet. Ensure tab name is exactly "${mappingSheetTab}" and sheet is shared.`);
      }
      
      const csvText = await res.text();
      const rows = parseCSV(csvText);

      if (rows.length < 2) {
        throw new Error("The sheet is empty or has insufficient rows.");
      }

      // Detect headers
      const headers = rows[0].map(h => h.toLowerCase());
      
      let itemIdx = headers.findIndex(h => h.includes('item') || h.includes('tasmac'));
      let mlIdx = headers.findIndex(h => h.includes('ml') || h.includes('size') || h.includes('pack'));
      let skuIdx = headers.findIndex(h => h.includes('store') || h.includes('sku') || h.includes('account'));

      // If headers not matched, use default layout B (Item - index 1), C (ML - index 2), E (Store SKU - index 4) or similar
      if (itemIdx === -1) itemIdx = 1; // Default to Column B
      if (mlIdx === -1) mlIdx = 2;   // Default to Column C
      if (skuIdx === -1) {
        // If not found, look for last non-empty column in first row or default to Column E (index 4)
        skuIdx = headers.length > 4 ? 4 : headers.length - 1;
      }

      const newMappings = { ...skuMappings };
      let importedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rawItem = row[itemIdx]?.trim();
        const rawMl = row[mlIdx]?.trim();
        const rawSku = row[skuIdx]?.trim();

        if (rawItem && rawMl && rawSku) {
          const key = getMappingKey(rawItem, rawMl);
          newMappings[key] = rawSku;
          importedCount++;
        }
      }

      setSkuMappings(newMappings);
      if (typeof window !== 'undefined') {
        const key = `tasmac_sku_mappings_${shopName || 'default'}`;
        localStorage.setItem(key, JSON.stringify(newMappings));
      }

      toast({
        title: "Sync Successful",
        description: `Successfully loaded ${importedCount} mappings from Google Sheet tab "${mappingSheetTab}".`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "An error occurred while syncing from the sheet.",
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleImportPastedMapping = () => {
    if (!pastedMappingData.trim()) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Please paste your tab-separated mapping data first.",
      });
      return;
    }

    try {
      const lines = pastedMappingData.trim().split('\n');
      const newMappings = { ...skuMappings };
      let importedCount = 0;

      for (const line of lines) {
        if (!line.trim()) continue;
        let parts = line.split('\t').map(p => p.trim());
        
        // Fallback: if no tabs are found but there are spaces, try to split by multiple spaces
        if (parts.length === 1 && line.includes('  ')) {
          parts = line.split(/ {2,}/).map(p => p.trim());
        }
        
        const nonEmpties = parts.filter(p => p !== '');
        
        // Skip header lines
        if (line.toLowerCase().includes('brand name') || line.toLowerCase().includes('store sku') || line.toLowerCase().includes('item\tml')) {
          continue;
        }

        if (nonEmpties.length >= 3) {
          const tasmacName = nonEmpties[0];
          const ml = nonEmpties[1];
          const storeSku = nonEmpties[nonEmpties.length - 1];

          if (tasmacName && ml && storeSku) {
            const key = getMappingKey(tasmacName, ml);
            newMappings[key] = storeSku;
            importedCount++;
          }
        }
      }

      setSkuMappings(newMappings);
      if (typeof window !== 'undefined') {
        const key = `tasmac_sku_mappings_${shopName || 'default'}`;
        localStorage.setItem(key, JSON.stringify(newMappings));
      }

      setPastedMappingData('');
      toast({
        title: "Import Successful",
        description: `Successfully imported ${importedCount} SKU mappings.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "An error occurred while importing pasted data.",
      });
    }
  };

  const handleDeleteMapping = (mappingKey: string) => {
    const newMappings = { ...skuMappings };
    delete newMappings[mappingKey];
    setSkuMappings(newMappings);
    
    if (typeof window !== 'undefined') {
      const key = `tasmac_sku_mappings_${shopName || 'default'}`;
      localStorage.setItem(key, JSON.stringify(newMappings));
    }
    
    toast({
      title: "Mapping Deleted",
      description: "SKU mapping removed successfully.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <CardTitle>Process Purchase Data</CardTitle>
                        <CardDescription>
                            மூன்றாம் தரப்பு போர்ட்டலில் இருந்து தரவை நகலெடுத்து கீழே உள்ள டெக்ஸ்ட் ஏரியாவில் ஒட்டவும். தரவு தானாகவே செயலாக்கப்படும்.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isFetchDialogOpen} onOpenChange={setIsFetchDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Fetch from TASMAC
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Fetch Indent from TASMAC</DialogTitle>
                                    <DialogDescription>
                                        TASMAC போர்ட்டலில் இருந்து நேரடி கொள்முதல் தரவைப் பெற உங்கள் பயனர் பெயர் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleFetchTasmac} className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="tasmac-username">TASMAC Username</Label>
                                        <Input
                                            id="tasmac-username"
                                            placeholder="e.g. 22/2022-23"
                                            value={tasmacUsername}
                                            onChange={(e) => setTasmacUsername(e.target.value)}
                                            disabled={isFetchingTasmac}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tasmac-password">TASMAC Password</Label>
                                        <Input
                                            id="tasmac-password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={tasmacPassword}
                                            onChange={(e) => setTasmacPassword(e.target.value)}
                                            disabled={isFetchingTasmac}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tasmac-date">Purchase Date (Optional)</Label>
                                        <Input
                                            id="tasmac-date"
                                            type="date"
                                            value={tasmacDate}
                                            onChange={(e) => setTasmacDate(e.target.value)}
                                            disabled={isFetchingTasmac}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-2">
                                        <Checkbox
                                            id="route-local"
                                            checked={routeThroughLocal}
                                            onCheckedChange={(checked) => setRouteThroughLocal(checked === true)}
                                            disabled={isFetchingTasmac}
                                        />
                                        <Label htmlFor="route-local" className="cursor-pointer font-medium text-sm">
                                            Route through client machine (local dev server)
                                        </Label>
                                    </div>
                                    {routeThroughLocal && (
                                        <div className="space-y-2 pl-6">
                                            <Label htmlFor="local-port">Local Dev Port</Label>
                                            <Input
                                                id="local-port"
                                                type="text"
                                                placeholder="9002"
                                                value={localPort}
                                                onChange={(e) => setLocalPort(e.target.value)}
                                                disabled={isFetchingTasmac}
                                                className="w-24"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Requires running <code>npm run dev</code> on your local machine to bypass Vercel's IP blocks.
                                            </p>
                                        </div>
                                    )}

                                    <DialogFooter className="pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsFetchDialogOpen(false)}
                                            disabled={isFetchingTasmac}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isFetchingTasmac}>
                                            {isFetchingTasmac ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Fetching...
                                                </>
                                            ) : (
                                                'Fetch'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="font-semibold">
                                    <Database className="mr-2 h-4 w-4" />
                                    SKU Mapping
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Manage SKU Mappings</DialogTitle>
                                    <DialogDescription>
                                        TASMAC பெயர் மற்றும் அளவை உங்கள் கணக்கின் தனிப்பயன் SKU-வுடன் பொருத்தவும்.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-6 py-4">

                                    {/* Paste Bulk Mapping */}
                                    <div className="space-y-2 border-b pb-4">
                                        <h3 className="font-semibold text-sm">Paste Mappings Manually</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Google Sheet-ல் உள்ள Item, ML மற்றும் Store SKU காலம்களை நகலெடுத்து கீழே ஒட்டவும்.
                                        </p>
                                        <Textarea
                                            placeholder="Example:&#10;DIAMOND XXX RUM&#9;375ml&#9;DIAMOND XXX RUM&#10;OAK VAT MATURED RUM&#9;180ml&#9;oak vat"
                                            value={pastedMappingData}
                                            onChange={(e) => setPastedMappingData(e.target.value)}
                                            rows={4}
                                            className="font-mono text-xs mt-2"
                                        />
                                        <Button 
                                            type="button" 
                                            onClick={handleImportPastedMapping}
                                            size="sm"
                                            className="mt-2"
                                            disabled={!pastedMappingData.trim()}
                                        >
                                            Import Pasted Data
                                        </Button>
                                    </div>

                                    {/* Saved Mappings List */}
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-sm">Saved SKU Mappings ({Object.keys(skuMappings).length})</h3>
                                        {Object.keys(skuMappings).length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic bg-accent/20 p-4 rounded text-center">
                                                No saved SKU mappings found for this account. Create some by importing or correcting mismatch items in the purchase table.
                                            </p>
                                        ) : (
                                            <ScrollArea className="h-48 border rounded-md">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">TASMAC Brand (ML)</TableHead>
                                                            <TableHead className="text-xs">Store SKU</TableHead>
                                                            <TableHead className="w-[80px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Object.entries(skuMappings).map(([key, value]) => {
                                                            const [brand, ml] = key.split('--');
                                                            return (
                                                                <TableRow key={key}>
                                                                    <TableCell className="text-xs font-mono py-2">
                                                                        {brand} ({ml})
                                                                    </TableCell>
                                                                    <TableCell className="text-xs font-medium py-2">
                                                                        {value}
                                                                    </TableCell>
                                                                    <TableCell className="py-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDeleteMapping(key)}
                                                                            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" onClick={() => setIsMappingDialogOpen(false)}>
                                        Close
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {sheetLink && (
                            <Button
                                variant="outline"
                                onClick={() => window.open(sheetLink, '_blank')}
                            >
                                <Sheet className="mr-2 h-4 w-4" />
                                Open Sheet
                            </Button>
                        )}
                    </div>
                </div>
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
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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
                            onSelect={(date) => {
                                setBillDate(date);
                                setIsDatePickerOpen(false);
                            }}
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

          {parsedItems.length > 0 && (() => {
            const priceChangedCount = parsedItems.filter(item => {
              const masterPrice = item.matchedProduct?.purchasePrice;
              return item.matchStatus === 'found' && typeof item.itemPrice === 'number' && item.itemPrice > 0 && typeof masterPrice === 'number' && masterPrice > 0 && Math.abs(item.itemPrice - masterPrice) >= 0.01;
            }).length;

            return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <CardTitle>Purchase Order Preview</CardTitle>
                            <CardDescription>
                                Review the parsed items below before submitting.
                            </CardDescription>
                        </div>
                        {priceChangedCount > 0 && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs flex items-center gap-1.5 font-medium">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span>{priceChangedCount} item{priceChangedCount > 1 ? 's have' : ' has'} rate difference vs Product Master</span>
                            </Badge>
                        )}
                    </div>
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
                                    <TableHead className="text-right">Item Price</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedItems.map((item, index) => {
                                  const itemPrice = item.itemPrice;
                                  const masterPrice = item.matchedProduct?.purchasePrice;
                                  const hasItemPrice = typeof itemPrice === 'number' && itemPrice > 0;
                                  const hasMasterPrice = typeof masterPrice === 'number' && masterPrice > 0;
                                  const priceDiff = (typeof itemPrice === 'number' && typeof masterPrice === 'number') ? (itemPrice - masterPrice) : 0;
                                  const hasSignificantDiff = (typeof itemPrice === 'number' && typeof masterPrice === 'number') && Math.abs(priceDiff) >= 0.01;
                                  const percentDiff = (hasSignificantDiff && typeof masterPrice === 'number' && masterPrice > 0) ? ((priceDiff / masterPrice) * 100) : 0;

                                  return (
                                  <TableRow key={index} className={cn(hasSignificantDiff && "bg-amber-50/20 dark:bg-amber-950/10")}>
                                      <TableCell>{item.srNo}</TableCell>
                                      <TableCell>
                                          <Popover open={openPopoverIndex === index} onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}>
                                              <PopoverTrigger asChild>
                                                  <Button
                                                      variant="ghost"
                                                      role="combobox"
                                                      disabled={isSubmitting}
                                                      className={cn(
                                                          "h-auto p-1 font-normal justify-start text-left hover:bg-accent hover:text-accent-foreground w-full max-w-[300px]",
                                                          item.matchStatus === 'not found' && "border border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive px-2 py-1"
                                                      )}
                                                  >
                                                      <span className="truncate mr-2">{item.brandName || "Select SKU"}</span>
                                                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                                  </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[350px] p-0" align="start">
                                                  <Command>
                                                      <CommandInput placeholder="Search SKU..." />
                                                      <CommandList>
                                                          <CommandEmpty>No SKU found.</CommandEmpty>
                                                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                                                              {productMaster?.productList?.map((product) => (
                                                                  <CommandItem
                                                                      key={product.SKU}
                                                                      value={product.SKU}
                                                                      onSelect={() => {
                                                                          handleSelectProduct(index, product);
                                                                      }}
                                                                  >
                                                                      <Check
                                                                          className={cn(
                                                                              "mr-2 h-4 w-4",
                                                                              item.apiSku === product.SKU ? "opacity-100" : "opacity-0"
                                                                          )}
                                                                      />
                                                                      {product.SKU}
                                                                  </CommandItem>
                                                              ))}
                                                          </CommandGroup>
                                                      </CommandList>
                                                  </Command>
                                              </PopoverContent>
                                          </Popover>
                                      </TableCell>
                                      <TableCell>{item.packSize}</TableCell>
                                      <TableCell className="text-right">{item.qty}</TableCell>
                                      <TableCell className="text-right">
                                        <Input
                                            type="number"
                                            value={item.calculatedQty}
                                            onChange={(e) => handleBottleQtyChange(index, e.target.value)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="text-right h-8 w-24 ml-auto"
                                            disabled={isSubmitting}
                                        />
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {item.itemPrice ? (
                                          <Popover
                                            open={openRatePopoverIndex === index}
                                            onOpenChange={(open) => setOpenRatePopoverIndex(open ? index : null)}
                                          >
                                            <PopoverTrigger asChild>
                                              <button
                                                type="button"
                                                className="cursor-pointer inline-flex flex-col items-end text-right hover:opacity-80 transition-opacity focus:outline-none focus:ring-1 focus:ring-ring rounded px-1.5 py-0.5"
                                                title="Click to view rate breakdown & update price"
                                              >
                                                <span className={cn(hasSignificantDiff && (priceDiff > 0 ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-blue-700 dark:text-blue-300 font-semibold"))}>
                                                  {new Intl.NumberFormat('en-IN', {
                                                    style: 'currency',
                                                    currency: 'INR',
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 4,
                                                  }).format(item.itemPrice)}
                                                </span>
                                                {hasSignificantDiff ? (
                                                  priceDiff > 0 ? (
                                                    <span className="text-[10px] flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium">
                                                      <ArrowUpRight className="h-3 w-3 inline" />
                                                      +₹{priceDiff.toFixed(2)} ({percentDiff > 0 ? `+${percentDiff.toFixed(1)}%` : ''})
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                                      <ArrowDownRight className="h-3 w-3 inline" />
                                                      -₹{Math.abs(priceDiff).toFixed(2)} ({percentDiff.toFixed(1)}%)
                                                    </span>
                                                  )
                                                ) : null}
                                              </button>
                                            </PopoverTrigger>
                                            <PopoverContent side="left" className="text-xs space-y-2.5 p-3 w-72 bg-popover text-popover-foreground border shadow-xl">
                                              <div className="flex items-center justify-between border-b pb-1.5">
                                                <div className="font-semibold text-sm">Rate Breakdown</div>
                                                {item.apiSku && (
                                                  <Badge variant="outline" className="text-[10px] font-mono max-w-[130px] truncate px-1.5 py-0">
                                                    {item.apiSku}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="space-y-1.5">
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">TASMAC New Rate:</span>
                                                  <span className="font-mono font-semibold text-foreground">
                                                    ₹{item.itemPrice.toFixed(4)}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">Product Master Price:</span>
                                                  <span className="font-mono font-medium">
                                                    {hasMasterPrice ? `₹${masterPrice.toFixed(2)}` : 'Not Set'}
                                                  </span>
                                                </div>
                                                {hasSignificantDiff && (
                                                  <div className="flex justify-between gap-4 pt-1 border-t border-dashed">
                                                    <span className="text-muted-foreground">Difference:</span>
                                                    <span className={cn("font-mono font-semibold", priceDiff > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                                                      {priceDiff > 0 ? `+₹${priceDiff.toFixed(2)} (+${percentDiff.toFixed(2)}%)` : `-₹${Math.abs(priceDiff).toFixed(2)} (${percentDiff.toFixed(2)}%)`}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="pt-2 border-t">
                                                <Button
                                                  size="sm"
                                                  className="w-full h-8 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
                                                  disabled={updatingPriceIndex === index || !item.apiSku}
                                                  onClick={() => handleUpdatePurchasePrice(item, index)}
                                                >
                                                  {updatingPriceIndex === index ? (
                                                    <>
                                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                      Updating Price...
                                                    </>
                                                  ) : (
                                                    <>
                                                      <RefreshCw className="h-3.5 w-3.5" />
                                                      Update Price
                                                    </>
                                                  )}
                                                </Button>
                                                {!item.apiSku && (
                                                  <p className="text-[10px] text-destructive text-center mt-1">
                                                    Select/match SKU first to update price
                                                  </p>
                                                )}
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">{item.totalValue}</TableCell>
                                      <TableCell>
                                          <div className="flex flex-col gap-1 items-start">
                                              <Badge variant={item.matchStatus === 'found' ? 'default' : 'destructive'} className={item.matchStatus === 'found' ? 'bg-green-600' : ''}>
                                                  {item.matchStatus === 'found' ? 'Found' : 'Not Found'}
                                              </Badge>
                                              {hasSignificantDiff && (
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    "text-[10px] px-1.5 py-0 font-medium whitespace-nowrap",
                                                    priceDiff > 0
                                                      ? "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                                                      : "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                                                  )}
                                                >
                                                  {priceDiff > 0 ? `▲ Price Up` : `▼ Price Down`}
                                                </Badge>
                                              )}
                                          </div>
                                      </TableCell>
                                  </TableRow>
                                  );
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-4 font-bold text-lg">
                    <div className="flex flex-wrap justify-between items-center w-full gap-4">
                        <div className="flex gap-8">
                            <div>
                                Total Cases: {totalQty.toFixed(2)}
                            </div>
                            <div>
                                Total Value: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalValue)}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="space-y-2 text-base">
                                <Label htmlFor="actual-bill-value">Actual Bill Value</Label>
                                <Input
                                    id="actual-bill-value"
                                    type="number"
                                    placeholder="Enter actual value"
                                    value={actualBillValue}
                                    onChange={(e) => setActualBillValue(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-48"
                                />
                             </div>
                             <div className="text-base">
                                <div>Difference</div>
                                 <div className={cn("font-bold", difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : '')}>
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(difference)}
                                </div>
                             </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 w-full">
                         <Button onClick={handleSubmitPurchase} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Purchase'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
            );
          })()}

        </div>
      </main>
    </div>
  );
}

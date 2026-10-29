'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { useUserStore, isShopThree, syncAccountInfo } from '@/app/lib/user-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Play,
  Pause,
  Square,
  Download,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Key,
  Layers,
  FileSpreadsheet,
  Filter,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  PackageCheck,
  Building2,
  Calendar,
  Hash,
  Warehouse,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

interface IndentItem {
  srNo: string;
  brandName: string;
  packSize: string;
  rate: string;
  qty: string;
  addedValue: string;
  amount: string;
}

interface ScanResult {
  indentOrderId: number;
  success: boolean;
  indentDate: string;
  licensee: string;
  indentNumber: string;
  depot: string;
  licenseNo: string;
  netAmount: string;
  itemCount: number;
  items: IndentItem[];
  error?: string;
  statusCode?: number;
  timestamp: string;
}

const COOKIE_STORAGE_KEY = 'tasmac_scanner_cookie';

export default function TasmacScannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { shopNumber, shopName } = useUserStore();
  const [isVerifyingAccess, setIsVerifyingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Check shop number permission on mount
  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      if (!token) {
        router.replace('/login');
        return;
      }

      // Check current in-memory / persisted state first
      if (isShopThree(shopNumber, shopName)) {
        if (isMounted) {
          setHasAccess(true);
          setIsVerifyingAccess(false);
        }
        return;
      }

      // Sync latest account info from API if not already verified
      const accountData = await syncAccountInfo(token);
      if (!isMounted) return;

      const currentShopNum = accountData?.shopNumber ?? useUserStore.getState().shopNumber;
      const currentShopName = accountData?.shopName ?? useUserStore.getState().shopName;
      const allowed = isShopThree(currentShopNum, currentShopName);

      if (allowed) {
        setHasAccess(true);
        setIsVerifyingAccess(false);
      } else {
        setHasAccess(false);
        setIsVerifyingAccess(false);
        toast({
          variant: 'destructive',
          title: 'Access Restricted',
          description: 'TASMAC Scanner is only accessible if Shop Number is 3.',
        });
        router.replace('/');
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [shopNumber, shopName, router, toast]);

  // Inputs
  const [cookie, setCookie] = useState('');
  const [startOrderId, setStartOrderId] = useState<number>(140700);
  const [scanCount, setScanCount] = useState<number>(500);
  const [scanMode, setScanMode] = useState<'count' | 'range'>('count');
  const [endOrderId, setEndOrderId] = useState<number>(140750);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [filterLicensee, setFilterLicensee] = useState<string>('');
  const [batchSize, setBatchSize] = useState<number>(5);
  const [delayMs, setDelayMs] = useState<number>(300); // 300ms Safe pacing delay
  const [autoStopOnEmpty, setAutoStopOnEmpty] = useState<boolean>(true);
  const [consecutiveEmptyLimit, setConsecutiveEmptyLimit] = useState<number>(5);
  const [lastFoundOrderId, setLastFoundOrderId] = useState<number | null>(null);
  const [lastScannedOrderId, setLastScannedOrderId] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState<string | null>(null);
  const [selectedDepot, setSelectedDepot] = useState<string>('all');
  const [reportView, setReportView] = useState<'table' | 'depot-summary'>('table');

  // Execution states
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [totalToProcess, setTotalToProcess] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);

  // Results
  const [results, setResults] = useState<ScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Table filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [hideErrors, setHideErrors] = useState(false);
  const [showOnlyMatchingLicensee, setShowOnlyMatchingLicensee] = useState(false);

  // Refs for scan loop control
  const stopRequestedRef = useRef(false);
  const pauseRequestedRef = useRef(false);

  // Load saved cookie on mount
  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (saved) {
      setCookie(saved);
    }
  }, []);

  const handleSaveCookie = () => {
    localStorage.setItem(COOKIE_STORAGE_KEY, cookie.trim());
    toast({
      title: 'Cookie Saved',
      description: 'Your TASMAC cookie header has been saved in local browser storage.',
    });
  };

  const handleClearCookie = () => {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    setCookie('');
    toast({
      title: 'Cookie Cleared',
      description: 'Saved cookie removed.',
    });
  };

  // Generate the queue of IDs
  const generateQueue = (): number[] => {
    const queue: number[] = [];
    if (scanMode === 'range') {
      const start = Math.min(startOrderId, endOrderId);
      const end = Math.max(startOrderId, endOrderId);
      if (direction === 'asc') {
        for (let i = start; i <= end; i++) queue.push(i);
      } else {
        for (let i = end; i >= start; i--) queue.push(i);
      }
    } else {
      const count = Math.max(1, Math.min(scanCount, 2000));
      for (let i = 0; i < count; i++) {
        queue.push(direction === 'asc' ? startOrderId + i : startOrderId - i);
      }
    }
    return queue;
  };

  const [isTestingSingle, setIsTestingSingle] = useState(false);

  const testSingleOrder = async () => {
    if (!cookie.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Cookie',
        description: 'Please paste your TASMAC Cookie header before testing.',
      });
      return;
    }

    setIsTestingSingle(true);
    localStorage.setItem(COOKIE_STORAGE_KEY, cookie.trim());

    try {
      const res = await fetch('/api/tasmac-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookie: cookie.trim(),
          singleOrderId: startOrderId,
        }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item: ScanResult = {
          ...data.results[0],
          timestamp: new Date().toLocaleTimeString(),
        };
        setLastScannedOrderId(startOrderId);
        setResults((prev) => [item, ...prev.filter((r) => r.indentOrderId !== item.indentOrderId)]);
        if (item.success) {
          setLastFoundOrderId(startOrderId);
          toast({
            title: `Success! Indent #${startOrderId} Found`,
            description: `${item.licensee || 'Licensee'} - ${item.indentDate || ''}`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: `Failed to fetch #${startOrderId}`,
            description: item.error || 'Server returned an error',
          });
        }
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: err.message,
      });
    } finally {
      setIsTestingSingle(false);
    }
  };

  const startScan = async () => {
    if (!cookie.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Cookie',
        description: 'Please paste your TASMAC Cookie header before scanning.',
      });
      return;
    }

    const queue = generateQueue();
    if (queue.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Range',
        description: 'Please specify a valid start order ID and count.',
      });
      return;
    }

    // Save cookie automatically
    localStorage.setItem(COOKIE_STORAGE_KEY, cookie.trim());

    setIsScanning(true);
    setIsPaused(false);
    stopRequestedRef.current = false;
    pauseRequestedRef.current = false;

    setTotalToProcess(queue.length);
    setProcessedCount(0);
    setProgressPercent(0);

    toast({
      title: 'Scanning Started',
      description: `Iterating ${queue.length} order IDs starting from #${queue[0]}...`,
    });

    let processed = 0;
    let consecutiveEmpty = 0;
    let autoStopped = false;
    let localLastValid: number | null = lastFoundOrderId;
    const chunkSize = Math.max(1, Math.min(batchSize, 10));
    setStopReason(null);

    for (let i = 0; i < queue.length; i += chunkSize) {
      // Check if user stopped
      if (stopRequestedRef.current) {
        toast({
          title: 'Scan Stopped',
          description: `Stopped by user after processing ${processed} of ${queue.length} orders.`,
        });
        break;
      }

      // Check if user paused
      while (pauseRequestedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
        if (stopRequestedRef.current) break;
      }
      if (stopRequestedRef.current) break;

      const batchIds = queue.slice(i, i + chunkSize);
      setCurrentOrderId(batchIds[0]);
      setLastScannedOrderId(batchIds[batchIds.length - 1]);

      try {
        const res = await fetch('/api/tasmac-scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cookie: cookie.trim(),
            orderIds: batchIds,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.results)) {
          const newResults: ScanResult[] = data.results.map((r: any) => ({
            ...r,
            timestamp: new Date().toLocaleTimeString(),
          }));

          setResults((prev) => {
            // Avoid duplicate IDs in state by updating or prepending
            const existingIds = new Set(newResults.map((nr) => nr.indentOrderId));
            const filteredPrev = prev.filter((item) => !existingIds.has(item.indentOrderId));
            return [...newResults, ...filteredPrev];
          });

          processed += batchIds.length;
          setProcessedCount(processed);
          setProgressPercent(Math.round((processed / queue.length) * 100));

          // Check consecutive empty / redirected results
          for (const item of newResults) {
            setLastScannedOrderId(item.indentOrderId);
            if (item.success) {
              consecutiveEmpty = 0;
              localLastValid = item.indentOrderId;
              setLastFoundOrderId(item.indentOrderId);
            } else {
              consecutiveEmpty++;
              if (autoStopOnEmpty && consecutiveEmpty >= consecutiveEmptyLimit) {
                autoStopped = true;
                break;
              }
            }
          }

          if (autoStopped) {
            const lastScanned = batchIds[batchIds.length - 1];
            const reason = `Auto-stopped: Encountered ${consecutiveEmpty} consecutive empty/redirected IDs. Last index scanned: #${lastScanned}. Last valid indent found was #${localLastValid ?? 'N/A'}.`;
            setStopReason(reason);
            toast({
              title: 'Auto-Stopped (End Reached)',
              description: reason,
            });
            break;
          }

          if (data.sessionExpired) {
            toast({
              variant: 'destructive',
              title: 'TASMAC Session Expired!',
              description:
                'TASMAC redirected with permission error. Please log in to TASMAC again and paste your new cookie.',
            });
            break;
          }
        } else {
          // Batch level error
          const errorMsg = data.error || 'Server error';
          const failedResults: ScanResult[] = batchIds.map((id) => ({
            indentOrderId: id,
            success: false,
            indentDate: '',
            licensee: '',
            indentNumber: '',
            depot: '',
            licenseNo: '',
            netAmount: '',
            itemCount: 0,
            items: [],
            error: errorMsg,
            timestamp: new Date().toLocaleTimeString(),
          }));

          setResults((prev) => [...failedResults, ...prev]);
          processed += batchIds.length;
          setProcessedCount(processed);
          setProgressPercent(Math.round((processed / queue.length) * 100));
          setLastScannedOrderId(batchIds[batchIds.length - 1]);

          consecutiveEmpty += batchIds.length;
          if (autoStopOnEmpty && consecutiveEmpty >= consecutiveEmptyLimit) {
            autoStopped = true;
            const reason = `Auto-stopped: Encountered ${consecutiveEmpty} consecutive empty/failed IDs. Last index scanned was #${batchIds[batchIds.length - 1]}.`;
            setStopReason(reason);
            toast({
              title: 'Auto-Stopped',
              description: reason,
            });
            break;
          }
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Network fetch failed';
        const failedResults: ScanResult[] = batchIds.map((id) => ({
          indentOrderId: id,
          success: false,
          indentDate: '',
          licensee: '',
          indentNumber: '',
          depot: '',
          licenseNo: '',
          netAmount: '',
          itemCount: 0,
          items: [],
          error: errorMsg,
          timestamp: new Date().toLocaleTimeString(),
        }));
        setResults((prev) => [...failedResults, ...prev]);
        processed += batchIds.length;
        setProcessedCount(processed);
        setProgressPercent(Math.round((processed / queue.length) * 100));
        setLastScannedOrderId(batchIds[batchIds.length - 1]);
      }

      // Pacing delay between batches to protect session from server rate limits
      await new Promise((r) => setTimeout(r, Math.max(50, delayMs)));
    }

    setIsScanning(false);
    setIsPaused(false);
    setCurrentOrderId(null);

    if (!autoStopped && !stopRequestedRef.current) {
      toast({
        title: 'Scan Finished',
        description: `Completed processing ${processed} orders. Last scanned index: #${queue[processed - 1] ?? queue[queue.length - 1]}. Found ${results.filter((r) => r.success).length} valid indents.`,
      });
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      pauseRequestedRef.current = false;
      setIsPaused(false);
      toast({ title: 'Resumed', description: 'Scanner resumed.' });
    } else {
      pauseRequestedRef.current = true;
      setIsPaused(true);
      toast({ title: 'Paused', description: 'Scanner paused. Click Resume to continue.' });
    }
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    pauseRequestedRef.current = false;
    setIsScanning(false);
    setIsPaused(false);
    setCurrentOrderId(null);
  };

  // Filtered results for display
  const displayedResults = useMemo(() => {
    return results.filter((item) => {
      if (hideErrors && !item.success) return false;

      // Filter by selected depot
      if (selectedDepot !== 'all') {
        const itemDepot = (item.depot || '').trim().toLowerCase();
        if (itemDepot !== selectedDepot.trim().toLowerCase()) {
          return false;
        }
      }

      if (showOnlyMatchingLicensee && filterLicensee.trim()) {
        const filterLower = filterLicensee.trim().toLowerCase();
        if (!item.licensee.toLowerCase().includes(filterLower)) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = item.indentOrderId.toString().includes(term);
        const matchesDate = item.indentDate.toLowerCase().includes(term);
        const matchesLicensee = item.licensee.toLowerCase().includes(term);
        const matchesIndentNo = item.indentNumber.toLowerCase().includes(term);
        const matchesDepot = item.depot.toLowerCase().includes(term);
        return matchesId || matchesDate || matchesLicensee || matchesIndentNo || matchesDepot;
      }

      return true;
    });
  }, [results, hideErrors, selectedDepot, showOnlyMatchingLicensee, filterLicensee, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = total - successful;
    const matchingLicenseeCount = filterLicensee.trim()
      ? results.filter(
          (r) =>
            r.success &&
            r.licensee.toLowerCase().includes(filterLicensee.trim().toLowerCase())
        ).length
      : 0;
    return { total, successful, failed, matchingLicenseeCount };
  }, [results, filterLicensee]);

  // Depot-wise aggregated statistics
  const depotStats = useMemo(() => {
    const map = new Map<
      string,
      {
        depot: string;
        count: number;
        totalAmount: number;
        itemCount: number;
        licensees: string[];
      }
    >();

    results.forEach((r) => {
      if (r.success) {
        const dName = (r.depot || '').trim() || 'Unknown Depot';
        const existing = map.get(dName) || {
          depot: dName,
          count: 0,
          totalAmount: 0,
          itemCount: 0,
          licensees: [],
        };

        existing.count += 1;
        const numAmt = parseFloat((r.netAmount || '0').replace(/,/g, '')) || 0;
        existing.totalAmount += numAmt;
        existing.itemCount += r.itemCount || 0;
        if (r.licensee && !existing.licensees.includes(r.licensee)) {
          existing.licensees.push(r.licensee);
        }

        map.set(dName, existing);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [results]);

  // Export to CSV
  const exportToCSV = () => {
    if (displayedResults.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'No results to export.',
      });
      return;
    }

    const headers = [
      'Indent Order ID',
      'Indent Date',
      "Licensee's Name",
      'Indent Number',
      'Depot',
      'License No',
      'Net Amount',
      'Items Count',
      'Status',
    ];

    const rows = displayedResults.map((r) => [
      r.indentOrderId,
      `"${r.indentDate || ''}"`,
      `"${(r.licensee || '').replace(/"/g, '""')}"`,
      `"${r.indentNumber || ''}"`,
      `"${(r.depot || '').replace(/"/g, '""')}"`,
      `"${(r.licenseNo || '').replace(/"/g, '""')}"`,
      `"${r.netAmount || ''}"`,
      r.itemCount,
      r.success ? 'Success' : `Error: ${r.error || 'Failed'}`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileName =
      selectedDepot !== 'all'
        ? `tasmac_indents_depot_${selectedDepot}_${Date.now()}.csv`
        : `tasmac_indents_${Date.now()}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exported CSV',
      description: `Exported ${displayedResults.length} rows to ${fileName}.`,
    });
  };

  // Export Depot Wise Aggregated Summary CSV
  const exportDepotSummaryCSV = () => {
    if (depotStats.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'No depot data found to export.',
      });
      return;
    }

    const headers = [
      'Depot Name / Code',
      'Total Indents',
      'Total Net Amount (₹)',
      'Total Product Items',
      'Licensees Count',
      'Licensees List',
    ];

    const rows = depotStats.map((d) => [
      `"${d.depot}"`,
      d.count,
      Math.round(d.totalAmount),
      d.itemCount,
      d.licensees.length,
      `"${d.licensees.join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasmac_depot_summary_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exported Depot Summary',
      description: `Exported summary for ${depotStats.length} depots.`,
    });
  };

  // Copy TSV of selected indent to clipboard for purchase page
  const copyTSVForPurchase = (indent: ScanResult) => {
    if (!indent.items || indent.items.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Items',
        description: 'This indent does not have any product items.',
      });
      return;
    }

    const tsvLines = indent.items.map(
      (item) =>
        `${item.srNo}\t${item.brandName}\t${item.packSize}\t${item.rate}\t${item.qty}\t${item.addedValue}\t${item.amount}`
    );
    tsvLines.unshift('Sr.No\tBrand Name\tPack Size\tRate\tQty\tAdded Value\tAmount');
    const tsvData = tsvLines.join('\n');

    navigator.clipboard.writeText(tsvData);
    toast({
      title: 'TSV Copied to Clipboard',
      description: `Copied ${indent.items.length} items from Indent ${indent.indentNumber || indent.indentOrderId}. You can paste directly into the Purchase page!`,
    });
  };

  if (isVerifyingAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm font-medium">Verifying shop permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Card className="max-w-md w-full text-center p-6 space-y-4 shadow-lg border-destructive/30">
            <CardHeader className="space-y-2 pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">Access Restricted</CardTitle>
              <CardDescription className="text-sm">
                TASMAC Scanner is only available for Shop Number 3. Redirecting you to the dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.replace('/')} variant="default" className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Page Title & Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layers className="h-6 w-6" />
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight">TASMAC Indent Scanner</h1>
              <Badge variant="outline" className="border-primary/50 text-primary font-semibold">
                OTP Bypass Mode
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Iterate and fetch TASMAC indents sequentially by <code>indentOrderId</code> using your active session cookie.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild size="sm">
              <Link href="/purchase">
                <ArrowRight className="h-4 w-4 mr-1.5" />
                Go to Purchase Page
              </Link>
            </Button>
          </div>
        </div>

        {/* Configuration Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Session Authentication & Scan Parameters
                </CardTitle>
                <CardDescription>
                  Paste your browser cookie and set the starting ID to scan sequential indents.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {cookie && (
                  <Button variant="ghost" size="sm" onClick={handleClearCookie} className="text-muted-foreground hover:text-destructive">
                    Clear Cookie
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleSaveCookie}>
                  Save Cookie
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Cookie Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cookie-input" className="font-semibold text-xs flex items-center gap-1.5">
                  TASMAC Cookie Header
                  <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  (Includes .AspNetCore.Cookies, TASMAC, .AspNetCore.Antiforgery)
                </span>
              </div>
              <Textarea
                id="cookie-input"
                placeholder="Paste Cookie string here (from DevTools -> Network -> StockTransfer -> Request Headers -> Cookie)..."
                rows={3}
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {/* Range & Loop Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="start-id" className="text-xs font-semibold flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    Start Indent ID
                  </Label>
                  {lastFoundOrderId && (
                    <button
                      type="button"
                      onClick={() => setStartOrderId(lastFoundOrderId + 1)}
                      className="text-[10px] text-primary hover:underline font-mono"
                      title="Set to next ID after last valid indent"
                    >
                      Next: #{lastFoundOrderId + 1}
                    </button>
                  )}
                </div>
                <Input
                  id="start-id"
                  type="number"
                  value={startOrderId}
                  onChange={(e) => setStartOrderId(Number(e.target.value))}
                  placeholder="e.g. 140700"
                  className="font-medium"
                  disabled={isScanning}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scan-count" className="text-xs font-semibold flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  Orders to Pull
                </Label>
                <Input
                  id="scan-count"
                  type="number"
                  min={1}
                  max={2000}
                  value={scanCount}
                  onChange={(e) => setScanCount(Math.max(1, Number(e.target.value)))}
                  placeholder="e.g. 500"
                  className="font-medium"
                  disabled={isScanning}
                />
                <div className="flex gap-1 pt-0.5">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isScanning}
                      onClick={() => setScanCount(preset)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        scanCount === preset
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Scan Direction</Label>
                <div className="flex rounded-md border border-input p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setDirection('asc')}
                    disabled={isScanning}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                      direction === 'asc' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Next (+1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('desc')}
                    disabled={isScanning}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                      direction === 'desc' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Prev (-1)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batch-size" className="text-xs font-semibold">
                  Batch Concurrency
                </Label>
                <Input
                  id="batch-size"
                  type="number"
                  min={1}
                  max={10}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="font-medium"
                  disabled={isScanning}
                />
                <span className="text-[10px] text-muted-foreground">3–5 recommended</span>
              </div>

              {/* Speed & Stealth Pacing Delay */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pacing-delay" className="text-xs font-semibold flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-emerald-600" />
                    Speed & Stealth Delay
                  </Label>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 font-semibold">
                    Anti-Ban
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {[
                    { label: 'Fast', ms: 150 },
                    { label: 'Safe', ms: 300 },
                    { label: 'Gentle', ms: 600 },
                  ].map((speed) => (
                    <button
                      key={speed.ms}
                      type="button"
                      disabled={isScanning}
                      onClick={() => setDelayMs(speed.ms)}
                      className={`flex-1 text-[11px] py-1.5 px-1 rounded border font-medium transition-colors ${
                        delayMs === speed.ms
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                      title={`${speed.ms}ms pause between batches`}
                    >
                      {speed.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Current: <strong>{delayMs}ms</strong></span>
                  <span>~{Math.round(((scanCount / Math.max(1, batchSize)) * (delayMs + 180)) / 1000)}s total</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-licensee" className="text-xs font-semibold flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Target Licensee (Optional)
                </Label>
                <Input
                  id="filter-licensee"
                  value={filterLicensee}
                  onChange={(e) => setFilterLicensee(e.target.value)}
                  placeholder="e.g. Ambica Empire"
                />
              </div>
            </div>

            {/* Auto-Stop on Continuous Empty Indents */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border bg-card/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-stop-toggle"
                    checked={autoStopOnEmpty}
                    onCheckedChange={setAutoStopOnEmpty}
                    disabled={isScanning}
                  />
                  <Label htmlFor="auto-stop-toggle" className="text-xs font-semibold cursor-pointer">
                    Auto-Stop on Continuous Empty / Redirected Indents
                  </Label>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    Recommended
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground pl-12">
                  If TASMAC returns continuous redirects (no indents exist past that index), automatically halts without scanning all remaining IDs.
                </p>
              </div>

              {autoStopOnEmpty && (
                <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                  <span className="text-xs text-muted-foreground">Stop after</span>
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={consecutiveEmptyLimit}
                    onChange={(e) => setConsecutiveEmptyLimit(Math.max(2, Math.min(20, Number(e.target.value))))}
                    className="w-16 h-8 text-xs font-bold text-center"
                    disabled={isScanning}
                  />
                  <span className="text-xs text-muted-foreground">empty in a row</span>
                </div>
              )}
            </div>

            {/* Quick Helper Tip */}
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground flex items-start gap-2 border">
              <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong>How to get fresh Cookie:</strong> In your browser where TASMAC is logged in, open Developer Tools (<kbd className="bg-background px-1 py-0.5 rounded border">F12</kbd>), click the <strong>Network</strong> tab, refresh or click Stock Transfer, click any request to <code>excise.tasmace2e.in</code>, scroll down to <strong>Request Headers</strong>, copy the entire <strong>Cookie</strong> value and paste it above.
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10">
            <div className="flex items-center gap-2">
              {!isScanning ? (
                <>
                  <Button onClick={startScan} className="gap-2 shadow-sm">
                    <Play className="h-4 w-4 fill-current" />
                    Execute Scan ({scanCount} Orders)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={testSingleOrder}
                    disabled={isTestingSingle}
                    className="gap-2"
                  >
                    {isTestingSingle ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    Test Single ID (#{startOrderId})
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handlePauseResume} className="gap-2">
                    {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button variant="destructive" onClick={handleStop} className="gap-2">
                    <Square className="h-4 w-4 fill-current" />
                    Stop
                  </Button>
                </>
              )}

              {results.length > 0 && !isScanning && (
                <Button variant="ghost" size="sm" onClick={() => setResults([])} className="text-muted-foreground">
                  Clear Table
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={displayedResults.length === 0}
                className="gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Auto-Stop / Scan Stopped Banner */}
        {stopReason && (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Scanner Automatically Halted</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stopReason}</div>
              </div>
            </div>
            {lastFoundOrderId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartOrderId(lastFoundOrderId + 1);
                  setStopReason(null);
                  toast({
                    title: 'Start ID Updated',
                    description: `Start Indent ID set to #${lastFoundOrderId + 1}`,
                  });
                }}
                className="shrink-0 text-xs bg-background shadow-xs hover:bg-muted"
              >
                Set Next Start ID to #{lastFoundOrderId + 1}
              </Button>
            )}
          </div>
        )}

        {/* Live Progress Card (Active during scanning) */}
        {isScanning && (
          <Card className="border-primary/40 bg-primary/5 shadow-sm animate-pulse-subtle">
            <CardContent className="pt-6 pb-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <span>
                    Scanning order ID: <span className="font-mono text-primary font-bold">#{currentOrderId}</span>
                  </span>
                  {isPaused && <Badge variant="secondary">Paused</Badge>}
                </div>
                <div className="text-muted-foreground text-xs font-mono">
                  {processedCount} of {totalToProcess} ({progressPercent}%)
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Summary Stat Badges */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <Card className="p-3.5 flex items-center gap-3 shadow-xs">
              <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Total Scanned</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </Card>

            <Card className="p-3.5 flex items-center gap-3 shadow-xs">
              <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Valid Indents</p>
                <p className="text-xl font-bold text-emerald-600">{stats.successful}</p>
              </div>
            </Card>

            {/* LAST INDEX SCANNED (Prominent) */}
            <Card className="p-3.5 flex flex-col justify-between border-primary/40 bg-primary/5 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-primary uppercase font-bold tracking-wider">
                  Last Index Scanned
                </span>
                <Hash className="h-4 w-4 text-primary opacity-70" />
              </div>
              <div className="my-1 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black font-mono text-primary">
                  {lastScannedOrderId ? `#${lastScannedOrderId}` : '-'}
                </span>
                {lastScannedOrderId && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartOrderId(lastScannedOrderId + 1);
                      toast({
                        title: 'Start ID Updated',
                        description: `Start Indent ID set to #${lastScannedOrderId + 1}`,
                      });
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Set Next: #{lastScannedOrderId + 1}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Last Valid Indent: <strong className="text-emerald-600 font-mono">#{lastFoundOrderId ?? 'None'}</strong>
              </p>
            </Card>

            {/* DEPOTS ACTIVE */}
            <Card
              className="p-3.5 flex items-center gap-3 shadow-xs cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setReportView(reportView === 'depot-summary' ? 'table' : 'depot-summary')}
              title="Click to toggle Depot Wise Report"
            >
              <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Depots Found</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{depotStats.length}</p>
                  <span className="text-[10px] text-muted-foreground">Depots</span>
                </div>
              </div>
            </Card>

            <Card className="p-3.5 flex items-center gap-3 shadow-xs">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Empty / Redirect</p>
                <p className="text-xl font-bold text-muted-foreground">{stats.failed}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Results Section */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {reportView === 'depot-summary' ? 'Depot Wise Indent Report' : 'Scanned Indents Table'}
                  </CardTitle>
                  {selectedDepot !== 'all' && (
                    <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                      Depot: {selectedDepot}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {reportView === 'depot-summary'
                    ? `Breakdown of ${depotStats.length} depots with total indents, values, and item counts.`
                    : `Showing ${displayedResults.length} of ${results.length} scanned indents.`}
                </CardDescription>
              </div>

              {/* View Switcher, Depot Selector & Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View switcher tabs */}
                <div className="flex rounded-md border border-input p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setReportView('table')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      reportView === 'table'
                        ? 'bg-background shadow-xs text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Indents List
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportView('depot-summary')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                      reportView === 'depot-summary'
                        ? 'bg-background shadow-xs text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Depot Report</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {depotStats.length}
                    </Badge>
                  </button>
                </div>

                {/* Depot Selector Dropdown */}
                {depotStats.length > 0 && (
                  <div className="w-40">
                    <Select value={selectedDepot} onValueChange={setSelectedDepot}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Depots" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Depots ({stats.successful})</SelectItem>
                        {depotStats.map((d) => (
                          <SelectItem key={d.depot} value={d.depot}>
                            Depot {d.depot} ({d.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Search */}
                <div className="relative w-40 sm:w-52">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search licensee, ID, depot..."
                    className="pl-8 h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Button
                  variant={hideErrors ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setHideErrors(!hideErrors)}
                  className="text-xs h-9"
                >
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  {hideErrors ? 'Valid Only' : 'Show All'}
                </Button>

                {depotStats.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportDepotSummaryCSV}
                    className="text-xs h-9 gap-1"
                    title="Export aggregated depot summary report"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Depot CSV
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Depot Pills Filter */}
            {depotStats.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Warehouse className="h-3 w-3" />
                  Depot Filter:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepot('all');
                    setReportView('table');
                  }}
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                    selectedDepot === 'all'
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Depots ({stats.successful})
                </button>
                {depotStats.map((d) => (
                  <button
                    key={d.depot}
                    type="button"
                    onClick={() => {
                      setSelectedDepot(d.depot);
                      setReportView('table');
                    }}
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                      selectedDepot === d.depot
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>Depot {d.depot}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {d.count}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Depot Highlight Bar */}
            {selectedDepot !== 'all' && (
              <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground font-bold">
                    Depot: {selectedDepot}
                  </Badge>
                  <span className="font-semibold text-foreground">
                    {displayedResults.length} Indents found for this Depot
                  </span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground font-medium">
                  <span>
                    Total Amount:{' '}
                    <strong className="text-foreground font-semibold">
                      ₹
                      {displayedResults
                        .reduce((sum, r) => sum + (parseFloat((r.netAmount || '0').replace(/,/g, '')) || 0), 0)
                        .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                  <span>
                    Total Items:{' '}
                    <strong className="text-foreground font-semibold">
                      {displayedResults.reduce((sum, r) => sum + (r.itemCount || 0), 0)}
                    </strong>
                  </span>
                  <button
                    onClick={() => setSelectedDepot('all')}
                    className="text-primary hover:underline font-semibold"
                  >
                    Reset Depot Filter
                  </button>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {reportView === 'depot-summary' ? (
              /* DEPOT-WISE AGGREGATED SUMMARY REPORT TABLE */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="font-bold">Depot Name / Code</TableHead>
                      <TableHead className="text-center font-bold">Total Indents</TableHead>
                      <TableHead className="text-right font-bold">Total Net Value (₹)</TableHead>
                      <TableHead className="text-center font-bold">Product Items</TableHead>
                      <TableHead className="font-bold">Licensees ({stats.successful} total)</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depotStats.map((d, idx) => (
                      <TableRow key={d.depot} className="hover:bg-muted/50">
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-primary" />
                            <span>Depot {d.depot}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">
                            {d.count} Indents
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                          ₹{Math.round(d.totalAmount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {d.itemCount}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={d.licensees.join(', ')}>
                          {d.licensees.join(', ')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setSelectedDepot(d.depot);
                              setReportView('table');
                            }}
                          >
                            View Indents ({d.count})
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : displayedResults.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">No Indent Results Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {results.length === 0
                    ? 'Configure your starting Indent Order ID and click "Execute Scan" to fetch records from TASMAC.'
                    : 'No records match your active search or filters.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="font-bold">Indent Order ID</TableHead>
                      <TableHead className="font-bold">Indent Date</TableHead>
                      <TableHead className="font-bold">Licensee&apos;s Name</TableHead>
                      <TableHead>Indent Number</TableHead>
                      <TableHead>Depot</TableHead>
                      <TableHead className="text-right">Net Amount (₹)</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedResults.map((row, index) => {
                      const isMatchingLicensee =
                        filterLicensee &&
                        row.licensee.toLowerCase().includes(filterLicensee.toLowerCase());

                      return (
                        <TableRow
                          key={row.indentOrderId}
                          className={isMatchingLicensee ? 'bg-purple-500/5 hover:bg-purple-500/10' : ''}
                        >
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {index + 1}
                          </TableCell>

                          {/* Indent Order ID */}
                          <TableCell className="font-mono font-bold text-sm text-primary">
                            #{row.indentOrderId}
                          </TableCell>

                          {/* Indent Date */}
                          <TableCell className="whitespace-nowrap font-medium text-xs">
                            {row.indentDate ? (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {row.indentDate}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>

                          {/* Licensee's Name */}
                          <TableCell className="font-semibold text-sm">
                            {row.licensee ? (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{row.licensee}</span>
                                {isMatchingLicensee && (
                                  <Badge className="bg-purple-600 text-white text-[10px] py-0 px-1.5">
                                    Target Match
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>

                          {/* Indent Number */}
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.indentNumber || '-'}
                          </TableCell>

                          {/* Depot */}
                          <TableCell className="text-xs">
                            {row.depot || '-'}
                          </TableCell>

                          {/* Net Amount */}
                          <TableCell className="text-right font-mono font-semibold text-sm">
                            {row.netAmount ? `₹ ${row.netAmount}` : '-'}
                          </TableCell>

                          {/* Items Count */}
                          <TableCell className="text-center">
                            {row.itemCount > 0 ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {row.itemCount}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            {row.success ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px]">
                                Found
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-rose-300 text-rose-600 text-[11px]">
                                {row.error || 'Empty'}
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.success && row.items.length > 0 && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedResult(row);
                                      setIsDetailDialogOpen(true);
                                    }}
                                    className="h-8 px-2 text-xs"
                                    title="View Products List"
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    View
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyTSVForPurchase(row)}
                                    className="h-8 px-2 text-xs"
                                    title="Copy TSV to paste into Purchase page"
                                  >
                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                    Copy TSV
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Indent Items Modal */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <PackageCheck className="h-5 w-5 text-primary" />
                Indent #{selectedResult?.indentOrderId} Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedResult?.licensee} &bull; Indent Number: {selectedResult?.indentNumber} &bull; Date: {selectedResult?.indentDate}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-muted">
                  <span className="text-muted-foreground">Depot:</span>
                  <div className="font-semibold">{selectedResult?.depot || 'N/A'}</div>
                </div>
                <div className="p-2 rounded bg-muted">
                  <span className="text-muted-foreground">License No:</span>
                  <div className="font-semibold">{selectedResult?.licenseNo || 'N/A'}</div>
                </div>
                <div className="p-2 rounded bg-muted">
                  <span className="text-muted-foreground">Items:</span>
                  <div className="font-semibold">{selectedResult?.itemCount} products</div>
                </div>
                <div className="p-2 rounded bg-muted">
                  <span className="text-muted-foreground">Net Amount:</span>
                  <div className="font-semibold font-mono text-emerald-600">
                    ₹ {selectedResult?.netAmount || '0.00'}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="text-xs">
                      <TableHead className="w-12 text-center">Sr.No</TableHead>
                      <TableHead>Brand Name</TableHead>
                      <TableHead className="text-center">Pack Size</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-center">Qty (Cases.Bottle)</TableHead>
                      <TableHead className="text-right">Added Value</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedResult?.items.map((item, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="text-center font-mono">{item.srNo}</TableCell>
                        <TableCell className="font-medium">{item.brandName}</TableCell>
                        <TableCell className="text-center">{item.packSize}</TableCell>
                        <TableCell className="text-right font-mono">{item.rate}</TableCell>
                        <TableCell className="text-center font-mono font-semibold">{item.qty}</TableCell>
                        <TableCell className="text-right font-mono">{item.addedValue}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {item.amount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedResult && copyTSVForPurchase(selectedResult)}
                className="gap-1.5 text-xs"
              >
                <Copy className="h-4 w-4" />
                Copy TSV for Purchase Page
              </Button>
              <Button size="sm" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

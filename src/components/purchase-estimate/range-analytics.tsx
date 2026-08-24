'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Layers,
  Package,
  IndianRupee,
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Info,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export interface ProductMasterItem {
  SKU: string;
  stock: number;
  purchasePrice: number;
  range?: string;
  brand?: string;
  [key: string]: any;
}

export interface EstimateItem {
  SKU: string;
  totalSalesQty: number;
  avgSalesPerDay: number;
  estimatedQuantity: number;
  estInCase: number;
  purchasePrice: number;
  inHand: number;
}

interface RangeAnalyticsProps {
  productMaster: ProductMasterItem[];
  items?: EstimateItem[];
}

const RANGE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // purple-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
];

const getPackSize = (sku: string) => {
  const size = sku.toUpperCase();
  if (size.includes('180ML')) return 48;
  if (size.includes('375ML') || size.includes('200ML')) return 24;
  if (size.includes('750ML') || size.includes('650ML')) return 12;
  if (size.includes('1000ML')) return 9;
  if (size.includes('500ML') || size.includes('325ML')) return 24;
  return 1;
};

export default function RangeAnalytics({ productMaster, items = [] }: RangeAnalyticsProps) {
  const [metricMode, setMetricMode] = useState<'qty' | 'value'>('qty');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const hasEstimateData = items.length > 0;
  const [activeTab, setActiveTab] = useState<string>(hasEstimateData ? 'compare' : 'overview');

  useEffect(() => {
    if (items.length > 0) {
      setActiveTab('compare');
    }
  }, [items.length]);

  // Aggregated analytical data by Range
  const {
    rangeData,
    totalStock,
    totalStockCases,
    totalStockValue,
    totalEstCases,
    totalEstValue,
    totalEstBottles,
    topPriorityRange,
  } = useMemo(() => {
    if (!productMaster || productMaster.length === 0) {
      return {
        rangeData: [],
        totalStock: 0,
        totalStockCases: 0,
        totalStockValue: 0,
        totalEstCases: 0,
        totalEstValue: 0,
        totalEstBottles: 0,
        topPriorityRange: null,
      };
    }

    const estMap = new Map<string, { estInCase: number; estQty: number; purchasePrice: number }>();
    items.forEach((item) => {
      estMap.set(item.SKU, {
        estInCase: item.estInCase || 0,
        estQty: item.estimatedQuantity || 0,
        purchasePrice: item.purchasePrice || 0,
      });
    });

    const map = new Map<
      string,
      {
        rangeName: string;
        totalStock: number;
        totalStockCases: number;
        stockValue: number;
        skuCount: number;
        estCases: number;
        estBottles: number;
        estValue: number;
      }
    >();

    let overallStock = 0;
    let overallStockCases = 0;
    let overallStockValue = 0;
    let overallEstCases = 0;
    let overallEstValue = 0;
    let overallEstBottles = 0;

    productMaster.forEach((p) => {
      const rawRange = p.range && String(p.range).trim() ? String(p.range).trim().toUpperCase() : 'OTHER';
      const stock = Math.max(0, Number(p.stock) || 0);
      const price = Math.max(0, Number(p.purchasePrice) || 0);
      const packSize = getPackSize(p.SKU);
      const stockCases = stock / packSize;
      const value = stock * price;

      const estInfo = estMap.get(p.SKU);
      const estCase = estInfo?.estInCase || 0;
      const estBtl = estInfo?.estQty || estCase * packSize;
      const estVal = estBtl * (estInfo?.purchasePrice || price);

      overallStock += stock;
      overallStockCases += stockCases;
      overallStockValue += value;
      overallEstCases += estCase;
      overallEstValue += estVal;
      overallEstBottles += estBtl;

      if (!map.has(rawRange)) {
        map.set(rawRange, {
          rangeName: rawRange,
          totalStock: 0,
          totalStockCases: 0,
          stockValue: 0,
          skuCount: 0,
          estCases: 0,
          estBottles: 0,
          estValue: 0,
        });
      }

      const entry = map.get(rawRange)!;
      entry.totalStock += stock;
      entry.totalStockCases += stockCases;
      entry.stockValue += value;
      entry.skuCount += 1;
      entry.estCases += estCase;
      entry.estBottles += estBtl;
      entry.estValue += estVal;
    });

    const orderPriority = ['ORDINARY', 'MEDIUM', 'PREMIUM', 'SUPER PREMIUM', 'BEER', 'WINE', 'OTHER'];

    const dataList = Array.from(map.values()).map((item, idx) => {
      let recommendation: 'URGENT' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
      let recommendationLabel = 'Stock Adequate';

      if (item.estCases > 0) {
        if (item.totalStockCases === 0 || item.estCases >= item.totalStockCases * 1.5) {
          recommendation = 'URGENT';
          recommendationLabel = 'Urgent Purchase';
        } else if (item.estCases >= item.totalStockCases) {
          recommendation = 'HIGH';
          recommendationLabel = 'High Demand';
        } else {
          recommendation = 'MODERATE';
          recommendationLabel = 'Moderate Need';
        }
      }

      return {
        ...item,
        totalStockCasesRound: Math.round(item.totalStockCases),
        color: RANGE_COLORS[idx % RANGE_COLORS.length],
        percentStockQty: overallStock > 0 ? (item.totalStock / overallStock) * 100 : 0,
        percentStockValue: overallStockValue > 0 ? (item.stockValue / overallStockValue) * 100 : 0,
        percentEstCases: overallEstCases > 0 ? (item.estCases / overallEstCases) * 100 : 0,
        percentEstValue: overallEstValue > 0 ? (item.estValue / overallEstValue) * 100 : 0,
        recommendation,
        recommendationLabel,
      };
    });

    // Sort by stock quantity descending for overview
    dataList.sort((a, b) => b.totalStock - a.totalStock);

    // Find top range to purchase
    const sortedByEst = [...dataList].sort((a, b) => b.estCases - a.estCases);
    const topRange = sortedByEst.length > 0 && sortedByEst[0].estCases > 0 ? sortedByEst[0] : null;

    return {
      rangeData: dataList,
      totalStock: overallStock,
      totalStockCases: Math.round(overallStockCases),
      totalStockValue: overallStockValue,
      totalEstCases: overallEstCases,
      totalEstValue: overallEstValue,
      totalEstBottles: overallEstBottles,
      topPriorityRange: topRange,
    };
  }, [productMaster, items]);

  const formatCurrency = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const chartDataOverview = useMemo(() => {
    return rangeData.map((d) => ({
      name: d.rangeName,
      value: metricMode === 'qty' ? d.totalStock : Math.round(d.stockValue),
      stock: d.totalStock,
      stockVal: d.stockValue,
      estCases: d.estCases,
      color: d.color,
      percent: metricMode === 'qty' ? d.percentStockQty : d.percentStockValue,
    }));
  }, [rangeData, metricMode]);

  const compareChartData = useMemo(() => {
    return rangeData.map((d) => ({
      name: d.rangeName,
      inHandCases: Math.round(d.totalStockCases),
      estCases: d.estCases,
      estValue: d.estValue,
      color: d.color,
    }));
  }, [rangeData]);

  // Range breakdown sorted by estimated purchase cases
  const priorityRangeList = useMemo(() => {
    return [...rangeData].sort((a, b) => b.estCases - a.estCases);
  }, [rangeData]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-3 text-xs space-y-1 z-50">
          <div className="font-bold text-sm flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </div>
          <div>
            In-Hand Stock: <span className="font-semibold">{data.stock?.toLocaleString('en-IN')} btls</span>
          </div>
          <div>
            Stock Value: <span className="font-semibold">{formatCurrency(data.stockVal || 0)}</span>
          </div>
          {data.estCases > 0 && (
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border mt-1">
              Est. Purchase Need: {data.estCases} Cases
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomCompareTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground border rounded-lg shadow-md p-3 text-xs space-y-1.5 z-50">
          <div className="font-bold text-sm flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name} Range
          </div>
          <div className="flex justify-between items-center gap-4 text-blue-600 dark:text-blue-400 font-medium">
            <span>In-Hand Stock:</span>
            <span className="font-bold">{data.inHandCases} Cases</span>
          </div>
          <div className="flex justify-between items-center gap-4 text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Est. Purchase:</span>
            <span className="font-bold">{data.estCases} Cases</span>
          </div>
          {data.estValue > 0 && (
            <div className="text-muted-foreground text-[11px] pt-1 border-t">
              Est. Cost: <span className="font-semibold text-foreground">{formatCurrency(data.estValue)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Primary Header Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Range Analytics</CardTitle>
                <CardDescription className="text-xs">Stock & Purchase Need Comparison</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {rangeData.length} Ranges
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          {/* Quick Metrics Comparison Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/90 p-2.5 rounded-lg border">
              <div className="flex items-center text-muted-foreground gap-1 text-[11px] mb-0.5">
                <Package className="h-3 w-3 text-blue-500" />
                In-Hand Stock
              </div>
              <div className="text-sm font-bold text-foreground">
                {totalStockCases.toLocaleString('en-IN')}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">Cases</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{formatCurrency(totalStockValue)}</div>
            </div>

            <div className="bg-background/90 p-2.5 rounded-lg border">
              <div className="flex items-center text-muted-foreground gap-1 text-[11px] mb-0.5">
                <ShoppingBag className="h-3 w-3 text-emerald-500" />
                Est. Purchase
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {totalEstCases.toLocaleString('en-IN')}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">Cases</span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{formatCurrency(totalEstValue)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/60">
          <TabsTrigger value="compare" className="text-xs font-bold gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Stock vs Est. Need
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs font-semibold gap-1.5">
            <PieIcon className="h-3.5 w-3.5" />
            Stock Distribution
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Stock vs Estimate Comparison */}
        <TabsContent value="compare" className="space-y-4 pt-2">
          {/* Comparison Graphical Chart Card */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Range Comparison (Cases)
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Stock vs Estimate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="w-full h-48 pt-1">
                {productMaster.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                    <Info className="h-5 w-5 opacity-40" />
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip content={<CustomCompareTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                        iconSize={8}
                      />
                      <Bar dataKey="inHandCases" name="In-Hand Stock" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="estCases" name="Est. Purchase" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Purchasing Recommendations List */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Purchase Priority Breakdown</span>
                <span className="text-[10px] font-mono">{priorityRangeList.length} Ranges</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {priorityRangeList.map((rd) => {
                const isUrgent = rd.recommendation === 'URGENT';
                const isHigh = rd.recommendation === 'HIGH';
                const isMod = rd.recommendation === 'MODERATE';

                return (
                  <div
                    key={rd.rangeName}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rd.color }} />
                        <span className="font-bold text-foreground text-xs uppercase">{rd.rangeName}</span>
                      </div>
                      <Badge
                        variant={isUrgent ? 'destructive' : isHigh ? 'default' : isMod ? 'secondary' : 'outline'}
                        className="text-[10px] px-2 py-0.5 font-bold"
                      >
                        {rd.recommendationLabel}
                      </Badge>
                    </div>

                    {/* Stock vs Est Cases Comparison */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-muted/50">
                      <div>
                        <div className="text-[10px] text-muted-foreground">In-Hand Stock</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {rd.totalStockCasesRound} <span className="text-[10px] font-normal text-muted-foreground">Cases</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Est. Purchase Need</div>
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          {rd.estCases} <span className="text-[10px] font-normal text-muted-foreground">Cases</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Comparison Progress Bar */}
                    <div className="space-y-1 pt-0.5">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                        <span>Est. Cost: {formatCurrency(rd.estValue)}</span>
                        <span>{rd.percentEstCases.toFixed(1)}% of Order</span>
                      </div>
                      <Progress value={rd.percentEstCases} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Stock Distribution Overview */}
        <TabsContent value="overview" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock Distribution Chart
                </CardTitle>
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded text-[10px]">
                  <Button
                    variant={metricMode === 'qty' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setMetricMode('qty')}
                  >
                    Qty
                  </Button>
                  <Button
                    variant={metricMode === 'value' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setMetricMode('value')}
                  >
                    Value
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="w-full h-48 pt-1">
                {productMaster.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                    <Info className="h-5 w-5 opacity-40" />
                    No stock data available
                  </div>
                ) : chartType === 'pie' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataOverview}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartDataOverview.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataOverview} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip content={<CustomPieTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartDataOverview.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stock Breakdown List */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stock Share Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0 space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {rangeData.map((rd) => {
                const currentPercent = metricMode === 'qty' ? rd.percentStockQty : rd.percentStockValue;

                return (
                  <div
                    key={rd.rangeName}
                    className="p-2.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rd.color }} />
                        <span className="font-bold text-foreground text-xs">{rd.rangeName}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                        {rd.skuCount} SKUs
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-mono">
                        {rd.totalStock.toLocaleString('en-IN')} btls ({rd.totalStockCasesRound} Cases)
                      </span>
                      <span className="font-semibold text-foreground font-mono">{formatCurrency(rd.stockValue)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>Stock Share</span>
                        <span className="font-semibold">{currentPercent.toFixed(1)}%</span>
                      </div>
                      <Progress value={currentPercent} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

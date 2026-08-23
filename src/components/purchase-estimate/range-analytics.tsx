'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
} from 'recharts';
import { Layers, Package, IndianRupee, PieChart as PieIcon, BarChart3, TrendingUp, Info } from 'lucide-react';

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

export default function RangeAnalytics({ productMaster, items = [] }: RangeAnalyticsProps) {
  const [metricMode, setMetricMode] = useState<'qty' | 'value'>('qty');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Calculate aggregated stats by range
  const { rangeData, totalStock, totalValue, totalSkus } = useMemo(() => {
    if (!productMaster || productMaster.length === 0) {
      return { rangeData: [], totalStock: 0, totalValue: 0, totalSkus: 0 };
    }

    const map = new Map<
      string,
      {
        rangeName: string;
        totalStock: number;
        stockValue: number;
        skuCount: number;
        estCases: number;
      }
    >();

    // Map item SKU to estInCase
    const estMap = new Map<string, number>();
    items.forEach((item) => {
      estMap.set(item.SKU, item.estInCase || 0);
    });

    let overallStock = 0;
    let overallValue = 0;
    let overallSkus = productMaster.length;

    productMaster.forEach((p) => {
      const rawRange = p.range && String(p.range).trim() ? String(p.range).trim().toUpperCase() : 'OTHER';
      const stock = Math.max(0, Number(p.stock) || 0);
      const price = Math.max(0, Number(p.purchasePrice) || 0);
      const value = stock * price;
      const estCase = estMap.get(p.SKU) || 0;

      overallStock += stock;
      overallValue += value;

      if (!map.has(rawRange)) {
        map.set(rawRange, {
          rangeName: rawRange,
          totalStock: 0,
          stockValue: 0,
          skuCount: 0,
          estCases: 0,
        });
      }

      const entry = map.get(rawRange)!;
      entry.totalStock += stock;
      entry.stockValue += value;
      entry.skuCount += 1;
      entry.estCases += estCase;
    });

    const dataList = Array.from(map.values()).map((item, idx) => ({
      ...item,
      color: RANGE_COLORS[idx % RANGE_COLORS.length],
      percentQty: overallStock > 0 ? (item.totalStock / overallStock) * 100 : 0,
      percentValue: overallValue > 0 ? (item.stockValue / overallValue) * 100 : 0,
    }));

    // Sort by stock quantity descending
    dataList.sort((a, b) => b.totalStock - a.totalStock);

    return {
      rangeData: dataList,
      totalStock: overallStock,
      totalValue: overallValue,
      totalSkus: overallSkus,
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

  const chartData = useMemo(() => {
    return rangeData.map((d) => ({
      name: d.rangeName,
      value: metricMode === 'qty' ? d.totalStock : Math.round(d.stockValue),
      stock: d.totalStock,
      stockVal: d.stockValue,
      estCases: d.estCases,
      color: d.color,
      percent: metricMode === 'qty' ? d.percentQty : d.percentValue,
    }));
  }, [rangeData, metricMode]);

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
            Stock: <span className="font-semibold">{data.stock.toLocaleString('en-IN')} bottles</span>
          </div>
          <div>
            Value: <span className="font-semibold">{formatCurrency(data.stockVal)}</span>
          </div>
          <div>
            Share: <span className="font-semibold">{data.percent.toFixed(1)}%</span>
          </div>
          {data.estCases > 0 && (
            <div className="text-primary font-medium pt-1 border-t border-border mt-1">
              Est. Purchase: {data.estCases} Cases
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Range Analytics</CardTitle>
                <CardDescription className="text-xs">Stock distribution by range</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {rangeData.length} Ranges
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/80 backdrop-blur-sm p-2.5 rounded-lg border">
              <div className="flex items-center text-muted-foreground gap-1 text-[11px] mb-0.5">
                <Package className="h-3 w-3 text-blue-500" />
                Total Stock
              </div>
              <div className="text-sm font-bold text-foreground">
                {totalStock.toLocaleString('en-IN')}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">btls</span>
              </div>
            </div>
            <div className="bg-background/80 backdrop-blur-sm p-2.5 rounded-lg border">
              <div className="flex items-center text-muted-foreground gap-1 text-[11px] mb-0.5">
                <IndianRupee className="h-3 w-3 text-emerald-500" />
                Stock Value
              </div>
              <div className="text-sm font-bold text-foreground truncate">{formatCurrency(totalValue)}</div>
            </div>
          </div>

          {/* Controls: Chart Type & Metric Toggle */}
          <div className="flex items-center justify-between gap-1 bg-muted/50 p-1 rounded-lg text-xs">
            <div className="flex items-center gap-1">
              <Button
                variant={chartType === 'pie' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => setChartType('pie')}
              >
                <PieIcon className="h-3 w-3" />
                Pie
              </Button>
              <Button
                variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-3 w-3" />
                Bar
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={metricMode === 'qty' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setMetricMode('qty')}
              >
                Qty
              </Button>
              <Button
                variant={metricMode === 'value' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setMetricMode('value')}
              >
                Value
              </Button>
            </div>
          </div>

          {/* Graphical Display */}
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
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomPieTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Range Breakdown Cards List */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Range Stock Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {rangeData.map((rd) => {
            const currentPercent = metricMode === 'qty' ? rd.percentQty : rd.percentValue;

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
                    {rd.totalStock.toLocaleString('en-IN')} btls
                  </span>
                  <span className="font-semibold text-foreground font-mono">{formatCurrency(rd.stockValue)}</span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>Share</span>
                    <span className="font-semibold">{currentPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={currentPercent} className="h-1.5" />
                </div>

                {/* Estimate cases badge if generated */}
                {rd.estCases > 0 && (
                  <div className="pt-1 flex items-center justify-between text-[10px] text-primary font-medium border-t border-dashed mt-1">
                    <span>Est. Purchase Need:</span>
                    <span className="font-bold">{rd.estCases} Cases</span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

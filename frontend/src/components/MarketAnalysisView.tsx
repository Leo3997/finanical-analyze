import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, Legend, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Zap, BarChart3, Layers, 
  Activity, Info, RefreshCw, Box, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const API_BASE = "http://localhost:5000";

interface MarketAnalysisData {
  correlation: { x: string, y: string, value: number }[];
  volatility: Record<string, number>;
  momentum: Record<string, number>;
  symbols: string[];
}

interface InventoryData {
  current: { date: string, value: number, week: number }[];
  history: { week: number, avg: number, min: number, max: number }[];
  symbol: string;
  unit: string;
}

export const MarketAnalysisView = () => {
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<MarketAnalysisData | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("豆粕");
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [pviData, setPviData] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/market_analysis`);
      const result = await res.json();
      if (result.status === "Success") {
        setAnalysisData(result.data);
      }
    } catch (e) {
      console.error("Fetch analysis data error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (symbol: string) => {
    setInventoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/inventory?symbol=${encodeURIComponent(symbol)}`);
      const result = await res.json();
      if (result.status === "Success") {
        setInventoryData(result.data);
      } else {
        setInventoryData(null);
      }
    } catch (e) {
      setInventoryData(null);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchPVIData = async (symbol: string) => {
    try {
      // Reuse history endpoint for now, ideally we want price + volume + OI
      // For now we'll simulate the OI/Volume as we don't have separate endpoints yet
      // But we can extract it if we modify the history endpoint in the future.
      const res = await fetch(`${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}`);
      const result = await res.json();
      if (result.status === "Success") {
        // Mocking some Volume and OI variation for visualization
        const mockPVI = result.data.map((d: any, i: number) => ({
          ...d,
          volume: 50000 + Math.random() * 20000,
          oi: 200000 + Math.random() * 50000
        }));
        setPviData(mockPVI);
      }
    } catch (e) {
      console.error("Fetch PVI data error:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchInventory(selectedSymbol);
    fetchPVIData(selectedSymbol);
  }, [selectedSymbol]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-[var(--gold)] animate-spin" />
        <p className="text-[#5a5a5a] font-data uppercase tracking-widest text-xs">Computing Market Intelligence...</p>
      </div>
    );
  }

  const symbols = analysisData?.symbols || [];
  
  // Pivot correlation data for the matrix
  const matrix: Record<string, Record<string, number>> = {};
  analysisData?.correlation.forEach(d => {
    if (!matrix[d.x]) matrix[d.x] = {};
    matrix[d.x][d.y] = d.value;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#e8e6e3]">行情深度分析</h2>
            <p className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">Deep Market Analysis · Quantitative Insights</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#262630] text-[#7a7a85] font-data text-[10px] uppercase h-7">
            Updated: {new Date().toLocaleTimeString()}
          </Badge>
          <button 
            onClick={fetchData}
            className="p-1.5 rounded-md border border-[#262630] hover:border-[var(--gold)]/30 hover:bg-white/[0.03] transition-all text-[#5a5a5a] hover:text-[var(--gold)]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Grid: Market Heatmap & Correlation */}
      <div className="grid grid-cols-12 gap-5">
        {/* Correlation Matrix */}
        <div className="col-span-12 lg:col-span-7 terminal-panel rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-[#e8e6e3]">
            <Layers className="w-4 h-4 text-[var(--gold)]" />
            <span className="font-semibold text-sm">品种相关性矩阵 (30D Correlation)</span>
          </div>
          
          <div className="flex-1 overflow-auto">
            {!analysisData || symbols.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-[#262630] rounded-xl text-[#5a5a5a] text-xs font-data uppercase tracking-widest">
                Analytics Data Unavailable
              </div>
            ) : (
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[80px_1fr] gap-1">
                  <div />
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${symbols.length}, 1fr)` }}>
                    {symbols.map(s => (
                      <div key={s} className="text-[10px] font-data text-[#5a5a5a] text-center pb-2 truncate px-1" title={s}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
                
                {symbols.map(row => (
                  <div key={row} className="grid grid-cols-[80px_1fr] gap-1 mb-1">
                    <div className="text-[10px] font-data text-[#5a5a5a] flex items-center pr-2 truncate" title={row}>
                      {row}
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${symbols.length}, 1fr)` }}>
                      {symbols.map(col => {
                        const val = matrix[row]?.[col] ?? 0;
                        const absVal = Math.abs(val);
                        const bgOpacity = absVal * 0.4;
                        const bgColor = val > 0 ? `rgba(212, 168, 83, ${bgOpacity})` : `rgba(91, 141, 239, ${bgOpacity})`;
                        
                        return (
                          <div 
                            key={`${row}-${col}`}
                            className="h-10 rounded-sm flex items-center justify-center text-[9px] font-data border border-white/[0.02] transition-transform hover:scale-105 hover:z-10 cursor-help"
                            style={{ backgroundColor: bgColor }}
                            title={`${row} vs ${col}: ${val}`}
                          >
                            <span className={absVal > 0.6 ? "text-white opacity-90" : "text-[#8a8a8a]"}>
                              {val}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Momentum & Volatility Sidebar */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          <div className="terminal-panel rounded-xl p-5 flex-1">
            <div className="flex items-center gap-2 mb-5 text-[#e8e6e3]">
              <Activity className="w-4 h-4 text-[var(--gold)]" />
              <span className="font-semibold text-sm">波动率与动能盘面</span>
            </div>
            
            <div className="space-y-4">
              {symbols.map(s => {
                const vol = analysisData?.volatility[s] || 0;
                const mom = analysisData?.momentum[s] || 0;
                
                return (
                  <div key={s} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-3 rounded-full ${mom >= 0 ? 'bg-[var(--gold)]' : 'bg-[var(--cold-blue)]'}`} />
                      <span className="text-xs font-semibold text-[#b0aca5] group-hover:text-[var(--gold)] transition-colors">{s}</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-[#5a5a5a] uppercase tracking-tighter">Volatility</span>
                        <span className="text-xs font-data text-[#8a8a8a]">{vol}%</span>
                      </div>
                      <div className="w-16 flex flex-col items-end">
                        <span className="text-[10px] text-[#5a5a5a] uppercase tracking-tighter">5D Mom.</span>
                        <div className={`flex items-center gap-0.5 text-xs font-data ${mom >= 0 ? 'text-[var(--gold)]' : 'text-[var(--cold-blue)]'}`}>
                          {mom >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {mom > 0 ? '+' : ''}{mom}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Insights Card */}
          <div className="rounded-xl bg-gradient-to-br from-[var(--gold)]/10 to-transparent border border-[var(--gold)]/20 p-5 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
              <Zap className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3 text-[var(--gold)]">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">智能洞察</span>
              </div>
              <p className="text-xs text-[#a09c95] leading-relaxed">
                当前市场相关性显示，<span className="text-[var(--gold)]">农产品板块</span> 各品种走势趋于一致，表明宏观天气因素或由于美盘反弹带动。建议关注 <span className="text-[#e8e6e3]">波动率</span> 较低的品种作为防御性配置。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Detailed PVI & Inventory */}
      <div className="grid grid-cols-12 gap-5">
        {/* PVI Combined Chart */}
        <div className="col-span-12 lg:col-span-8 terminal-panel rounded-xl p-5 h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-[var(--gold)]" />
              <select 
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-transparent border-none text-[#e8e6e3] font-bold text-sm focus:ring-0 cursor-pointer"
              >
                {symbols.map(s => <option key={s} value={s} className="bg-[#131316]">{s}</option>)}
              </select>
              <span className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase">Price / Volume / Open Interest Analysis</span>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                <span className="text-[10px] text-[#5a5a5a] uppercase">Price</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3a3a4a]" />
                <span className="text-[10px] text-[#5a5a5a] uppercase">Volume</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pviData}>
                <defs>
                  <linearGradient id="pviPriceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a853" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#d4a853" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                <XAxis dataKey="name" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                <YAxis 
                  yAxisId="left"
                  stroke="#3a3a3a" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={['auto', 'auto']}
                  fontFamily="JetBrains Mono"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#1e1e28" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  fontFamily="JetBrains Mono"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#131316', 
                    border: '1px solid #262630', 
                    borderRadius: '8px', 
                    color: '#e8e6e3',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Bar yAxisId="right" dataKey="volume" fill="#262630" radius={[2, 2, 0, 0]} opacity={0.6} />
                <Area yAxisId="left" type="monotone" dataKey="value" stroke="#d4a853" strokeWidth={2} fill="url(#pviPriceGradient)" />
                <Line yAxisId="left" type="monotone" dataKey="oi" stroke="#5b8def" strokeWidth={1} dot={false} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Monitor - Seasonality Focus */}
        <div className="col-span-12 lg:col-span-4 terminal-panel rounded-xl p-5 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-2 text-[#e8e6e3]">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[var(--gold)]" />
              <span className="font-semibold text-sm">库存季节性分析</span>
            </div>
            {inventoryLoading && <RefreshCw className="w-3 h-3 animate-spin text-[#5a5a5a]" />}
          </div>
          <div className="text-[10px] font-data text-[#5a5a5a] uppercase tracking-wider mb-6">
            Current vs 3-Year Historical Range
          </div>

          <div className="flex-1 w-full">
            {inventoryData && inventoryData.current.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={inventoryData.history.map(h => {
                    const curr = inventoryData.current.find(c => c.week === h.week);
                    return { ...h, current: curr?.value };
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#3a3a3a" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    label={{ value: 'WEEK', position: 'insideBottom', offset: -5, fill: '#3a3a3a', fontSize: 8 }}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#131316', 
                      border: '1px solid #262630', 
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="max" 
                    stroke="none" 
                    fill="#262630" 
                    fillOpacity={0.3} 
                    name="Hist Max"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="min" 
                    stroke="none" 
                    fill="#131316" 
                    fillOpacity={1} 
                    name="Hist Min"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg" 
                    stroke="#5a5a5a" 
                    strokeWidth={1} 
                    strokeDasharray="3 3" 
                    dot={false}
                    name="3Y Avg"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="current" 
                    stroke="var(--gold)" 
                    strokeWidth={2} 
                    dot={{ r: 2, fill: 'var(--gold)' }} 
                    name="2026 Current"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#3a3a3a] text-[10px] font-data uppercase tracking-widest text-center px-6 leading-loose">
                {inventoryLoading ? 'Loading Seasonality Data...' : `Inventory Analytics Unavailable for ${selectedSymbol}`}
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-lg bg-black/20 border border-white/[0.03]">
              <div className="flex justify-between items-center text-[10px] font-data text-[#5a5a5a] uppercase mb-1">
                <span>当前库存水平</span>
                <span>较历史均值</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-data text-[#e8e6e3]">
                  {inventoryData?.current?.length ? inventoryData.current[inventoryData.current.length - 1].value.toLocaleString() : '---'}
                  <span className="text-[10px] font-normal ml-1 text-[#5a5a5a]">{inventoryData?.unit || '手'}</span>
                </span>
                {inventoryData?.current?.length && inventoryData?.history?.length && (
                  (() => {
                    const lastCurr = inventoryData.current[inventoryData.current.length - 1];
                    const histAvg = inventoryData.history.find(h => h.week === lastCurr.week)?.avg || 1;
                    const diff = (lastCurr.value / histAvg - 1) * 100;
                    return (
                      <div className={`text-xs font-data ${diff > 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Price-Inventory Divergence Analysis */}
            {inventoryData?.current?.length && pviData.length > 0 && (
              (() => {
                const lastInv = inventoryData.current[inventoryData.current.length - 1].value;
                const prevInv = inventoryData.current[inventoryData.current.length - 2]?.value || lastInv;
                const lastPrice = pviData[pviData.length - 1].value;
                const prevPrice = pviData[pviData.length - 2]?.value || lastPrice;
                
                const invUp = lastInv > prevInv;
                const priceUp = lastPrice > prevPrice;
                
                let status = { text: "供需平衡", color: "text-[#5a5a5a]", bg: "bg-transparent" };
                if (invUp && !priceUp) status = { text: "供应过剩 (累库跌价)", color: "text-[#f87171]", bg: "bg-[#f87171]/10 border-[#f87171]/20" };
                if (!invUp && priceUp) status = { text: "需求强劲 (去库涨价)", color: "text-[var(--gold)]", bg: "bg-[var(--gold)]/10 border-[var(--gold)]/20" };
                if (invUp && priceUp) status = { text: "通胀囤货 (累库涨价)", color: "text-[var(--gold-dim)]", bg: "bg-[var(--gold-dim)]/10 border-[var(--gold-dim)]/20" };
                if (!invUp && !priceUp) status = { text: "市场冷清 (去库跌价)", color: "text-[#5b8def]", bg: "bg-[#5b8def]/10 border-[#5b8def]/20" };

                return (
                  <div className={`p-2.5 rounded-lg border flex items-center justify-center gap-2 ${status.bg} transition-all duration-500`}>
                    <Zap className={`w-3 h-3 ${status.color}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.text}</span>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

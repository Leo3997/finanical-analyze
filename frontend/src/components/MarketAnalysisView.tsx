import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, Legend, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Zap, BarChart3, Layers, 
  Activity, Info, RefreshCw, Box, ArrowUpRight, ArrowDownRight,
  Settings, Bell, Star, Trash2, Plus, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// 使用相对路径，通过 Vite 代理访问后端
const API_BASE = "";

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

interface TechnicalData {
  symbol: string;
  dates: string[];
  price: number[];
  ma5: number[];
  ma20: number[];
  ma60: number[] | null;
  macd: { dif: number[]; dea: number[]; histogram: number[] };
  kdj: { k: number[]; d: number[]; j: number[] };
  bollinger: { upper: number[]; mid: number[]; lower: number[] };
}

interface SpreadData {
  symbol1: string;
  symbol2: string;
  dates: string[];
  price1: number[];
  price2: number[];
  spread: number[];
  spread_pct: number[];
  current: { spread: number; spread_pct: number; z_score: number };
  statistics: { mean: number; std: number; min: number; max: number };
}

interface PriceAlert {
  id: number;
  symbol: string;
  type: 'above' | 'below';
  price: number;
  enabled: boolean;
  created_at: string;
}

export const MarketAnalysisView = () => {
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<MarketAnalysisData | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("豆粕");
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [pviData, setPviData] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [spreadData, setSpreadData] = useState<SpreadData | null>(null);
  const [spreadSymbol1, setSpreadSymbol1] = useState("豆粕");
  const [spreadSymbol2, setSpreadSymbol2] = useState("玉米");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [alertPrice, setAlertPrice] = useState("");
  const [activeTab, setActiveTab] = useState<'technical' | 'spread' | 'favorites'>('technical');

  const symbols = analysisData?.symbols || [];
  const agriculturalSymbols = ["豆粕", "菜粕", "豆二", "豆油", "棕榈油", "菜籽油", "玉米", "淀粉", "大豆", "白糖", "棉花", "苹果", "红枣", "生猪", "鸡蛋"];

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
      const res = await fetch(`${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}`);
      const result = await res.json();
      if (result.status === "Success") {
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

  const fetchTechnicalData = async (symbol: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/technical_indicators?symbol=${encodeURIComponent(symbol)}`);
      const result = await res.json();
      if (result.status === "Success") {
        setTechnicalData(result.data);
      }
    } catch (e) {
      console.error("Fetch technical data error:", e);
    }
  };

  const fetchSpreadData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/spread_analysis?symbol1=${encodeURIComponent(spreadSymbol1)}&symbol2=${encodeURIComponent(spreadSymbol2)}`);
      const result = await res.json();
      if (result.status === "Success") {
        setSpreadData(result.data);
      }
    } catch (e) {
      console.error("Fetch spread data error:", e);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/favorites`);
      const result = await res.json();
      if (result.status === "Success") {
        setFavorites(result.data);
      }
    } catch (e) {
      console.error("Fetch favorites error:", e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/price_alerts`);
      const result = await res.json();
      if (result.status === "Success") {
        setAlerts(result.data);
      }
    } catch (e) {
      console.error("Fetch alerts error:", e);
    }
  };

  const toggleFavorite = async (symbol: string) => {
    try {
      if (favorites.includes(symbol)) {
        await fetch(`${API_BASE}/api/favorites`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol })
        });
      } else {
        await fetch(`${API_BASE}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol })
        });
      }
      fetchFavorites();
    } catch (e) {
      console.error("Toggle favorite error:", e);
    }
  };

  const createAlert = async () => {
    if (!alertSymbol || !alertPrice) return;
    try {
      await fetch(`${API_BASE}/api/price_alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: alertSymbol, type: alertType, price: parseFloat(alertPrice) })
      });
      setShowAlertModal(false);
      setAlertSymbol("");
      setAlertPrice("");
      fetchAlerts();
    } catch (e) {
      console.error("Create alert error:", e);
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/price_alerts?id=${id}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (e) {
      console.error("Delete alert error:", e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFavorites();
    fetchAlerts();
  }, []);

  useEffect(() => {
    fetchInventory(selectedSymbol);
    fetchPVIData(selectedSymbol);
    if (showTechnical) {
      fetchTechnicalData(selectedSymbol);
    }
  }, [selectedSymbol, showTechnical]);

  useEffect(() => {
    if (activeTab === 'spread') {
      fetchSpreadData();
    }
  }, [spreadSymbol1, spreadSymbol2, activeTab]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-[var(--gold)] animate-spin" />
        <p className="text-[#5a5a5a] font-data uppercase tracking-widest text-xs">Computing Market Intelligence...</p>
      </div>
    );
  }

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
            <p className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">Deep Market Analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#262630] text-[#7a7a85] font-data text-[10px] uppercase h-7">
            {new Date().toLocaleTimeString()}
          </Badge>
          <button onClick={fetchData} className="p-1.5 rounded-md border border-[#262630] hover:border-[var(--gold)]/30 text-[#5a5a5a] hover:text-[var(--gold)]">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Feature Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#1e1e28] pb-3">
        <button
          onClick={() => setActiveTab('technical')}
          className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${activeTab === 'technical' ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20' : 'text-[#5a5a5a] hover:text-[#b0aca5]'}`}
        >
          <Zap className="w-3 h-3 inline mr-1.5" />
          技术指标
        </button>
        <button
          onClick={() => setActiveTab('spread')}
          className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${activeTab === 'spread' ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20' : 'text-[#5a5a5a] hover:text-[#b0aca5]'}`}
        >
          <Layers className="w-3 h-3 inline mr-1.5" />
          价差分析
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${activeTab === 'favorites' ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20' : 'text-[#5a5a5a] hover:text-[#b0aca5]'}`}
        >
          <Star className="w-3 h-3 inline mr-1.5" />
          自选预警 {favorites.length > 0 && `(${favorites.length})`}
        </button>
      </div>

      {/* Technical Indicators Tab */}
      {activeTab === 'technical' && (
        <div className="space-y-5">
          <div className="terminal-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-sm font-semibold text-[#e8e6e3]">技术指标分析</span>
              <span className="text-[10px] font-data text-[#5a5a5a] uppercase">MA / MACD / KDJ / Bollinger</span>
            </div>
            <div className="flex items-center gap-3">
              <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-xs rounded-md px-3 py-1.5">
                {agriculturalSymbols.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => { setShowTechnical(!showTechnical); if (!showTechnical) fetchTechnicalData(selectedSymbol); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${showTechnical ? 'bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30' : 'bg-[#0d0d0f] text-[#5a5a5a] border border-[#262630]'}`}>
                {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {showTechnical && technicalData && (
            <div className="space-y-4">
              {/* MA & Price Chart */}
              <div className="terminal-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[var(--gold)]" />
                  <span className="text-sm font-semibold text-[#e8e6e3]">{selectedSymbol} 价格 & 均线</span>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={technicalData.dates.map((d, i) => ({ date: d.slice(5), price: technicalData.price[i], ma5: technicalData.ma5[i], ma20: technicalData.ma20[i], ma60: technicalData.ma60?.[i], bbUpper: technicalData.bollinger.upper[i], bbLower: technicalData.bollinger.lower[i] }))}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4a853" stopOpacity={0.2}/><stop offset="95%" stopColor="#d4a853" stopOpacity={0}/></linearGradient>
                        <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5b8def" stopOpacity={0.1}/><stop offset="95%" stopColor="#5b8def" stopOpacity={0.05}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                      <XAxis dataKey="date" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#131316', border: '1px solid #262630', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="bbUpper" stroke="none" fill="url(#bbGrad)" />
                      <Area type="monotone" dataKey="bbLower" stroke="none" fill="#131316" />
                      <Line type="monotone" dataKey="price" stroke="#d4a853" strokeWidth={2} dot={false} name="价格" />
                      <Line type="monotone" dataKey="ma5" stroke="#4ade80" strokeWidth={1} dot={false} strokeDasharray="5 5" name="MA5" />
                      <Line type="monotone" dataKey="ma20" stroke="#f87171" strokeWidth={1} dot={false} strokeDasharray="3 3" name="MA20" />
                      <Line type="monotone" dataKey="ma60" stroke="#818cf8" strokeWidth={1} dot={false} name="MA60" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#d4a853]" /> 价格</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#4ade80]" /> MA5</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#f87171]" /> MA20</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#818cf8]" /> MA60</div>
                </div>
              </div>

              {/* MACD Chart */}
              <div className="terminal-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-[#5b8def]" />
                  <span className="text-sm font-semibold text-[#e8e6e3]">MACD 指标</span>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={technicalData.dates.map((d, i) => ({ date: d.slice(5), dif: technicalData.macd.dif[i], dea: technicalData.macd.dea[i], histogram: technicalData.macd.histogram[i] }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                      <XAxis dataKey="date" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#131316', border: '1px solid #262630', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="histogram" radius={[2, 2, 0, 0]}>
                        {technicalData.dates.map((_, i) => (<Cell key={i} fill={technicalData.macd.histogram[i] >= 0 ? '#4ade80' : '#f87171'} opacity={0.6} />))}
                      </Bar>
                      <Line type="monotone" dataKey="dif" stroke="#d4a853" strokeWidth={1.5} dot={false} name="DIF" />
                      <Line type="monotone" dataKey="dea" stroke="#5b8def" strokeWidth={1.5} dot={false} name="DEA" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-[#4ade80] opacity-60" /> 红柱</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-[#f87171] opacity-60" /> 绿柱</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#d4a853]" /> DIF</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#5b8def]" /> DEA</div>
                </div>
              </div>

              {/* KDJ Chart */}
              <div className="terminal-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-[#818cf8]" />
                  <span className="text-sm font-semibold text-[#e8e6e3]">KDJ 指标</span>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={technicalData.dates.map((d, i) => ({ date: d.slice(5), k: technicalData.kdj.k[i], d: technicalData.kdj.d[i], j: technicalData.kdj.j[i] }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                      <XAxis dataKey="date" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#131316', border: '1px solid #262630', borderRadius: '8px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="k" stroke="#d4a853" strokeWidth={1.5} dot={false} name="K" />
                      <Line type="monotone" dataKey="d" stroke="#5b8def" strokeWidth={1.5} dot={false} name="D" />
                      <Line type="monotone" dataKey="j" stroke="#818cf8" strokeWidth={1} dot={false} strokeDasharray="3 3" name="J" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#d4a853]" /> K值</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#5b8def]" /> D值</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#818cf8]" /> J值</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spread Analysis Tab */}
      {activeTab === 'spread' && (
        <div className="space-y-5">
          <div className="terminal-panel rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-[var(--gold)]" />
                <span className="text-sm font-semibold text-[#e8e6e3]">价差分析</span>
                <span className="text-[10px] font-data text-[#5a5a5a] uppercase">Spread Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <select value={spreadSymbol1} onChange={(e) => setSpreadSymbol1(e.target.value)} className="bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-xs rounded-md px-2 py-1.5">
                  {agriculturalSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[#5a5a5a] text-xs">vs</span>
                <select value={spreadSymbol2} onChange={(e) => setSpreadSymbol2(e.target.value)} className="bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-xs rounded-md px-2 py-1.5">
                  {agriculturalSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {spreadData && (
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="terminal-panel rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-[var(--gold)]" />
                    <span className="text-sm font-semibold text-[#e8e6e3]">价差统计</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#5a5a5a] uppercase">当前价差</span>
                      <span className="text-lg font-bold font-data text-[#e8e6e3]">{spreadData.current.spread}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#5a5a5a] uppercase">价差百分比</span>
                      <span className={`text-sm font-data font-semibold ${spreadData.current.spread_pct >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                        {spreadData.current.spread_pct >= 0 ? '+' : ''}{spreadData.current.spread_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#5a5a5a] uppercase">Z-Score</span>
                      <span className={`text-sm font-data ${Math.abs(spreadData.current.z_score) > 2 ? 'text-[#f87171]' : 'text-[#5b8def]'}`}>{spreadData.current.z_score}</span>
                    </div>
                    <div className="border-t border-[#262630] pt-3 space-y-2">
                      <div className="flex justify-between items-center text-[10px]"><span className="text-[#5a5a5a]">均值</span><span className="text-[#8a8a8a] font-data">{spreadData.statistics.mean}</span></div>
                      <div className="flex justify-between items-center text-[10px]"><span className="text-[#5a5a5a]">标准差</span><span className="text-[#8a8a8a] font-data">{spreadData.statistics.std}</span></div>
                      <div className="flex justify-between items-center text-[10px]"><span className="text-[#5a5a5a]">历史最低</span><span className="text-[#8a8a8a] font-data">{spreadData.statistics.min}</span></div>
                      <div className="flex justify-between items-center text-[10px]"><span className="text-[#5a5a5a]">历史最高</span><span className="text-[#8a8a8a] font-data">{spreadData.statistics.max}</span></div>
                    </div>
                  </div>
                </div>
                <div className={`terminal-panel rounded-xl p-4 border ${Math.abs(spreadData.current.z_score) > 2 ? 'border-[#f87171]/30 bg-[#f87171]/5' : 'border-[#262630]'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className={`w-4 h-4 ${Math.abs(spreadData.current.z_score) > 2 ? 'text-[#f87171]' : 'text-[#5b8def]'}`} />
                    <span className="text-xs font-semibold text-[#e8e6e3]">信号解读</span>
                  </div>
                  <p className="text-[10px] text-[#8a8a8a] leading-relaxed">
                    {Math.abs(spreadData.current.z_score) > 2 ? '价差偏离均值超过2个标准差，存在均值回归机会。' : '价差处于正常波动区间，暂无明显套利机会。'}
                  </p>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-8 terminal-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-[var(--gold)]" />
                  <span className="text-sm font-semibold text-[#e8e6e3]">{spreadSymbol1} vs {spreadSymbol2} 价差走势</span>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={spreadData.dates.map((d, i) => ({ date: d.slice(5), spread: spreadData.spread[i], price1: spreadData.price1[i], price2: spreadData.price2[i] }))}>
                      <defs>
                        <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4a853" stopOpacity={0.3}/><stop offset="95%" stopColor="#d4a853" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                      <XAxis dataKey="date" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#1e1e28" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#131316', border: '1px solid #262630', borderRadius: '8px', fontSize: '12px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="spread" stroke="#d4a853" strokeWidth={2} fill="url(#spreadGrad)" name="价差" />
                      <Line yAxisId="right" type="monotone" dataKey="price1" stroke="#4ade80" strokeWidth={1.5} dot={false} name={spreadSymbol1} />
                      <Line yAxisId="right" type="monotone" dataKey="price2" stroke="#f87171" strokeWidth={1.5} dot={false} name={spreadSymbol2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#d4a853]" /> 价差</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#4ade80]" /> {spreadSymbol1}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#f87171]" /> {spreadSymbol2}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Favorites & Alerts Tab */}
      {activeTab === 'favorites' && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-6 terminal-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[var(--gold)]" />
                <span className="text-sm font-semibold text-[#e8e6e3]">我的自选</span>
              </div>
              <span className="text-[10px] text-[#5a5a5a] font-data">{favorites.length} 个品种</span>
            </div>
            {favorites.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {favorites.map(symbol => (
                  <div key={symbol} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-xs">
                    <span className="text-[var(--gold)]">{symbol}</span>
                    <button onClick={() => toggleFavorite(symbol)} className="text-[#5a5a5a] hover:text-[#f87171] transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#5a5a5a] text-xs">暂无自选品种<br /><span className="text-[#3a3a3a]">点击下方添加自选</span></div>
            )}
            <div className="mt-4 pt-4 border-t border-[#262630]">
              <div className="flex items-center gap-2">
                <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="flex-1 bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-xs rounded-md px-3 py-2">
                  {agriculturalSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button onClick={() => toggleFavorite(selectedSymbol)} variant="outline" size="sm" className="border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10">
                  <Plus className="w-3 h-3 mr-1" />{favorites.includes(selectedSymbol) ? '已添加' : '添加自选'}
                </Button>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 terminal-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--gold)]" />
                <span className="text-sm font-semibold text-[#e8e6e3]">价格预警</span>
              </div>
              <Button onClick={() => { setAlertSymbol(selectedSymbol); setShowAlertModal(true); }} size="sm" className="bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[var(--gold)] hover:bg-[var(--gold)]/20">
                <Plus className="w-3 h-3 mr-1" />添加预警
              </Button>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${alert.type === 'above' ? 'bg-[#4ade80]/5 border-[#4ade80]/20' : 'bg-[#f87171]/5 border-[#f87171]/20'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-6 rounded-full ${alert.type === 'above' ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
                      <div>
                        <span className="text-xs font-semibold text-[#e8e6e3]">{alert.symbol}</span>
                        <div className="text-[10px] text-[#5a5a5a]">{alert.type === 'above' ? '突破' : '跌破'} {alert.price}</div>
                      </div>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} className="text-[#5a5a5a] hover:text-[#f87171] transition-colors p-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#5a5a5a] text-xs">暂无价格预警<br /><span className="text-[#3a3a3a]">设置价格提醒，不错过重要行情</span></div>
            )}
          </div>
        </div>
      )}

      {/* Original Correlation & Analysis - Only show when in technical tab and collapsed */}
      {activeTab === 'technical' && !showTechnical && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-7 terminal-panel rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-[#e8e6e3]">
              <Layers className="w-4 h-4 text-[var(--gold)]" />
              <span className="font-semibold text-sm">品种相关性矩阵</span>
            </div>
            <div className="flex-1 overflow-auto">
              {!analysisData || symbols.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-dashed border-[#262630] rounded-xl text-[#5a5a5a] text-xs font-data uppercase tracking-widest">Data Unavailable</div>
              ) : (
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <div />
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${symbols.length}, 1fr)` }}>
                      {symbols.map(s => <div key={s} className="text-[10px] font-data text-[#5a5a5a] text-center pb-2 truncate px-1">{s}</div>)}
                    </div>
                  </div>
                  {symbols.map(row => (
                    <div key={row} className="grid grid-cols-[80px_1fr] gap-1 mb-1">
                      <div className="text-[10px] font-data text-[#5a5a5a] flex items-center pr-2 truncate">{row}</div>
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${symbols.length}, 1fr)` }}>
                        {symbols.map(col => {
                          const val = matrix[row]?.[col] ?? 0;
                          const absVal = Math.abs(val);
                          const bgColor = val > 0 ? `rgba(212, 168, 83, ${absVal * 0.4})` : `rgba(91, 141, 239, ${absVal * 0.4})`;
                          return (
                            <div key={`${row}-${col}`} className="h-10 rounded-sm flex items-center justify-center text-[9px] font-data border border-white/[0.02] hover:scale-105 cursor-help" style={{ backgroundColor: bgColor }} title={`${row} vs ${col}: ${val}`}>
                              <span className={absVal > 0.6 ? "text-white opacity-90" : "text-[#8a8a8a]"}>{val}</span>
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

          <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
            <div className="terminal-panel rounded-xl p-5 flex-1">
              <div className="flex items-center gap-2 mb-5 text-[#e8e6e3]">
                <Activity className="w-4 h-4 text-[var(--gold)]" />
                <span className="font-semibold text-sm">波动率与动能</span>
              </div>
              <div className="space-y-4">
                {symbols.map(s => {
                  const vol = analysisData?.volatility[s] || 0;
                  const mom = analysisData?.momentum[s] || 0;
                  return (
                    <div key={s} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-3 rounded-full ${mom >= 0 ? 'bg-[var(--gold)]' : 'bg-[var(--cold-blue)]'}`} />
                        <span className="text-xs font-semibold text-[#b0aca5] group-hover:text-[var(--gold)]">{s}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-[#5a5a5a] uppercase">Vol</span>
                          <span className="text-xs font-data text-[#8a8a8a]">{vol}%</span>
                        </div>
                        <div className="w-16 flex flex-col items-end">
                          <span className="text-[10px] text-[#5a5a5a] uppercase">5D</span>
                          <div className={`flex items-center gap-0.5 text-xs font-data ${mom >= 0 ? 'text-[var(--gold)]' : 'text-[var(--cold-blue)]'}`}>
                            {mom >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{mom > 0 ? '+' : ''}{mom}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-[var(--gold)]/10 to-transparent border border-[var(--gold)]/20 p-5 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-[0.03]"><Zap className="w-32 h-32" /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 text-[var(--gold)]"><Info className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">智能洞察</span></div>
                <p className="text-xs text-[#a09c95] leading-relaxed">当前市场相关性显示，<span className="text-[var(--gold)]">农产品板块</span> 各品种走势趋于一致，建议关注 <span className="text-[#e8e6e3]">波动率</span> 较低的品种作为防御性配置。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="terminal-panel rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[#e8e6e3]">添加价格预警</h3>
              <button onClick={() => setShowAlertModal(false)} className="text-[#5a5a5a] hover:text-[#e8e6e3]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-[#5a5a5a] uppercase tracking-wider block mb-2">品种</label>
                <select value={alertSymbol} onChange={(e) => setAlertSymbol(e.target.value)} className="w-full bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-sm rounded-md px-3 py-2">
                  {agriculturalSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#5a5a5a] uppercase tracking-wider block mb-2">预警类型</label>
                <div className="flex gap-2">
                  <button onClick={() => setAlertType('above')} className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${alertType === 'above' ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30' : 'bg-[#0d0d0f] text-[#5a5a5a] border border-[#262630]'}`}>
                    <ArrowUpRight className="w-3 h-3 inline mr-1" />价格突破
                  </button>
                  <button onClick={() => setAlertType('below')} className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all ${alertType === 'below' ? 'bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30' : 'bg-[#0d0d0f] text-[#5a5a5a] border border-[#262630]'}`}>
                    <ArrowDownRight className="w-3 h-3 inline mr-1" />价格跌破
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#5a5a5a] uppercase tracking-wider block mb-2">预警价格</label>
                <input type="number" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} placeholder="请输入价格" className="w-full bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[var(--gold)]/30" />
              </div>
              <Button onClick={createAlert} disabled={!alertSymbol || !alertPrice} className="w-full bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-[#09090b] font-semibold">创建预警</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react'
import { DashboardLayout } from './components/DashboardLayout'
import { MarketMetrics } from './components/MarketMetrics'
import { AIReportCard } from './components/AIReportCard'
import { LiveLogs } from './components/LiveLogs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Play, BarChart3 } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { NewsView } from './components/NewsView'
import { MarketAnalysisView } from './components/MarketAnalysisView'

const API_BASE = "http://localhost:5000";
const CORE_SYMBOLS = ["玉米", "淀粉", "乙醇", "大豆", "豆粕", "豆油", "生物柴"];

function App() {
  const [activeView, setActiveView] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [report, setReport] = useState<string>('')
  const [chartData, setChartData] = useState<any[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState("豆粕")
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : ["玉米", "豆粕"];
  });

  const toggleFavorite = (symbol: string) => {
    const newFavs = favorites.includes(symbol) 
      ? favorites.filter(s => s !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state`);
      const result = await res.json();
      if (result.status === "Success" && result.data) {
        if (result.data.reports && result.data.reports.length > 0) {
          setReport(result.data.reports[0].content || "");
        }
      }
    } catch (e) {
      console.error("Fetch state error:", e);
    }
  };

  const fetchHistory = async (symbol: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}`);
      const result = await res.json();
      if (result.status === "Success") {
        setChartData(result.data);
      }
    } catch (e) {
      console.error("Fetch history error:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`);
      const result = await res.json();
      if (result.status === "Success") {
        setLogs(result.logs || []);
      }
    } catch (e) {
      console.error("Fetch logs error:", e);
    }
  };

  useEffect(() => {
    fetchState();
    fetchLogs();
    fetchHistory(selectedSymbol);
    
    const timer = setInterval(() => {
      fetchLogs();
      fetchState();
    }, 10000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchHistory(selectedSymbol);
  }, [selectedSymbol]);

  const handleManualTrigger = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger`, { method: 'POST' });
      const result = await res.json();
      if (result.status === "Started" || result.status === "Success") {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - INFO - 手动触发请求已发送...`]);
      }
    } catch (e) {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ERROR - 无法连接到后端服务器`]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (activeView === "news") {
      return <NewsView />;
    }

    if (activeView === "analysis") {
      return <MarketAnalysisView />;
    }

    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        {/* Top action bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#e8e6e3]">市场概览</h2>
              <p className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">Market Overview · Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button 
              variant="outline" 
              className="border-[#262630] bg-transparent hover:bg-white/[0.03] hover:border-[var(--gold)]/20 text-[#7a7a85] hover:text-[#b0aca5] transition-all text-xs h-9"
              onClick={() => { fetchState(); fetchLogs(); fetchHistory(selectedSymbol); }}
              id="refresh-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> 刷新
            </Button>
            <Button 
              disabled={loading} 
              onClick={handleManualTrigger} 
              className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold shadow-lg shadow-[var(--gold)]/10 border border-[var(--gold)]/30 text-xs h-9"
              id="trigger-report-btn"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-2" />}
              触发研报
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* Market metrics - full width */}
          <div className="col-span-12">
            <MarketMetrics onSelect={setSelectedSymbol} favorites={favorites} onToggleFavorite={toggleFavorite} />
          </div>

          {/* Left column: Chart + Logs */}
          <div className="col-span-12 lg:col-span-8 space-y-5">
            {/* Price chart */}
            <div className="terminal-panel rounded-xl p-5 h-[420px] flex flex-col">
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-semibold text-sm text-[#e8e6e3]">{selectedSymbol}</span>
                  <span className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase">30D Price</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CORE_SYMBOLS.map(s => (
                    <Badge 
                      key={s} 
                      variant={selectedSymbol === s ? "default" : "secondary"}
                      className={`cursor-pointer px-2.5 py-0.5 text-xs font-data transition-all duration-200 ${
                        selectedSymbol === s 
                          ? "bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 hover:bg-[var(--gold)]/15 shadow-sm shadow-[var(--gold)]/5" 
                          : "bg-transparent text-[#5a5a5a] border border-[#262630] hover:bg-white/[0.03] hover:text-[#8a8a8a] hover:border-[#3a3a3a]"
                      }`}
                      onClick={() => setSelectedSymbol(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 w-full relative z-10">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4a853" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#d4a853" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
                      <XAxis dataKey="name" stroke="#3a3a3a" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                      <YAxis 
                        stroke="#3a3a3a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => val.toLocaleString()}
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
                        itemStyle={{ color: '#d4a853' }}
                        labelStyle={{ color: '#5a5a5a', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#d4a853" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-[#1e1e28]">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-[#5a5a5a]">正在加载 {selectedSymbol} 历史行情...</p>
                      <p className="text-[10px] font-data text-[#3a3a3a] tracking-wider uppercase">Loading chart data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <LiveLogs logs={logs} />
          </div>

          {/* Right column: AI Report */}
          <div className="col-span-12 lg:col-span-4">
            <AIReportCard report={report} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout activeView={activeView} onNavigate={setActiveView}>
      {renderContent()}
    </DashboardLayout>
  )
}

export default App

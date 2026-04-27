import { useState, useEffect } from 'react'
import { DashboardLayout } from './components/DashboardLayout'
import { MarketMetrics } from './components/MarketMetrics'
import { AIReportCard } from './components/AIReportCard'
import { LiveLogs } from './components/LiveLogs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NewsView } from './components/NewsView'
import { MarketAnalysisView } from './components/MarketAnalysisView'
import { FinancialReportView } from './components/FinancialReportView'
import { FuturesChart } from './components/FuturesChart'

// 使用相对路径，通过 Vite 代理访问后端
const API_BASE = "";
const CORE_SYMBOLS = ["玉米", "淀粉", "乙醇", "大豆", "豆粕", "豆油", "生物柴"];

function App() {
  const [activeView, setActiveView] = useState("dashboard")
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [report, setReport] = useState<string>('')
  const [chartData, setChartData] = useState<any[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState("豆粕")
  const [chartType, setChartType] = useState<'time' | 'candlestick'>('time')
  const [klinePeriod, setKlinePeriod] = useState<'1' | 'daily'>('1')
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

  const fetchHistory = async (symbol: string, period?: string) => {
    try {
      const p = period || klinePeriod;
      // chartType 为 'time' 时分时图，否则为 K 线图
      const isIntraday = chartType === 'time';
      const url = isIntraday
        ? `${API_BASE}/api/intraday?symbol=${encodeURIComponent(symbol)}`
        : `${API_BASE}/api/intraday?symbol=${encodeURIComponent(symbol)}&period=${p}`;
      console.log('[App] 请求 URL:', url, 'chartType:', chartType, 'period:', p);
      const res = await fetch(url);
      console.log('[App] 响应状态:', res.status);
      const result = await res.json();
      console.log('[App] 分时图数据响应:', result);
      if (result.status === "Success") {
        console.log('[App] 设置图表数据:', result.data?.length, '条，类型:', isIntraday ? '分时图' : 'K 线图');
        setChartData(result.data);
      } else {
        console.error('[App] 获取数据失败:', result.message);
      }
    } catch (e) {
      console.error("[App] Fetch intraday error:", e);
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
  }, [selectedSymbol, chartType, klinePeriod]);

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
    } else if (activeView === "analysis") {
      return <MarketAnalysisView />;
    } else if (activeView === "reports") {
      return <FinancialReportView />;
    }

    return (
      <div className="flex flex-col gap-4 lg:gap-6 animate-in fade-in duration-500">
        {/* Top action bar - Mobile optimized */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 sm:h-8 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8e6e3]">市场概览</h2>
              <p className="text-[9px] sm:text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">Market Overview · Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="border-[#262630] bg-transparent hover:bg-white/[0.03] hover:border-[var(--gold)]/20 text-[#7a7a85] hover:text-[#b0aca5] transition-all text-xs h-9 flex-1 sm:flex-none"
              onClick={() => { fetchState(); fetchLogs(); fetchHistory(selectedSymbol); }}
              id="refresh-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:mr-2" /> <span className="hidden sm:inline">刷新</span>
            </Button>
            <Button 
              disabled={loading} 
              onClick={handleManualTrigger} 
              className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold shadow-lg shadow-[var(--gold)]/10 border border-[var(--gold)]/30 text-xs h-9 flex-1 sm:flex-none"
              id="trigger-report-btn"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 sm:mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 sm:mr-2" />}
              <span className="hidden sm:inline">{loading ? '触发中' : '触发研报'}</span>
              <span className="sm:hidden">触发</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {/* Market metrics - full width */}
          <div className="col-span-1 lg:col-span-12">
            <MarketMetrics onSelect={setSelectedSymbol} favorites={favorites} onToggleFavorite={toggleFavorite} />
          </div>

          {/* Left column: Chart + Logs */}
          <div className="col-span-1 lg:col-span-8 space-y-4 lg:space-y-5">
            {/* Price chart - Using new FuturesChart component */}
            <div className="terminal-panel rounded-xl p-4 sm:p-5 h-[420px] sm:h-[460px] flex flex-col">
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />
              
              <FuturesChart 
                data={chartData}
                symbol={selectedSymbol}
                chartType={chartType}
                klinePeriod={klinePeriod}
                onChartTypeChange={setChartType}
                onKlinePeriodChange={(period) => {
                  setKlinePeriod(period);
                  fetchHistory(selectedSymbol, period);
                }}
              />
            </div>

            <LiveLogs logs={logs} />
          </div>

          {/* Right column: AI Report */}
          <div className="col-span-1 lg:col-span-4">
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

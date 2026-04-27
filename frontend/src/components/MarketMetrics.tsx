import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Star, Activity, Filter, Heart, Clock, CheckCircle2, PauseCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change_pc: number;
  volume: number;
  hold: number;
  category?: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  isFavorite: boolean;
  category?: string;
  onSelect: (symbol: string) => void;
  onToggleFavorite: (e: React.MouseEvent, symbol: string) => void;
  index: number;
}

const categoryColors: Record<string, string> = {
  "蛋白粕": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "油脂": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "谷物": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "软商品": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "畜牧": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "能化": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "能源": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "黑色": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "建材": "bg-stone-500/10 text-stone-400 border-stone-500/20",
  "有色": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "新能源": "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "贵金属": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

// 判断期货品种是否开盘（使用传入的日期对象）
const getMarketStatus = (checkTime: Date = new Date()): { isOpen: boolean; status: string; nextAction: string } => {
  const day = checkTime.getDay(); // 0 = 周日，6 = 周六
  const hours = checkTime.getHours();
  const minutes = checkTime.getMinutes();
  const currentTime = hours * 60 + minutes; // 转换为分钟数
  
  // 周末休市
  if (day === 0 || day === 6) {
    return { isOpen: false, status: '休市', nextAction: '周一开盘' };
  }
  
  // 期货交易时间（北京时间）
  // 日盘：9:00-10:15, 10:30-11:30, 13:30-15:00
  // 夜盘：21:00-23:00 (部分品种到 1:00 或 2:30)
  
  const morningStart = 9 * 60; // 9:00
  const morningBreakEnd = 10 * 60 + 15; // 10:15
  const morningSessionEnd = 11 * 60 + 30; // 11:30
  const afternoonStart = 13 * 60 + 30; // 13:30
  const afternoonEnd = 15 * 60; // 15:00
  const nightStart = 21 * 60; // 21:00
  const nightEnd = 23 * 60; // 23:00
  
  // 判断是否在交易时间
  const isMorningSession = (currentTime >= morningStart && currentTime < morningBreakEnd) ||
                           (currentTime > morningBreakEnd && currentTime < morningSessionEnd);
  const isAfternoonSession = currentTime >= afternoonStart && currentTime < afternoonEnd;
  const isNightSession = currentTime >= nightStart && currentTime < nightEnd;
  
  if (isMorningSession || isAfternoonSession || isNightSession) {
    return { isOpen: true, status: '交易中', nextAction: '' };
  }
  
  // 判断下一个交易时段
  if (currentTime < morningStart) {
    return { isOpen: false, status: '未开盘', nextAction: '9:00 开盘' };
  } else if (currentTime >= morningBreakEnd && currentTime < morningSessionEnd) {
    return { isOpen: true, status: '交易中', nextAction: '' };
  } else if (currentTime >= morningSessionEnd && currentTime < afternoonStart) {
    return { isOpen: false, status: '午休', nextAction: '13:30 开盘' };
  } else if (currentTime >= afternoonEnd && currentTime < nightStart) {
    return { isOpen: false, status: '收盘', nextAction: '21:00 夜盘' };
  } else {
    return { isOpen: false, status: '休市', nextAction: '下一交易日' };
  }
};

const MetricCard = ({ title, value, change, isPositive, isFavorite, category, onSelect, onToggleFavorite, index }: MetricCardProps) => {
  const marketStatus = getMarketStatus(new Date());
  
  return (
    <Card 
      className={`terminal-panel relative overflow-hidden group cursor-pointer card-hover-glow rounded-xl animate-float-up stagger-${Math.min(index + 1, 6)}`}
      style={{ opacity: 0 }}
      onClick={() => onSelect(title)}
      id={`metric-card-${title}`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px ${isPositive ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent'}`} />
      
      {/* 开盘状态指示器 */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${
        marketStatus.isOpen 
          ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' 
          : 'bg-gradient-to-b from-[#262630] to-[#1a1a20]'
      }`} />
      
      <div 
        className={`absolute top-2.5 right-2.5 p-1.5 z-10 transition-all duration-200 rounded-md hover:bg-white/5 ${isFavorite ? "text-[var(--gold)]" : "text-[#2a2a35] group-hover:text-[#3a3a45]"}`}
        onClick={(e) => onToggleFavorite(e, title)}
      >
        <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
      </div>

      <CardHeader className="pb-2 pt-3.5 px-4">
        <CardTitle className="text-[11px] font-data font-medium text-[#e8e6e3] uppercase tracking-wider flex items-center gap-2 flex-wrap">
          <Activity className="w-3 h-3 text-[var(--gold-dim)]" />
          {title}
          {category && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${categoryColors[category] || "bg-[#262630] text-[#e8e6e3] border-[#262630]"}`}>
              {category}
            </span>
          )}
          {/* 开盘状态标签 */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
            marketStatus.isOpen
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-[#262630] text-[#b0aca5] border-[#262630]"
          }`}>
            {marketStatus.isOpen ? (
              <>
                <CheckCircle2 className="w-2.5 h-2.5" />
                {marketStatus.status}
              </>
            ) : (
              <>
                <PauseCircle className="w-2.5 h-2.5" />
                {marketStatus.status}
              </>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3.5">
        <div className="font-data text-xl font-bold tracking-tight text-[#e8e6e3]">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-data font-semibold ${
            isPositive 
              ? "bg-emerald-500/8 text-emerald-400 border border-emerald-500/15" 
              : "bg-red-500/8 text-red-400 border border-red-500/15"
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{change}%</span>
          </div>
          {/* 下一交易时段提示 */}
          {!marketStatus.isOpen && marketStatus.nextAction && (
            <span className="text-[10px] text-[#b0aca5] flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {marketStatus.nextAction}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const MarketMetrics = ({ onSelect, favorites, onToggleFavorite }: { 
  onSelect: (symbol: string) => void, 
  favorites: string[],
  onToggleFavorite: (symbol: string) => void
}) => {
  const [data, setData] = useState<QuoteData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 使用相对路径，通过 Vite 代理访问后端
        const API_BASE = "";
        
        // 使用新的农产品行情接口
        const res = await fetch(`${API_BASE}/api/agricultural_quotes`);
        const result = await res.json();
        if (result.status === "Success" && result.data) {
          setData(result.data);
          if (result.categories) {
            // 只保留农产品相关的分类
            const agriCategories = ["蛋白粕", "油脂", "谷物", "软商品", "畜牧"];
            setCategories(agriCategories.filter(c => result.categories.includes(c)));
          }
        }
      } catch (e) {
        console.error("MarketMetrics fetch error:", e);
        // 降级：使用原有接口
        try {
          const API_BASE = "";
          const res = await fetch(`${API_BASE}/api/state`);
          const result = await res.json();
          if (result.status === "Success" && result.data.quotes_data) {
            setData(result.data.quotes_data);
          }
        } catch (e2) {
          console.error("Fallback fetch error:", e2);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, []);

  // 映射数据
  const mappedMetrics = data.map(item => ({
    title: item.symbol,
    value: item.price?.toLocaleString() || "--",
    change: item.change_pc > 0 ? `+${item.change_pc}` : `${item.change_pc}`,
    isPositive: item.change_pc >= 0,
    isFavorite: favorites.includes(item.symbol),
    category: item.category,
  }));

  // 筛选逻辑
  let filteredMetrics = mappedMetrics;
  
  // 按分类筛选
  if (selectedCategory !== "全部") {
    filteredMetrics = filteredMetrics.filter(m => m.category === selectedCategory);
  }
  
  // 只显示自选
  if (showFavoritesOnly) {
    filteredMetrics = filteredMetrics.filter(m => m.isFavorite);
  }

  // 排序：自选优先，然后按分类分组
  const sortedMetrics = [...filteredMetrics].sort((a, b) => {
    // 自选优先
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    // 然后按分类排序
    if (a.category && b.category) {
      return a.category.localeCompare(b.category);
    }
    return 0;
  });

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Section header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 sm:h-6 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
          <div>
            <h3 className="text-sm font-semibold text-[#e8e6e3] tracking-wide">市场实时看板</h3>
            <p className="text-[9px] sm:text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">农产品期货 · AGRICULTURAL FUTURES</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* 分类筛选 */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-[#5a5a5a]" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0d0d0f] border border-[#262630] text-[#b0aca5] text-xs rounded-md px-2 py-1 focus:outline-none focus:border-[var(--gold)]/30"
            >
              <option value="全部">全部分类</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* 自选筛选按钮 */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
              showFavoritesOnly 
                ? "bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20" 
                : "bg-[#0d0d0f] text-[#5a5a5a] border border-[#262630] hover:text-[#b0aca5]"
            }`}
          >
            <Heart className={`w-3 h-3 ${showFavoritesOnly ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">自选</span>
            {favorites.length > 0 && (
              <span className="text-[9px] sm:text-[10px]">({favorites.length})</span>
            )}
          </button>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--gold)]/5 border border-[var(--gold)]/10">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse-gold" />
            <span className="text-[9px] sm:text-[10px] font-data text-[var(--gold-dim)] tracking-wider uppercase">Live</span>
          </div>
        </div>
      </div>

      {/* 分类快速筛选标签 - Scrollable on mobile */}
      <div className="flex flex-wrap gap-1.5">
        <Badge 
          variant={selectedCategory === "全部" ? "default" : "secondary"}
          className={`cursor-pointer px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs transition-all ${
            selectedCategory === "全部" 
              ? "bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20" 
              : "bg-transparent text-[#5a5a5a] border border-[#262630] hover:bg-white/[0.03] hover:text-[#8a8a8a]"
          }`}
          onClick={() => setSelectedCategory("全部")}
        >
          全部
        </Badge>
        {categories.map(cat => (
          <Badge 
            key={cat}
            variant={selectedCategory === cat ? "default" : "secondary"}
            className={`cursor-pointer px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs transition-all ${
              selectedCategory === cat 
                ? categoryColors[cat]?.replace("/10", "/20") + " border-current" 
                : "bg-transparent text-[#5a5a5a] border border-[#262630] hover:bg-white/[0.03] hover:text-[#8a8a8a]"
            }`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Metric cards grid - Mobile responsive */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="terminal-panel rounded-xl p-3 sm:p-4 h-[90px] sm:h-[100px] animate-pulse">
              <div className="h-2.5 sm:h-3 w-14 sm:w-16 bg-[#1e1e28] rounded mb-2 sm:mb-3" />
              <div className="h-5 sm:h-6 w-20 sm:w-24 bg-[#1e1e28] rounded mb-1.5 sm:mb-2" />
              <div className="h-3.5 sm:h-4 w-12 sm:w-16 bg-[#1e1e28] rounded" />
            </div>
          ))}
        </div>
      ) : sortedMetrics.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-3">
          {sortedMetrics.map((metric, i) => (
            <MetricCard 
              key={metric.title} 
              {...metric} 
              index={i}
              onSelect={onSelect}
              onToggleFavorite={(e, s) => {
                e.stopPropagation();
                onToggleFavorite(s);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="terminal-panel rounded-xl p-8 text-center">
          <p className="text-[#5a5a5a] text-sm">暂无数据</p>
          {showFavoritesOnly && favorites.length === 0 && (
            <p className="text-[#3a3a3a] text-xs mt-2">点击品种卡片上的星标添加自选</p>
          )}
        </div>
      )}
      
      {/* 统计信息 */}
      <div className="flex items-center justify-between text-[10px] text-[#5a5a5a]">
        <span>共 {sortedMetrics.length} 个品种</span>
        {favorites.length > 0 && (
          <span>自选: {favorites.length} 个</span>
        )}
      </div>
    </div>
  );
};

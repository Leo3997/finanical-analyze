import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Star, Activity } from "lucide-react";


interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  isFavorite: boolean;
  onSelect: (symbol: string) => void;
  onToggleFavorite: (e: React.MouseEvent, symbol: string) => void;
  index: number;
}

const MetricCard = ({ title, value, change, isPositive, isFavorite, onSelect, onToggleFavorite, index }: MetricCardProps) => (
  <Card 
    className={`terminal-panel relative overflow-hidden group cursor-pointer card-hover-glow rounded-xl animate-float-up stagger-${Math.min(index + 1, 6)}`}
    style={{ opacity: 0 }}
    onClick={() => onSelect(title)}
    id={`metric-card-${title}`}
  >
    {/* Top accent line */}
    <div className={`absolute top-0 left-0 right-0 h-px ${isPositive ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent'}`} />
    
    <div 
      className={`absolute top-2.5 right-2.5 p-1.5 z-10 transition-all duration-200 rounded-md hover:bg-white/5 ${isFavorite ? "text-[var(--gold)]" : "text-[#2a2a35] group-hover:text-[#3a3a45]"}`}
      onClick={(e) => onToggleFavorite(e, title)}
    >
      <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
    </div>

    <CardHeader className="pb-2 pt-3.5 px-4">
      <CardTitle className="text-[11px] font-data font-medium text-[#5a5a5a] uppercase tracking-wider flex items-center gap-2">
        <Activity className="w-3 h-3 text-[var(--gold-dim)]" />
        {title}
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
      </div>
    </CardContent>
  </Card>
);

export const MarketMetrics = ({ onSelect, favorites, onToggleFavorite }: { 
  onSelect: (symbol: string) => void, 
  favorites: string[],
  onToggleFavorite: (symbol: string) => void
}) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/state");
        const result = await res.json();
        if (result.status === "Success" && result.data.quotes_data) {
          setData(result.data.quotes_data);
        }
      } catch (e) {
        console.error("MarketMetrics fetch error:", e);
      }
    };
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, []);

  // 这里的 title 统一用品种名称，以便匹配切换逻辑
  const mappedMetrics = data.map(item => ({
    title: item.symbol,
    value: item.price.toLocaleString(),
    change: item.change_pc > 0 ? `+${item.change_pc}` : `${item.change_pc}`,
    isPositive: item.change_pc >= 0,
    isFavorite: favorites.includes(item.symbol)
  }));

  // 将自选项排在最前面
  const sortedMetrics = [...mappedMetrics].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
          <div>
            <h3 className="text-sm font-semibold text-[#e8e6e3] tracking-wide">市场实时看板</h3>
            <p className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">COMMODITIES LIVE</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--gold)]/5 border border-[var(--gold)]/10">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse-gold" />
          <span className="text-[10px] font-data text-[var(--gold-dim)] tracking-wider uppercase">Live</span>
        </div>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
        {sortedMetrics.map((metric, i) => (
          <MetricCard 
            key={i} 
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
    </div>
  );
};

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Zap, Wheat, Beaker, Globe, Clock, Hash, ArrowUpRight, ArrowDownRight, Minus, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewsItem {
  content: string;
  pub_date: string;
  source?: string;
  is_intl?: boolean;
  categories?: string[];
}

interface QuoteItem {
  symbol: string;
  price: number;
  change_pc: number;
}

interface IntelligencePanelProps {
  news: NewsItem[];
  onKeywordClick: (keyword: string) => void;
  activeFilter: string;
}

// ── 板块热力概览 ──
const SectorHeatmap = ({ news }: { news: NewsItem[] }) => {
  const sectorData = useMemo(() => {
    const geo = news.filter(n => n.categories?.includes("geopolitics")).length;
    const agri = news.filter(n => n.categories?.includes("agriculture")).length;
    const chem = news.filter(n => n.categories?.includes("chemicals_metals")).length;
    const total = Math.max(geo + agri + chem, 1);

    return [
      { key: "geo", label: "地缘宏观", labelEn: "GEOPOLITICS", count: geo, pct: Math.round(geo / total * 100), icon: Zap, color: "#f87171", bgColor: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.15)" },
      { key: "agri", label: "农产品", labelEn: "AGRICULTURE", count: agri, pct: Math.round(agri / total * 100), icon: Wheat, color: "#fbbf24", bgColor: "rgba(251, 191, 36, 0.08)", borderColor: "rgba(251, 191, 36, 0.15)" },
      { key: "chem", label: "能化有色", labelEn: "CHEM & METALS", count: chem, pct: Math.round(chem / total * 100), icon: Beaker, color: "#5b8def", bgColor: "rgba(91, 141, 239, 0.08)", borderColor: "rgba(91, 141, 239, 0.15)" },
    ];
  }, [news]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span className="text-xs font-semibold text-[#e8e6e3]">板块热力</span>
        </div>
        <span className="text-[9px] font-data text-[#3a3a3a] tracking-widest uppercase">Sector Heat</span>
      </div>
      <div className="space-y-2">
        {sectorData.map((sector, i) => (
          <div
            key={sector.key}
            className="rounded-lg p-2.5 border transition-[border-color,background-color] duration-200 cursor-default animate-float-up"
            style={{
              background: sector.bgColor,
              borderColor: sector.borderColor,
              animationDelay: `${i * 80}ms`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <sector.icon className="w-3.5 h-3.5" style={{ color: sector.color }} />
                <span className="text-xs font-medium" style={{ color: sector.color }}>{sector.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold font-data" style={{ color: sector.color }}>{sector.count}</span>
                <span className="text-[9px] font-data text-[#5a5a5a]">条</span>
              </div>
            </div>
            {/* Heat bar */}
            <div className="h-1 rounded-full bg-[#1a1a1f] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.max(sector.pct, 3)}%`,
                  background: `linear-gradient(90deg, ${sector.color}88, ${sector.color})`,
                  boxShadow: `0 0 8px ${sector.color}40`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] font-data tracking-widest text-[#3a3a3a] uppercase">{sector.labelEn}</span>
              <span className="text-[9px] font-data" style={{ color: sector.color }}>{sector.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── 热点关键词标签 ──
const HotKeywords = ({ news, onKeywordClick, activeFilter }: {
  news: NewsItem[];
  onKeywordClick: (kw: string) => void;
  activeFilter: string;
}) => {
  const keywords = useMemo(() => {
    const hotTerms = [
      "原油", "天然气", "美联储", "降息", "关税", "制裁",
      "USDA", "CBOT", "减产", "干旱", "豆粕", "玉米",
      "铜", "螺纹钢", "纯碱", "PTA", "中东", "俄乌",
      "大豆", "棉花", "甲醇", "尿素", "生猪", "白糖",
    ];
    const freq: Record<string, number> = {};
    for (const term of hotTerms) {
      const count = news.filter(n => n.content.toLowerCase().includes(term.toLowerCase())).length;
      if (count > 0) freq[term] = count;
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [news]);

  if (keywords.length === 0) return null;

  const maxCount = keywords[0]?.[1] || 1;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span className="text-xs font-semibold text-[#e8e6e3]">热点标签</span>
        </div>
        <span className="text-[9px] font-data text-[#3a3a3a] tracking-widest uppercase">Hot Tags</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map(([kw, count], i) => {
          const intensity = count / maxCount;
          const isActive = activeFilter.toLowerCase() === kw.toLowerCase();
          return (
            <button
              key={kw}
              onClick={() => onKeywordClick(isActive ? "" : kw)}
              className={`
                px-2 py-1 rounded-md text-[10px] font-data tracking-wide border transition-[border-color,background-color,color,transform] duration-200 cursor-pointer
                active:scale-95
                ${isActive
                  ? 'bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/30 shadow-sm shadow-[var(--gold)]/10'
                  : 'bg-[#131316] border-[#262630] hover:border-[#3a3a3a] hover:bg-[#1a1a1f]'
                }
              `}
              style={{
                color: isActive ? undefined : `rgba(232, 230, 227, ${0.35 + intensity * 0.55})`,
                animationDelay: `${i * 40}ms`,
              }}
            >
              {kw}
              <span className="ml-1 opacity-50">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── 关键行情速览 ──
const QuickTicker = () => {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        // 使用相对路径，通过 Vite 代理访问后端
        const res = await fetch("/api/state");
        const result = await res.json();
        if (result.status === "Success" && result.data?.quotes_data) {
          setQuotes(result.data.quotes_data.slice(0, 6));
        }
      } catch (e) {
        console.error("Fetch quotes for ticker:", e);
      }
    };
    fetchQuotes();
    const timer = setInterval(fetchQuotes, 30000);
    return () => clearInterval(timer);
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span className="text-xs font-semibold text-[#e8e6e3]">行情速览</span>
        </div>
        <span className="text-[9px] font-data text-[#3a3a3a] tracking-widest uppercase">Quick Ticker</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {quotes.map((q, i) => {
          const isUp = q.change_pc > 0;
          const isFlat = q.change_pc === 0;
          const color = isFlat ? "#5a5a5a" : isUp ? "#4ade80" : "#f87171";
          const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
          return (
            <div
              key={q.symbol}
              className="rounded-lg p-2 border border-[#1e1e28] bg-[#0d0d0f]/60 hover:border-[#262630] transition-[border-color] duration-200 cursor-default animate-float-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-[#7a7a85] truncate">{q.symbol}</span>
                <Icon className="w-2.5 h-2.5" style={{ color }} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold font-data text-[#e8e6e3]">
                  {q.price?.toLocaleString()}
                </span>
                <span className="text-[9px] font-data" style={{ color }}>
                  {isUp ? "+" : ""}{q.change_pc}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── 最新事件时间线 ──
const EventTimeline = ({ news }: { news: NewsItem[] }) => {
  const events = useMemo(() => {
    // 取前8条地缘宏观新闻作为关键事件
    const geoNews = news.filter(n => n.categories?.includes("geopolitics"));
    return geoNews.slice(0, 6).map(n => {
      const cleanContent = n.content.replace("[全球宏观预警] ", "").replace(/【.*?】/, "");
      // 截取前40个字符作为摘要
      const summary = cleanContent.length > 50 ? cleanContent.substring(0, 50) + "..." : cleanContent;
      // 提取时间
      const timeMatch = n.pub_date?.match(/(\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : n.pub_date?.slice(-5) || "--:--";
      return { summary, time, source: n.source };
    });
  }, [news]);

  if (events.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span className="text-xs font-semibold text-[#e8e6e3]">事件脉络</span>
        </div>
        <span className="text-[9px] font-data text-[#3a3a3a] tracking-widest uppercase">Timeline</span>
      </div>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--gold)]/30 via-[#262630] to-transparent" />

        <div className="space-y-2.5">
          {events.map((event, i) => (
            <div
              key={i}
              className="flex gap-3 items-start group animate-float-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Dot */}
              <div className="relative mt-1.5 shrink-0">
                <div className={`w-[10px] h-[10px] rounded-full border-2 transition-all duration-200 ${
                  i === 0
                    ? 'border-[var(--gold)] bg-[var(--gold)]/30 shadow-[0_0_6px_rgba(212,168,83,0.3)]'
                    : 'border-[#3a3a3a] bg-[#131316] group-hover:border-[var(--gold-dim)]'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-data text-[var(--gold-dim)] tracking-wider">{event.time}</span>
                  {event.source && (
                    <span className="text-[8px] font-data text-[#3a3a3a] tracking-wider uppercase">{event.source}</span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-[#8a8a8a] group-hover:text-[#b0aca5] transition-colors duration-200">
                  {event.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── 主面板 ──
export const IntelligencePanel = ({ news, onKeywordClick, activeFilter }: IntelligencePanelProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-[#1e1e28] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/5 border border-[var(--gold)]/15 flex items-center justify-center">
            <Globe className="w-3 h-3 text-[var(--gold)]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#e8e6e3]">情报态势</h3>
            <p className="text-[8px] font-data text-[#3a3a3a] tracking-widest uppercase mt-0.5">Intelligence Brief</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <SectorHeatmap news={news} />

          <div className="h-px bg-gradient-to-r from-transparent via-[#262630] to-transparent" />

          <HotKeywords news={news} onKeywordClick={onKeywordClick} activeFilter={activeFilter} />

          <div className="h-px bg-gradient-to-r from-transparent via-[#262630] to-transparent" />

          <QuickTicker />

          <div className="h-px bg-gradient-to-r from-transparent via-[#262630] to-transparent" />

          <EventTimeline news={news} />
        </div>
      </ScrollArea>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)]/15 to-transparent shrink-0" />
    </div>
  );
};

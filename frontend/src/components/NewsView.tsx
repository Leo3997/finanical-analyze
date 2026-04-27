import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, AlertTriangle, Clock, Search, Sparkles, Loader2, Zap, Wheat, Beaker, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IntelligencePanel } from "./IntelligencePanel";

interface NewsItem {
  content: string;
  pub_date: string;
  source?: string;
  is_intl?: boolean;
  categories?: string[];
}

export const NewsView = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      // 使用相对路径，通过 Vite 代理访问后端
      const res = await fetch("/api/news");
      const result = await res.json();
      if (result.status === "Success") {
        setNews(result.data);
      }
    } catch (e) {
      console.error("Fetch news error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepAnalysis = async () => {
    if (news.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze_news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news: news.slice(0, 15) })
      });
      const result = await res.json();
      if (result.status === "Success") {
        setAiAnalysis(result.analysis);
      }
    } catch (e) {
      console.error("AI Analysis error:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const timer = setInterval(fetchNews, 30000);
    return () => clearInterval(timer);
  }, []);

  const filteredNews = news.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(filter.toLowerCase()) ||
                         (item.source && item.source.toLowerCase().includes(filter.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && item.categories?.includes(activeTab);
  });




  return (
    <div className="animate-in fade-in duration-500 h-[calc(100vh-72px)]">
      {/* Header bar */}
      <div className="sticky top-0 z-50 bg-[#09090b]/95 backdrop-blur-md border-b border-[#1e1e28] py-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[var(--gold)] to-[var(--gold-dim)]" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#e8e6e3]">行业研报与全球快讯</h2>
              <p className="text-[10px] font-data text-[#5a5a5a] tracking-wider uppercase mt-0.5">Intelligence Feed · Real-time</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gold-dim)] font-data text-xs select-none">›</span>
              <input 
                type="text" 
                placeholder="搜索关键词..." 
                className="w-full bg-[#131316] border border-[#262630] rounded-lg py-2 pl-7 pr-4 text-sm text-[#e8e6e3] font-data placeholder:text-[#3a3a3a] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]/30 focus:border-[var(--gold)]/30 transition-all"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                id="news-search-input"
              />
            </div>
            <Button 
              onClick={handleDeepAnalysis} 
              disabled={analyzing || news.length === 0}
              className="bg-gradient-to-r from-[var(--gold-dim)] to-[var(--gold)] hover:from-[var(--gold)] hover:to-[var(--gold-bright)] text-[#09090b] font-semibold shadow-lg shadow-[var(--gold)]/10 border border-[var(--gold)]/30 shrink-0 transition-all duration-200 cursor-pointer text-xs"
              id="ai-analysis-btn"
            >
              {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              AI 深度解析
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout: Left panel + Right news */}
      <div className="flex h-[calc(100%-72px)]">
        {/* Left: Intelligence Panel */}
        <div className="hidden lg:block w-[280px] shrink-0 border-r border-[#1e1e28] bg-[#0d0d0f]/50">
          <IntelligencePanel
            news={news}
            onKeywordClick={(kw) => setFilter(kw)}
            activeFilter={filter}
          />
        </div>

        {/* Right: News Feed */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Tabs defaultValue="all" className="h-full flex flex-col">
            {/* Tab navigation */}
            <div className="sticky top-0 z-40 bg-[#09090b]/95 backdrop-blur-sm border-b border-[#1e1e28] shrink-0">
              <div className="flex items-center justify-between py-2 px-4">
                <TabsList className="bg-transparent border-0 p-0 gap-1">
                  {[
                    { value: 'all', label: '全部', icon: Globe, color: 'var(--gold)' },
                    { value: 'geopolitics', label: '地缘宏观', icon: Zap, color: '#f87171' },
                    { value: 'agriculture', label: '农产品', icon: Wheat, color: '#fbbf24' },
                    { value: 'chemicals_metals', label: '能化有色', icon: Beaker, color: '#5b8def' },
                  ].map(tab => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value} 
                      className={`
                        border border-transparent rounded-lg px-3.5 py-1.5 h-auto text-xs font-medium transition-all duration-200 cursor-pointer
                        data-[state=active]:border-[${tab.color}]/20 data-[state=active]:bg-[${tab.color}]/8
                      `}
                      style={{
                        '--tab-color': tab.color,
                      } as React.CSSProperties}
                      onClick={() => setActiveTab(tab.value)}
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" style={{ color: activeTab === tab.value ? tab.color : '#5a5a5a' }} /> 
                      <span style={{ color: activeTab === tab.value ? tab.color : '#7a7a85' }}>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#262630] bg-[#131316]">
                  <Activity className="w-3 h-3 text-[var(--gold-dim)]" />
                  <span className="text-[10px] font-data text-[#5a5a5a] tracking-wider">{filteredNews.length}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis panel */}
            {aiAnalysis && (
              <div className="mx-4 my-4 animate-in slide-in-from-top duration-500 shrink-0">
                <Card className="terminal-panel rounded-xl border-[var(--gold)]/20 overflow-hidden">
                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)]/50 to-transparent" />
                  <CardHeader className="bg-[var(--gold)]/[0.03] border-b border-[var(--gold)]/10 py-3 px-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/15">
                          <Sparkles className="w-4 h-4 text-[var(--gold)]" />
                        </div>
                        <div>
                          <CardTitle className="text-[var(--gold)] text-sm font-semibold">AI 智能板块深度分析</CardTitle>
                          <p className="text-[10px] font-data text-[#5a5a5a] mt-0.5 tracking-wider uppercase">Powered by LLM</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2.5 text-[10px] font-data tracking-wider uppercase hover:bg-[var(--gold)]/10 text-[#5a5a5a] hover:text-[var(--gold-dim)] border border-transparent hover:border-[var(--gold)]/15 transition-all cursor-pointer"
                        onClick={() => setAiAnalysis(null)}
                      >
                        关闭
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px] w-full">
                      <div className="p-5 report-content prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {aiAnalysis}
                        </ReactMarkdown>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* News list */}
            <TabsContent value={activeTab} className="mt-0 flex-1 overflow-hidden">
              <div className="h-full">
                <Card className="terminal-panel-scroll rounded-none border-0 border-t border-[#1e1e28] h-full">
                  <ScrollArea className="h-full">
                    {loading ? (
                      <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/10 animate-pulse-gold">
                          <Loader2 className="w-7 h-7 animate-spin text-[var(--gold)]" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm text-[#8a8a8a]">同步全球产业链情报中...</p>
                          <p className="text-[10px] font-data text-[#3a3a3a] tracking-wider uppercase">Fetching Intelligence Feed</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {filteredNews.map((item, i) => {
                          const isGlobalAlert = item.content.includes("[全球宏观预警]") || item.categories?.includes("geopolitics");
                          const cleanContent = item.content.replace("[全球宏观预警]", "").trim();

                          return (
                            <div 
                              key={i} 
                              className="px-5 py-3.5 hover:bg-white/[0.015] transition-all duration-200 cursor-pointer group border-b border-[#1e1e28] last:border-0"
                              style={{ animationDelay: `${i * 30}ms` }}
                            >
                              <div className="flex gap-4 items-start">
                                {/* Category color bar */}
                                <div className={`mt-1 w-0.5 h-10 rounded-full shrink-0 ${
                                  isGlobalAlert ? 'bg-gradient-to-b from-red-400 to-red-500/30' : 
                                  item.categories?.includes("agriculture") ? 'bg-gradient-to-b from-amber-400 to-amber-500/30' :
                                  'bg-gradient-to-b from-[var(--cold-blue)] to-[var(--cold-blue)]/30'
                                }`} />
                                
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {isGlobalAlert && (
                                        <Badge className="bg-red-500/8 text-red-400 border border-red-500/15 px-2 py-0.5 h-5 text-[10px] font-data tracking-wider uppercase">
                                          <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                          GEO
                                        </Badge>
                                      )}
                                      {item.is_intl && (
                                        <Badge className="bg-[var(--cold-blue)]/8 text-[var(--cold-blue)] border border-[var(--cold-blue)]/15 px-2 py-0.5 h-5 text-[10px] font-data tracking-wider uppercase">
                                          INTL
                                        </Badge>
                                      )}
                                      {item.source && (
                                        <Badge variant="outline" className="text-[#5a5a5a] border-[#262630] px-2 py-0.5 h-5 text-[10px] font-data tracking-wider">
                                          {item.source}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-data text-[#3a3a3a] tracking-wider">
                                      <Clock className="w-3 h-3" />
                                      {item.pub_date}
                                    </div>
                                  </div>
                                  <p className={`text-sm leading-relaxed ${isGlobalAlert ? "text-[#c4c0b8] font-medium" : "text-[#8a8a8a]"}`}>
                                    {cleanContent}
                                  </p>
                                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {item.categories?.map(cat => (
                                      <span key={cat} className="text-[9px] font-data uppercase tracking-widest text-[#3a3a3a] bg-[#131316] px-2 py-0.5 rounded border border-[#1e1e28] hover:border-[#262630] hover:text-[#5a5a5a] transition-all cursor-default">
                                        #{cat}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {filteredNews.length === 0 && (
                          <div className="p-20 text-center flex flex-col items-center gap-3">
                            <div className="p-4 rounded-xl border border-[#262630] bg-[#0d0d0f]">
                              <Search className="w-8 h-8 text-[#2a2a35]" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-[#5a5a5a]">当前板块暂无相关情报</p>
                              <p className="text-[10px] font-data text-[#3a3a3a] tracking-wider uppercase">No matching entries</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

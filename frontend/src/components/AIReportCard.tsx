import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AIReportCard = ({ report }: { report: string }) => {
  return (
    <Card className="terminal-panel h-[600px] flex flex-col min-h-0 overflow-hidden rounded-xl" id="ai-report-card">
      {/* Accent top bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5 space-y-0 border-b border-[#1e1e28] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--gold)]/8 border border-[var(--gold)]/15 animate-pulse-gold">
            <Sparkles className="w-4.5 h-4.5 text-[var(--gold)]" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-[#e8e6e3]">AI 智能研报</CardTitle>
            <p className="text-[10px] font-data text-[#5a5a5a] flex items-center gap-1.5 mt-1 tracking-wider uppercase">
              <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString()} · Deep Analysis
            </p>
          </div>
        </div>
        <Badge className="bg-[var(--gold)]/8 text-[var(--gold-dim)] border border-[var(--gold)]/15 text-[10px] font-data tracking-wider uppercase px-2.5 py-1">
          GPT-4
        </Badge>
      </CardHeader>
      
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-5">
            {report ? (
              <div className="report-content pb-16">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-xl border border-[#262630] bg-[#0d0d0f]">
                  <FileText className="w-10 h-10 text-[#2a2a35]" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm text-[#5a5a5a]">暂无今日研报</p>
                  <p className="text-[11px] font-data text-[#3a3a3a] tracking-wider">AWAITING DATA INPUT</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#131316] to-transparent pointer-events-none z-10" />
      </div>
    </Card>
  );
};

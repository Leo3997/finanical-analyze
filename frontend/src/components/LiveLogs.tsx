import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";


export const LiveLogs = ({ logs }: { logs: string[] }) => {
  return (
    <Card className="terminal-panel overflow-hidden flex flex-col h-[280px] rounded-xl" id="live-logs-panel">
      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--gold)]/20 to-transparent" />
      
      <CardHeader className="py-2 px-4 border-b border-[#1e1e28] flex flex-row items-center justify-between bg-[#0d0d0f]/60">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-3.5 h-3.5 text-[var(--gold-dim)]" />
          <CardTitle className="text-[10px] font-data uppercase tracking-[0.2em] text-[#5a5a5a]">System Log</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-data text-[#3a3a3a] tracking-wider">{logs.length} entries</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500/30 border border-red-500/20" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/30 border border-yellow-500/20" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/30 border border-emerald-500/20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden font-data text-[12px]">
        <ScrollArea className="h-full px-4 py-2.5">
          <div className="space-y-0.5">
            {logs.length > 0 ? logs.map((log, i) => {
              const isError = log.includes('ERROR') || log.includes('Exception');
              const isWarning = log.includes('WARNING');
              const isInfo = log.includes('INFO');
              
              return (
                <div key={i} className="flex gap-2.5 py-0.5 animate-in fade-in slide-in-from-left-2 duration-300 hover:bg-white/[0.015] rounded px-1 -mx-1 transition-colors">
                  <span className="text-[#2a2a35] shrink-0 select-none w-8 text-right">{i.toString().padStart(3, '0')}</span>
                  <span className="text-[#262630] select-none">│</span>
                  <span className={
                    isError ? "text-red-400/80" : 
                    isWarning ? "text-[var(--gold)]" : 
                    isInfo ? "text-[var(--cold-blue)]/70" : 
                    "text-[#6a6a6a]"
                  }>
                    {log}
                  </span>
                </div>
              );
            }) : (
              <div className="flex items-center justify-center h-48 text-[#2a2a35]">
                <span className="font-data text-xs tracking-wider">
                  <span className="text-[var(--gold-dim)] animate-blink mr-1">▊</span>
                  AWAITING LOG STREAM...
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

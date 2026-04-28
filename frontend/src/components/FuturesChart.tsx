import { useState, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Bar, Cell } from 'recharts';
import { BarChart3, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ChartDataPoint {
  time: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  isNightSession?: boolean;
  isAfterHours?: boolean;
}

interface FuturesChartProps {
  data: ChartDataPoint[];
  symbol: string;
  chartType: 'time' | 'candlestick';
  klinePeriod: '1' | 'daily';
  onChartTypeChange: (type: 'time' | 'candlestick') => void;
  onKlinePeriodChange: (period: '1' | 'daily') => void;
}

// 判断时间是否属于夜盘时段（21:00 - 次日 9:00）
const isNightSession = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const hour = parseInt(timeStr.split(':')[0]);
  return hour >= 21 || hour < 9;
};

// 判断是否为盘后时段
const isAfterHours = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const hour = parseInt(timeStr.split(':')[0]);
  return (hour >= 15 && hour < 21) || (hour >= 0 && hour < 9);
};

// 自定义 Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#131316] border border-[#262630] rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-[var(--gold-dim)]" />
          <span className="text-[9px] font-data text-[#d4d0c8] tracking-wider uppercase">{label}</span>
        </div>
        
        {data.open !== undefined && data.high !== undefined ? (
          // K 线图数据
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#d4d0c8]">开盘:</span>
              <span className="text-[#e8e6e3]">{data.open?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#d4d0c8]">最高:</span>
              <span className="text-emerald-400">{data.high?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#d4d0c8]">最低:</span>
              <span className="text-red-400">{data.low?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#d4d0c8]">收盘:</span>
              <span className="text-[#e8e6e3]">{data.close?.toLocaleString()}</span>
            </div>
            {data.volume !== undefined && (
              <div className="flex justify-between gap-4 text-[10px] font-data pt-1 border-t border-[#1e1e28] mt-1">
                <span className="text-[#d4d0c8]">成交量:</span>
                <span className="text-[var(--gold)]">{data.volume.toLocaleString()}</span>
              </div>
            )}
          </div>
        ) : (
          // 分时图数据
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#d4d0c8]">价格:</span>
              <span className="text-[var(--gold)]">{(data.close || data.price)?.toLocaleString()}</span>
            </div>
            {data.volume !== undefined && (
              <div className="flex justify-between gap-4 text-[10px] font-data pt-1 border-t border-[#1e1e28] mt-1">
                <span className="text-[#d4d0c8]">成交量:</span>
                <span className="text-[var(--gold)]">{data.volume.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
        
        {data.isNightSession && (
          <div className="mt-2 pt-2 border-t border-[#1e1e28]">
            <Badge className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              夜盘时段
            </Badge>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const FuturesChart = ({ data, symbol, chartType, klinePeriod, onChartTypeChange, onKlinePeriodChange }: FuturesChartProps) => {
  const [showVolume, setShowVolume] = useState(true);

  // 处理数据，添加时段标记
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => ({
      ...item,
      isNightSession: isNightSession(item.time),
      isAfterHours: isAfterHours(item.time),
      // 确保数值类型正确
      open: item.open ? parseFloat(String(item.open)) : 0,
      high: item.high ? parseFloat(String(item.high)) : 0,
      low: item.low ? parseFloat(String(item.low)) : 0,
      close: item.close ? parseFloat(String(item.close)) : 0,
      price: item.close || item.price || 0,
      volume: item.volume ? parseInt(String(item.volume)) : 0,
    }));
  }, [data]);

  // 计算涨跌颜色
  const getPriceColor = () => {
    if (processedData.length < 2) return '#e8e6e3';
    const firstPrice = processedData[0].close || 0;
    const lastPrice = processedData[processedData.length - 1].close || 0;
    return lastPrice >= firstPrice ? '#4ade80' : '#f87171';
  };

  // 计算涨跌幅
  const priceChange = useMemo(() => {
    if (processedData.length < 2) return { value: 0, percent: 0 };
    const firstPrice = processedData[0].close || 0;
    const lastPrice = processedData[processedData.length - 1].close || 0;
    const change = lastPrice - firstPrice;
    const percent = firstPrice !== 0 ? (change / firstPrice) * 100 : 0;
    return { value: change, percent };
  }, [processedData]);

  // K 线颜色数组（用于 Bar 图表）
  const candlestickColors = useMemo(() => {
    return processedData.map(item => {
      const isUp = item.close >= item.open;
      return isUp ? '#4ade80' : '#f87171';
    });
  }, [processedData]);

  return (
    <div className="flex flex-col h-full">
      {/* Chart Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--gold)]" />
            <span className="font-semibold text-sm text-[#e8e6e3]">{symbol}</span>
          </div>
          
          {/* 价格变动指示器 */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-data font-semibold ${
            priceChange.value >= 0 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
              : "bg-red-500/10 text-red-400 border border-red-500/15"
          }`}>
            {priceChange.value >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{priceChange.value >= 0 ? '+' : ''}{priceChange.value.toFixed(2)}</span>
            <span>({priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={chartType === 'time' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onChartTypeChange('time')}
            className={`h-8 px-3 text-xs ${
              chartType === 'time'
                ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 hover:bg-[var(--gold)]/15'
                : 'bg-transparent text-[#d4d0c8] border border-[#262630] hover:bg-white/[0.03]'
            }`}
          >
            分时图
          </Button>
          <Button
            variant={chartType === 'candlestick' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onChartTypeChange('candlestick')}
            className={`h-8 px-3 text-xs ${
              chartType === 'candlestick'
                ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 hover:bg-[var(--gold)]/15'
                : 'bg-transparent text-[#d4d0c8] border border-[#262630] hover:bg-white/[0.03]'
            }`}
          >
            K 线图
          </Button>
          
          {chartType === 'candlestick' && (
            <>
              <div className="w-px h-5 bg-[#262630]" />
              <Button
                variant={klinePeriod === '1' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => onKlinePeriodChange('1')}
                className={`h-8 px-2 text-xs ${
                  klinePeriod === '1'
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20'
                    : 'bg-transparent text-[#d4d0c8] border border-[#262630]'
                }`}
              >
                1分
              </Button>
              <Button
                variant={klinePeriod === 'daily' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => onKlinePeriodChange('daily')}
                className={`h-8 px-2 text-xs ${
                  klinePeriod === 'daily'
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20'
                    : 'bg-transparent text-[#d4d0c8] border border-[#262630]'
                }`}
              >
                日K
              </Button>
              <Button
                variant={showVolume ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setShowVolume(!showVolume)}
                className={`h-8 px-2 text-xs ${
                  showVolume
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20'
                    : 'bg-transparent text-[#d4d0c8] border border-[#262630]'
                }`}
                title="显示/隐藏成交量"
              >
                量
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-0 w-full relative">
        {processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData}>
              {chartType === 'time' && (
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getPriceColor()} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getPriceColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
              )}
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e28" />
              
              <XAxis 
                dataKey="time" 
                stroke="#3a3a3a" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false} 
                fontFamily="JetBrains Mono"
                interval="preserveStartEnd"
                tickFormatter={(tick) => {
                  if (klinePeriod === 'daily') {
                    // 日K线显示月-日格式 (YYYY-MM-DD -> MM-DD)
                    return tick.slice(5);
                  }
                  // 分时图只显示关键时间点
                  const keyTimes = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '21:00', '22:00', '23:00'];
                  return keyTimes.includes(tick) ? tick : '';
                }}
              />
              <YAxis 
                stroke="#3a3a3a" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false} 
                domain={['auto', 'auto']}
                tickFormatter={(val) => val.toLocaleString()}
                fontFamily="JetBrains Mono"
                width={45}
                yAxisId="left"
              />
              {chartType === 'candlestick' && showVolume && (
                <YAxis 
                  stroke="#3a3a3a" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false} 
                  fontFamily="JetBrains Mono"
                  width={35}
                  orientation="right"
                  yAxisId="right"
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              
              {chartType === 'time' ? (
                // 分时图 - 使用 Area 渲染
                <>
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="close" 
                    stroke={getPriceColor()} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#priceGradient)" 
                    animationDuration={300}
                  />
                </>
              ) : (
                // K 线图 - 使用简化的 Bar 方式渲染
                <>
                  {/* 使用 Line 显示最高价和最低价的影线效果 */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="high"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="low"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={false}
                    isAnimationActive={false}
                  />
                  
                  {/* K 线实体 - 使用 Bar 显示收盘价 */}
                  <Bar
                    yAxisId="left"
                    dataKey="close"
                    isAnimationActive={false}
                    radius={[2, 2, 2, 2]}
                  >
                    {processedData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={candlestickColors[index]}
                      />
                    ))}
                  </Bar>
                  
                  {/* 成交量 */}
                  {showVolume && (
                    <Bar 
                      yAxisId="right"
                      dataKey="volume" 
                      fill="rgba(212, 168, 83, 0.3)"
                      stroke="none"
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-[#1e1e28]">
            <div className="text-center space-y-2 px-4">
              <p className="text-xs sm:text-sm text-[#d4d0c8]">正在加载 {symbol} 分时数据...</p>
              <p className="text-[9px] sm:text-[10px] font-data text-[#c8c4bc] tracking-wider uppercase">Loading intraday data</p>
            </div>
          </div>
        )}
      </div>

      {/* Session Legend */}
      <div className="mt-3 pt-3 border-t border-[#1e1e28] flex items-center justify-between text-[9px] font-data text-[#d4d0c8]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            <span>日盘 (09:00-15:00)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-indigo-500/20 border border-indigo-500/30" />
            <span>夜盘 (21:00-次日 09:00)</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>交易时段</span>
        </div>
      </div>
    </div>
  );
};

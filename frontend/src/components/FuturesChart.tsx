import { useState, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Bar, ReferenceLine } from 'recharts';
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
  const hour = parseInt(timeStr.split(':')[0]);
  return hour >= 21 || hour < 9;
};

// 判断是否为盘后时段
const isAfterHours = (timeStr: string): boolean => {
  const hour = parseInt(timeStr.split(':')[0]);
  return (hour >= 15 && hour < 21) || (hour >= 0 && hour < 9);
};

const renderSessionBackground = (data: ChartDataPoint[]) => {
  const sessions = [];
  let currentSessionStart = 0;
  let inNightSession = data[0]?.isNightSession || false;

  for (let i = 1; i < data.length; i++) {
    if (data[i].isNightSession !== inNightSession) {
      sessions.push({
        start: currentSessionStart,
        end: i - 1,
        type: inNightSession ? 'night' : 'day'
      });
      currentSessionStart = i;
      inNightSession = data[i].isNightSession || false;
    }
  }
  
  sessions.push({
    start: currentSessionStart,
    end: data.length - 1,
    type: inNightSession ? 'night' : 'day'
  });

  return sessions;
};

// 自定义 Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#131316] border border-[#262630] rounded-lg p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-[var(--gold-dim)]" />
          <span className="text-[9px] font-data text-[#5a5a5a] tracking-wider uppercase">{label}</span>
        </div>
        
        {data.open !== undefined ? (
          // K 线图数据
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#5a5a5a]">开盘:</span>
              <span className="text-[#e8e6e3]">{data.open?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#5a5a5a]">最高:</span>
              <span className="text-emerald-400">{data.high?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#5a5a5a]">最低:</span>
              <span className="text-red-400">{data.low?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#5a5a5a]">收盘:</span>
              <span className="text-[#e8e6e3]">{data.close?.toLocaleString()}</span>
            </div>
            {data.volume && (
              <div className="flex justify-between gap-4 text-[10px] font-data pt-1 border-t border-[#1e1e28] mt-1">
                <span className="text-[#5a5a5a]">成交量:</span>
                <span className="text-[var(--gold)]">{data.volume.toLocaleString()}</span>
              </div>
            )}
          </div>
        ) : (
          // 分时图数据
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-[10px] font-data">
              <span className="text-[#5a5a5a]">价格:</span>
              <span className="text-[var(--gold)]">{data.price?.toLocaleString()}</span>
            </div>
            {data.volume && (
              <div className="flex justify-between gap-4 text-[10px] font-data pt-1 border-t border-[#1e1e28] mt-1">
                <span className="text-[#5a5a5a]">成交量:</span>
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

// 自定义 K 线渲染形状
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  if (!payload || (payload.open === undefined && payload.close === undefined)) {
    console.log('CandlestickShape 跳过渲染: 数据不完整', { 
      payload: payload ? 'exists' : 'null',
      hasOpen: payload?.open !== undefined,
      hasClose: payload?.close !== undefined
    });
    return null;
  }
  
  const open = payload.open || payload.close || 0;
  const close = payload.close || payload.open || 0;
  const high = payload.high || Math.max(open, close);
  const low = payload.low || Math.min(open, close);
  
  const isUp = close >= open;
  const color = isUp ? '#4ade80' : '#f87171';
  
  // 尝试从 props 中获取 yScale 函数（Recharts 会传递）
  const yScale = props.yScale || props.yAxis?.yScale;
  
  console.log('CandlestickShape 渲染:', {
    x, y, width, height,
    open, high, low, close,
    hasYScale: !!yScale,
    klinePeriod: props.klinePeriod
  });
  
  if (!yScale) {
    // 备用方案：使用 Bar 提供的 y 和 height 作为实体
    const candleWidth = Math.max(width - 2, 1);
    const centerX = x + width / 2;
    
    // 使用 Bar 提供的 y 和 height 作为实体
    const bodyTop = y;
    const bodyHeight = Math.max(height, 1);
    
    console.log('使用备用方案渲染 K 线');
    
    // 估算影线（没有 yScale 时简化处理）
    return (
      <g>
        {/* 上影线 - 估算 */}
        <line
          x1={centerX}
          y1={bodyTop - 5}
          x2={centerX}
          y2={bodyTop}
          stroke={color}
          strokeWidth={1}
        />
        {/* 下影线 - 估算 */}
        <line
          x1={centerX}
          y1={bodyTop + bodyHeight}
          x2={centerX}
          y2={bodyTop + bodyHeight + 5}
          stroke={color}
          strokeWidth={1}
        />
        {/* 实体 */}
        <rect
          x={x + 1}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
        />
      </g>
    );
  }
  
  // 使用 scale 函数计算各价格的 Y 坐标
  const openY = yScale(open);
  const closeY = yScale(close);
  const highY = yScale(high);
  const lowY = yScale(low);
  
  const candleWidth = Math.max(width - 2, 1);
  const centerX = x + width / 2;
  
  // 实体部分的 Y 坐标和高度
  const bodyTop = Math.min(openY, closeY);
  // 日 K 线最小高度 2 像素，1 分钟 K 线最小高度 3 像素
  const minBodyHeight = props.klinePeriod === 'daily' ? 2 : 3;
  const bodyHeight = Math.max(Math.abs(openY - closeY), minBodyHeight);
  
  return (
    <g>
      {/* 上影线 */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1}
      />
      {/* 下影线 */}
      <line
        x1={centerX}
        y1={bodyTop + bodyHeight}
        x2={centerX}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      {/* 实体 */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
      />
    </g>
  );
};

export const FuturesChart = ({ data, symbol, chartType, klinePeriod, onChartTypeChange, onKlinePeriodChange }: FuturesChartProps) => {
  const [showVolume, setShowVolume] = useState(true);

  // 调试信息
  console.log('FuturesChart 收到数据:', {
    symbol,
    chartType,
    klinePeriod,
    dataLength: data?.length,
    firstItem: data?.[0]
  });

  // 处理数据，添加时段标记
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      console.log('数据为空，返回空数组');
      return [];
    }
    
    // 计算价格范围
    const prices = data.map(d => d.close || d.open || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    console.log('价格范围:', { minPrice, maxPrice });
    
    return data.map(item => ({
      ...item,
      isNightSession: isNightSession(item.time),
      isAfterHours: isAfterHours(item.time),
      // K 线图数据处理
      open: item.open || item.close || 0,
      high: item.high || item.close || 0,
      low: item.low || item.close || 0,
      close: item.close || item.open || 0,
      // 分时图使用 close 作为 price
      price: item.close || item.open || 0,
      // 确保 volume 有默认值
      volume: item.volume || 0,
      // 添加价格范围用于绘制
      _minPrice: minPrice,
      _maxPrice: maxPrice,
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
                : 'bg-transparent text-[#5a5a5a] border border-[#262630] hover:bg-white/[0.03]'
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
                : 'bg-transparent text-[#5a5a5a] border border-[#262630] hover:bg-white/[0.03]'
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
                    : 'bg-transparent text-[#5a5a5a] border border-[#262630]'
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
                    : 'bg-transparent text-[#5a5a5a] border border-[#262630]'
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
                    : 'bg-transparent text-[#5a5a5a] border border-[#262630]'
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
      <div className={`flex-1 w-full relative ${klinePeriod === 'daily' ? 'overflow-x-auto' : ''}`}>
        {processedData.length > 0 ? (
          <div style={klinePeriod === 'daily' ? { minWidth: '800px', width: `${Math.max(processedData.length * 80, 800)}px` } : {}}>
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
              
              {/* 时段背景 */}
              {processedData.some(d => d.isNightSession) && (
                <ReferenceLine
                  ifOverflow="extendDomain"
                  xAxisId={0}
                  stroke="rgba(99, 102, 241, 0.05)"
                  fill="rgba(99, 102, 241, 0.05)"
                  segment={[
                    { x: '21:00' },
                    { x: '23:59' }
                  ]}
                />
              )}
              
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
                // 分时图
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
                // K 线图 - 使用自定义 Bar 渲染蜡烛图
                <>
                  {/* K 线图 - 使用自定义 shape 渲染 */}
                  <Bar
                    yAxisId="left"
                    dataKey="close"
                    shape={(props: any) => <CandlestickShape {...props} klinePeriod={klinePeriod} />}
                    isAnimationActive={false}
                  />
                  
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
        </div>
        ) : (
          <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-[#1e1e28]">
            <div className="text-center space-y-2 px-4">
              <p className="text-xs sm:text-sm text-[#5a5a5a]">正在加载 {symbol} 分时数据...</p>
              <p className="text-[9px] sm:text-[10px] font-data text-[#3a3a3a] tracking-wider uppercase">Loading intraday data</p>
            </div>
          </div>
        )}
      </div>

      {/* Session Legend */}
      <div className="mt-3 pt-3 border-t border-[#1e1e28] flex items-center justify-between text-[9px] font-data text-[#5a5a5a]">
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

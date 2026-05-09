import os
import logging
import matplotlib
matplotlib.use('Agg')
os.environ['MPLCONFIGDIR'] = '/tmp/matplotlib_cache'
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

plt.rcParams['font.sans-serif'] = ['WenQuanYi Micro Hei', 'Noto Sans CJK SC', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

COLORS = {
    'up': '#E74C3C',
    'down': '#27AE60',
    'ma10': '#3498DB',
    'bg': '#FAFBFC',
    'grid': '#E5E5E5',
    'title': '#2C3E50',
}

class ChartGenerator:
    def __init__(self, output_dir="chart_images"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.dpi = 150

    def generate_all_charts(self, fetcher, date_str="", position_rank_data=None):
        """生成汇总图表 + 持仓排名数据，返回 (type, name, path_or_data, analysis) 列表"""
        chart_paths = []
        
        core_varieties = ["玉米", "鸡蛋", "豆粕", "豆油", "白糖", "生猪", "豆二"]

        performance_path = self._generate_performance_barchart(fetcher, core_varieties, date_str)
        if performance_path:
            chart_paths.append(("performance", "全品种涨跌幅", performance_path, None))

        comparison_varieties = ["玉米", "鸡蛋", "豆粕", "豆油", "白糖"]
        comparison_path = self._generate_price_comparison(fetcher, comparison_varieties, date_str)
        if comparison_path:
            chart_paths.append(("comparison", "价格走势对比", comparison_path, None))

        if position_rank_data:
            chart_paths.append(("position_rank", "主力持仓排名", position_rank_data, None))
            logger.info(f"复用持仓排名数据: {len(position_rank_data)} 个品种")
        else:
            try:
                position_data = fetcher.get_position_rank(varieties=["玉米", "鸡蛋", "豆粕", "豆油", "白糖", "豆二"])
                if position_data:
                    chart_paths.append(("position_rank", "主力持仓排名", position_data, None))
                    logger.info(f"持仓排名数据获取成功: {len(position_data)} 个品种")
            except Exception as e:
                logger.warning(f"持仓排名获取失败: {e}")

        logger.info(f"共生成 {len(chart_paths)} 个图表/数据")
        return chart_paths

    def _generate_performance_barchart(self, fetcher, varieties, date_str=""):
        try:
            quotes = fetcher.get_futures_quotes(varieties)
            if not quotes:
                return None

            quotes.sort(key=lambda x: x['change_pc'], reverse=True)

            names = [q['symbol'] for q in quotes]
            changes = [q['change_pc'] for q in quotes]
            colors = [COLORS['up'] if c >= 0 else COLORS['down'] for c in changes]

            fig, ax = plt.subplots(figsize=(14, len(varieties) * 0.55 + 1.5), facecolor=COLORS['bg'])
            ax.set_facecolor(COLORS['bg'])

            bars = ax.barh(range(len(names)), changes, color=colors, height=0.6, alpha=0.9, edgecolor='white')

            for bar, val in zip(bars, changes):
                label = f'+{val:.2f}%' if val >= 0 else f'{val:.2f}%'
                ax.text(bar.get_width() + 0.05 if val >= 0 else bar.get_width() - 0.3,
                       bar.get_y() + bar.get_height()/2, label,
                       va='center', fontsize=10, fontweight='bold',
                       color=COLORS['up'] if val >= 0 else COLORS['down'])

            ax.set_yticks(range(len(names)))
            ax.set_yticklabels(names, fontsize=11)
            ax.set_title('农产品期货品种涨跌幅排行', fontsize=14,
                        fontweight='bold', color=COLORS['title'], pad=15)
            ax.axvline(x=0, color='#333', linewidth=0.8, linestyle='-')
            ax.grid(True, alpha=0.3, axis='x', color=COLORS['grid'])
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.tick_params(labelsize=10)

            filename = f"performance_{date_str}.png"
            filepath = os.path.join(self.output_dir, filename)
            fig.savefig(filepath, dpi=self.dpi, bbox_inches='tight', facecolor=COLORS['bg'])
            plt.close(fig)

            logger.info(f"涨跌幅排行图生成: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"涨跌幅排行图生成失败: {e}")
            plt.close('all')
            return None

    def _generate_price_comparison(self, fetcher, varieties, date_str=""):
        try:
            fig, ax = plt.subplots(figsize=(14, 5.5), facecolor=COLORS['bg'])
            ax.set_facecolor(COLORS['bg'])

            variety_colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C']

            for idx, variety in enumerate(varieties):
                df = fetcher.get_futures_history(variety, days=25)
                if df is None or df.empty or len(df) < 5:
                    continue

                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values('date')
                df['close'] = df['close'].astype(float)

                norm_close = df['close'] / df['close'].iloc[0] * 100

                color = variety_colors[idx % len(variety_colors)]
                ax.plot(df['date'], norm_close, color=color, linewidth=2, label=variety, alpha=0.85)
                ax.scatter(df['date'].iloc[-1], norm_close.iloc[-1], color=color, s=40, zorder=5)
                ax.text(df['date'].iloc[-1], norm_close.iloc[-1], f'{variety}',
                       fontsize=8, va='bottom', ha='left', color=color, fontweight='bold')

            ax.axhline(y=100, color='#999', linewidth=0.8, linestyle='--', alpha=0.5)
            ax.set_title('核心品种价格走势对比（基准=100）', fontsize=14,
                        fontweight='bold', color=COLORS['title'], pad=15)
            ax.legend(loc='upper left', fontsize=9, ncol=3, framealpha=0.9, edgecolor='#DDD')
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
            ax.xaxis.set_major_locator(mdates.DayLocator(interval=5))
            ax.grid(True, alpha=0.3, color=COLORS['grid'])
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.tick_params(labelsize=9)
            ax.set_ylabel('相对价格 (基准=100)', fontsize=9, color='#666')

            filename = f"comparison_{date_str}.png"
            filepath = os.path.join(self.output_dir, filename)
            fig.savefig(filepath, dpi=self.dpi, bbox_inches='tight', facecolor=COLORS['bg'])
            plt.close(fig)

            logger.info(f"价格对比图生成: {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"价格对比图生成失败: {e}")
            plt.close('all')
            return None


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    from data_fetcher import DataFetcher

    fetcher = DataFetcher()
    gen = ChartGenerator()
    charts = gen.generate_all_charts(fetcher, date_str="test")

    print(f"\n生成的图表：")
    for chart_type, name, data, _ in charts:
        if chart_type == 'position_rank':
            print(f"  [{chart_type}] {name}: {len(data)} 个品种")
            for item in data:
                long_top = item.get('long', [])
                print(f"    {item['variety']}({item['contract']}): 多单{len(long_top)}条")
        else:
            print(f"  [{chart_type}] {name}: {data}")

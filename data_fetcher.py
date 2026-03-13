import akshare as ak
import pandas as pd
import requests
import re
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataFetcher:
    """数据采集类，负责从新浪 API 获取期货行情和从 AkShare 获取新闻"""
    
    def __init__(self):
        # 品种名称与新浪代码缩写映射 (主力合约通常以 0 结尾)
        self.symbol_map = {
            "豆粕": "M0", "菜粕": "RM0", "玉米": "C0", 
            "生猪": "LH0", "白糖": "SR0", "棉花": "CF0", 
            "甲醇": "MA0", "尿素": "UR0", "PTA": "TA0", 
            "纯碱": "SA0", "PVC": "V0",
            "淀粉": "CS0", "大豆": "A0", "豆油": "Y0",
            "乙醇": "EB0", # 苯乙烯 EB 常作为乙醇产业链参考
            "生物柴": "P0"  # 棕榈油 P 是生物柴油的核心原料
        }

    def get_futures_quotes(self, target_names):
        """直接从新浪 HQ 获取期货行情"""
        results = []
        codes = [f"nf_{self.symbol_map.get(name, name + '0')}" for name in target_names]
        url = f"http://hq.sinajs.cn/list={','.join(codes)}"
        headers = {'Referer': 'http://finance.sina.com.cn'}
        
        try:
            logger.info(f"正在从新浪获取行情: {codes}")
            response = requests.get(url, headers=headers, timeout=10)
            text = response.text
            
            # 解析新浪返回的格式: var hq_str_nf_M0="豆粕主力...;
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if not line or '="' not in line: continue
                
                content = line.split('="')[1].split('";')[0]
                if not content: continue
                
                data = content.split(',')
                # 新浪期货数据格式: 0名称, 1时间, 2开盘, 3最高, 4最低, 5昨收, 6买价, 7卖价, 8最新价, 9结算价, 10昨结算, 11买量, 12卖量, 13持仓, 14成交, ...
                if len(data) > 10:
                    results.append({
                        "symbol": target_names[i] if i < len(target_names) else data[0],
                        "name": data[0],
                        "price": float(data[8]),
                        "change_pc": round((float(data[8]) - float(data[10])) / float(data[10]) * 100, 2) if float(data[10]) != 0 else 0,
                        "volume": int(float(data[14])),
                        "hold": int(float(data[13]))
                    })
            return results
        except Exception as e:
            logger.error(f"获取新浪行情失败: {e}")
            return []

    def filter_target_quotes(self, quotes, target_names):
        # 此时 quotes 已经是解析好的列表
        return quotes

    def get_futures_news(self):
        """获取通用期货新闻 (上海金属网)"""
        try:
            logger.info("正在获取期货新闻...")
            df = ak.futures_news_shmet()
            if df is not None and not df.empty:
                return df.head(10)
            return None
        except Exception as e:
            logger.error(f"获取新闻失败: {e}")
            return None

    def get_commodity_news(self, keywords=None):
        """获取大宗商品新闻并根据关键词过滤"""
        try:
            logger.info(f"正在获取大宗商品新闻，过滤关键词: {keywords}")
            all_news = []

            # 数据源 1: 上海金属网
            try:
                df_shmet = ak.futures_news_shmet()
                if df_shmet is not None and not df_shmet.empty:
                    title_col = 'title' if 'title' in df_shmet.columns else df_shmet.columns[0]
                    date_col = '发布时间' if '发布时间' in df_shmet.columns else 'pubDate'
                    for _, row in df_shmet.iterrows():
                        all_news.append({"content": str(row.get(title_col, '')), "pub_date": str(row.get(date_col, ''))})
            except Exception as e:
                logger.warning(f"SHMET 新闻获取失败: {e}")

            # 数据源 2: 百度财经新闻 (补充)
            try:
                df_news_baidu = ak.news_economic_baidu()
                if df_news_baidu is not None and not df_news_baidu.empty:
                    for _, row in df_news_baidu.iterrows():
                        all_news.append({"content": str(row.get('内容', row.get('title', ''))), "pub_date": str(row.get('发布时间', ''))})
            except Exception as e:
                logger.warning(f"百度新闻获取失败: {e}")
            
            # 如果没有关键词，返回前15条
            if not keywords:
                return all_news[:15]
            
            # 根据关键词过滤 (不区分大小写)
            filtered_news = []
            keywords_lower = [k.lower() for k in keywords]
            for item in all_news:
                content = item['content'].lower()
                if any(kw in content for kw in keywords_lower):
                    # 识别是否包含国际市场关键词
                    intl_keywords = ["cbot", "usda", "巴西", "阿根廷", "马来西亚", "美盘", "出口", "国际", "海外", "欧美", "全球"]
                    is_intl = any(ik in content for ik in intl_keywords)
                    item['is_intl'] = is_intl
                    filtered_news.append(item)
            
            # 如果过滤后为空，尝试更宽泛的匹配或返回兜底
            if not filtered_news and all_news:
                logger.info("关键词过滤结果为空，使用前10条通用新闻作为兜底。")
                return all_news[:10]
            
            return filtered_news[:20]
        except Exception as e:
            logger.error(f"获取大宗商品新闻失败: {e}")
            return []

    def get_futures_history(self, name, days=5):
        """获取品种历史日线数据"""
        try:
            # 转换名称为新浪代码 (例如: 豆粕 -> M0)
            symbol = self.symbol_map.get(name)
            if not symbol: return None
            
            logger.info(f"正在获取 {name}({symbol}) 的历史数据...")
            # 这里的 symbol 已经是 M0, RM0 这种格式，akshare 接口通常需要 nf_M0 或直接 M0
            df = ak.futures_zh_daily_sina(symbol=symbol)
            if df is not None:
                return df.tail(days)
            return None
        except Exception as e:
            logger.error(f"获取 {name} 历史数据失败: {e}")
            return None

    def generate_trend_chart(self, name, output_path="trend.png"):
        """生成品种的 5 日价格趋势图"""
        try:
            import matplotlib
            matplotlib.use('Agg')  # 设置为无界面后端
            import matplotlib.pyplot as plt
            
            # 设置中文字体优先级: Ubuntu(WenQuanYi) > Windows(SimHei) > macOS(Arial Unicode)
            matplotlib.rcParams['font.sans-serif'] = ['WenQuanYi Zen Hei', 'SimHei', 'Arial Unicode MS', 'DejaVu Sans']
            matplotlib.rcParams['axes.unicode_minus'] = False
            
            df = self.get_futures_history(name, days=10)
            if df is None or df.empty:
                logger.warning(f"无法生成 {name} 的趋势图：无数据")
                return None
            
            # 确保价格数据为数值型
            df['close'] = pd.to_numeric(df['close'], errors='coerce')
            df['date'] = pd.to_datetime(df['date'])
            df = df.dropna(subset=['close'])
            
            plt.figure(figsize=(10, 5))
            plt.plot(df['date'], df['close'], marker='o', linestyle='-', color='#1f77b4', linewidth=2, markersize=6)
            
            # 标注涨跌幅
            last_price = df['close'].iloc[-1]
            first_price = df['close'].iloc[0]
            total_change = (last_price - first_price) / first_price * 100
            
            plt.title(f"{name} {total_change:.2f}% (10 Days Trend)", fontsize=14, pad=15)
            plt.xlabel("Date", fontsize=12)
            plt.ylabel("Price", fontsize=12)
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            plt.savefig(output_path, dpi=100)
            plt.close()
            logger.info(f"{name} 趋势图已保存至: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"生成 {name} 趋势图失败: {e}")
            return None

if __name__ == "__main__":
    fetcher = DataFetcher()
    targets = ["豆粕", "菜粕", "玉米", "生猪", "白糖", "棉花", "甲醇", "尿素", "PTA", "纯碱", "PVC"]
    
    quotes = fetcher.get_futures_quotes(targets)
    print("--- 目标品种行情 (新浪直连) ---")
    for item in quotes:
        print(item)
            
    news = fetcher.get_futures_news()
    if news is not None:
        print("\n--- 最新期货新闻 ---")
        cols = [c for c in ['title', 'content', 'pubDate', '发布时间'] if c in news.columns]
        print(news[cols].head(3).to_string())

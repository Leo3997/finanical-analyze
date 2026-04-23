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
            "乙醇": "EB0",
            "生物柴": "P0"
        }
        # 库存查询映射 (统一使用 EM 认可的符号)
        self.inventory_map = {
            "豆粕": "豆粕",
            "玉米": "玉米",
            "大豆": "豆一",
            "豆油": "豆油",
            "白糖": "白糖",
            "棉花": "郑棉",
            "甲醇": "甲醇",
            "尿素": "尿素",
            "PTA": "PTA",
            "纯碱": "纯碱",
            "玻璃": "玻璃",
            "淀粉": "玉米淀粉",
            "菜粕": "菜粕",
            "PVC": "PVC",
            "乙醇": "玻璃", # 备选
            "生物柴": "豆油", 
        }

    def _get_row_data(self, row, candidates, index_fallback):
        """
        从一行数据中获取内容，优先尝试候选列名，失败则使用索引。
        """
        for name in candidates:
            if name in row.index:
                val = row[name]
                if pd.notna(val): return val
        # 如果列名匹配失败，尝试使用索引
        try:
            val = row.iloc[index_fallback]
            if pd.notna(val): return val
        except:
            pass
        return ""

    def get_futures_quotes(self, target_names):

        """直接从新浪 HQ 获取期货行情"""
        results = []
        codes = [f"nf_{self.symbol_map.get(name, name + '0')}" for name in target_names]
        url = f"http://hq.sinajs.cn/list={','.join(codes)}"
        headers = {'Referer': 'http://finance.sina.com.cn'}
        
        try:
            logger.info(f"正在从新浪获取行情：{codes}")
            response = requests.get(url, headers=headers, timeout=10)
            text = response.text
            
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if not line or '="' not in line: continue
                
                content = line.split('="')[1].split('";')[0]
                if not content: continue
                
                data = content.split(',')
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
            logger.error(f"获取新浪行情失败：{e}")
            return []

    def filter_target_quotes(self, quotes, target_names):
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
            logger.error(f"获取新闻失败：{e}")
            return None

    def get_commodity_news(self, keywords=None):
        """获取大宗商品新闻并根据关键词过滤"""
        try:
            logger.info(f"正在获取大宗商品新闻，过滤关键词：{keywords}")
            all_news = []

            # 数据源 1: 财联社 7x24 小时电报 (宏观局势/地缘/气候)
            try:
                df_news_cls = ak.stock_info_global_cls()
                if df_news_cls is not None and not df_news_cls.empty:
                    for _, row in df_news_cls.iterrows():
                        # 兼容乱码的列名：通常索引 1 是内容，索引 2 是日期，索引 3 是时间
                        title = str(self._get_row_data(row, ['标题', 'title'], 0))
                        content = str(self._get_row_data(row, ['内容', 'content'], 1))
                        date_str = str(self._get_row_data(row, ['发布日期', 'date'], 2))
                        time_str = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                        
                        full_time = f"{date_str} {time_str}".strip()
                        final_content = content if content and len(content) > 10 else title
                        
                        if final_content and len(final_content) > 10:
                            all_news.append({
                                "content": final_content, 
                                "pub_date": full_time,
                                "source": "财联社 7x24"
                            })
            except Exception as e:
                logger.warning(f"财联社全球电报获取失败：{e}")



            # 数据源 2: 期货资讯 (SHMET)
            try:
                df_shmet = ak.futures_news_shmet()
                if df_shmet is not None and not df_shmet.empty:
                    for _, row in df_shmet.iterrows():
                        # SHMET 索引 0 通常是时间，索引 1 通常是内容
                        content = str(self._get_row_data(row, ['内容', 'title', '标题'], 1))
                        pub_date = str(self._get_row_data(row, ['发布时间', '时间', 'pubDate'], 0))
                        
                        if content and len(content) > 10:
                            all_news.append({
                                "content": content,
                                "pub_date": pub_date,
                                "source": "SHMET"
                            })
            except Exception as e:
                logger.warning(f"SHMET 期货新闻获取失败：{e}")



            # 数据源 3: 农产品期货新闻 (东方财富 stock_news_em)
            try:
                agri_symbols = ["豆粕", "玉米", "大豆", "生猪", "白糖", "棉花", "豆油", "菜粕", "淀粉"]
                for symbol in agri_symbols[:5]:
                    try:
                        df_agri = ak.stock_news_em(symbol=symbol)
                        if df_agri is not None and not df_agri.empty:
                            for _, row in df_agri.iterrows():
                                # 东财新闻索引: 1:标题, 2:内容, 3:时间
                                title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                                content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                                pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                                
                                final_content = content if content and len(content) > 10 else title
                                if final_content and len(final_content) > 10:
                                    all_news.append({
                                        "content": f"{symbol}: {final_content}",
                                        "pub_date": pub_date,
                                        "source": f"农产品期货-{symbol}"
                                    })

                    except Exception as e:
                        logger.warning(f"{symbol} 新闻获取失败：{e}")
                        continue
            except Exception as e:
                logger.warning(f"农产品期货新闻获取失败：{e}")

            # 数据源 5: 能化品种新闻 (增加能化板块资讯)
            try:
                chemical_symbols = ["甲醇", "尿素", "PTA", "纯碱", "PVC", "原油", "燃油", "沥青"]
                for symbol in chemical_symbols[:6]:
                    try:
                        df_chem = ak.stock_news_em(symbol=symbol)
                        if df_chem is not None and not df_chem.empty:
                            for _, row in df_chem.iterrows():
                                title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                                content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                                pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                                
                                final_content = content if content and len(content) > 10 else title
                                if final_content and len(final_content) > 10:
                                    all_news.append({
                                        "content": f"{symbol}: {final_content}",
                                        "pub_date": pub_date,
                                        "source": f"能化期货-{symbol}"
                                    })

                    except Exception as e:
                        logger.warning(f"{symbol} 新闻获取失败：{e}")
                        continue
            except Exception as e:
                logger.warning(f"能化品种新闻获取失败：{e}")

            # 数据源 6: 有色金属新闻 (增加有色板块资讯)
            try:
                metal_symbols = ["铜", "铝", "锌", "镍", "铅", "锡", "碳酸锂", "工业硅"]
                for symbol in metal_symbols[:6]:
                    try:
                        df_metal = ak.stock_news_em(symbol=symbol)
                        if df_metal is not None and not df_metal.empty:
                            for _, row in df_metal.iterrows():
                                title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                                content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                                pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                                
                                final_content = content if content and len(content) > 10 else title
                                if final_content and len(final_content) > 10:
                                    all_news.append({
                                        "content": f"{symbol}: {final_content}",
                                        "pub_date": pub_date,
                                        "source": f"有色金属-{symbol}"
                                    })

                    except Exception as e:
                        logger.warning(f"{symbol} 新闻获取失败：{e}")
                        continue
            except Exception as e:
                logger.warning(f"有色金属新闻获取失败：{e}")

            # 数据源 7: 黑色建材新闻 (增加建材板块资讯)
            try:
                black_symbols = ["螺纹钢", "热卷", "铁矿石", "焦炭", "焦煤", "玻璃", "硅铁", "锰硅"]
                for symbol in black_symbols[:6]:
                    try:
                        df_black = ak.stock_news_em(symbol=symbol)
                        if df_black is not None and not df_black.empty:
                            for _, row in df_black.iterrows():
                                title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                                content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                                pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                                
                                final_content = content if content and len(content) > 10 else title
                                if final_content and len(final_content) > 10:
                                    all_news.append({
                                        "content": f"{symbol}: {final_content}",
                                        "pub_date": pub_date,
                                        "source": f"黑色建材-{symbol}"
                                    })

                    except Exception as e:
                        logger.warning(f"{symbol} 新闻获取失败：{e}")
                        continue
            except Exception as e:
                logger.warning(f"黑色建材新闻获取失败：{e}")

            # 数据源 8: 能源新闻 (增加原油、天然气等能源资讯)
            try:
                energy_symbols = ["原油", "天然气", "燃油", "低硫燃油", "LPG", "PTA"]
                for symbol in energy_symbols[:5]:
                    try:
                        df_energy = ak.stock_news_em(symbol=symbol)
                        if df_energy is not None and not df_energy.empty:
                            for _, row in df_energy.iterrows():
                                title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                                content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                                pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                                
                                final_content = content if content and len(content) > 10 else title
                                if final_content and len(final_content) > 10:
                                    all_news.append({
                                        "content": f"{symbol}: {final_content}",
                                        "pub_date": pub_date,
                                        "source": f"能源期货-{symbol}"
                                    })

                    except Exception as e:
                        logger.warning(f"{symbol} 新闻获取失败：{e}")
                        continue
            except Exception as e:
                logger.warning(f"能源新闻获取失败：{e}")

            # 备用数据源已整合至数据源 2


            # 如果没有关键词，返回前 15 条
            if not keywords:
                return all_news[:15]
            
            # 根据关键词过滤 (不区分大小写)
            filtered_news = []
            
            # 全球宏观与地缘关键词 (扩展版)
            macro_keywords = ["伊朗", "战争", "地缘", "原油", "油价", "制裁", "中东", "冲突", "武装", "导弹", "红海", "俄罗斯", "乌克兰", "美联储", "降息", "加息", "通胀", "cpi", "央行", "宏观", 
                             "贸易战", "关税", "外交", "停火", "军事", "演习", "石油", "OPEC", "欧佩克", "能源危机", "经济数据", "非农", "GDP", " recession", "stock market", "equity"]
            # 农产品关键词 (扩展版)
            agri_keywords = ["豆粕", "玉米", "生猪", "白糖", "棉花", "菜粕", "大豆", "豆油", "淀粉", "小麦", "大米", "usda", "cbot", "巴西", "阿根廷", "马来西亚", "减产", "干旱", "洪涝", "天气", "气候",
                            "农产品", "农业", " farming", "harvest", "crop", "soybean", "corn", "wheat", "猪肉", "牛肉", "禽肉", "饲料", "fertilizer"]
            # 能化与有色 (扩展版)
            chemical_metal_keywords = ["甲醇", "尿素", "pta", "纯碱", "pvc", "乙醇", "生物柴", "石油", "天然气", "动力煤", "螺纹钢", "铜", "铝", "锌", "镍", "锂",
                                      "化工", "chemical", "塑料", "橡胶", "化纤", "纺织", "钢铁", "steel", "iron", "ore", "coking coal", "coke", "glass", "cement", "建材", "有色金属", "nonferrous", "metal", "mining", "smelter"]

            filtered_news = []
            
            for item in all_news:
                content = item['content'].lower()
                categories = []
                
                # 分类检索
                is_macro = any(kw in content for kw in macro_keywords)
                is_agri = any(kw in content for kw in agri_keywords)
                is_chem_metal = any(kw in content for kw in chemical_metal_keywords)
                
                if is_macro: categories.append("geopolitics")
                if is_agri: categories.append("agriculture")
                if is_chem_metal: categories.append("chemicals_metals")
                
                # 只有命中任一分类才保留
                if categories:
                    item['categories'] = categories
                    # 识别是否包含国际市场关键词
                    intl_keywords = ["cbot", "usda", "巴西", "阿根廷", "马来西亚", "美盘", "出口", "国际", "海外", "欧美", "全球"]
                    item['is_intl'] = any(ik in content for ik in intl_keywords)
                    
                    # 兼容旧逻辑的宏观预警标签
                    if is_macro:
                        item['content'] = "[全球宏观预警] " + item['content']
                        
                    filtered_news.append(item)
            
            # 如果过滤后为空，尝试更宽泛的匹配或返回兜底
            if not filtered_news and all_news:
                logger.info("关键词过滤结果为空，使用前 15 条通用新闻作为兜底。")
                return all_news[:15]
            
            return filtered_news[:100]
        except Exception as e:
            logger.error(f"获取大宗商品新闻失败：{e}")
            return []

    def get_futures_history(self, name, days=5):
        """获取品种历史日线数据"""
        try:
            symbol = self.symbol_map.get(name)
            if not symbol: return None
            
            logger.info(f"正在获取 {name}({symbol}) 的历史数据...")
            df = ak.futures_zh_daily_sina(symbol=symbol)
            if df is not None:
                return df.tail(days)
            return None
        except Exception as e:
            logger.error(f"获取 {name} 历史数据失败：{e}")
            return None

    def get_market_analysis_data(self, target_names):
        """批量获取分析数据：历史走势、相关性、波动率"""
        try:
            pool = {}
            for name in target_names:
                df = self.get_futures_history(name, days=60)
                if df is not None and not df.empty:
                    df['close'] = pd.to_numeric(df['close'], errors='coerce')
                    df['date'] = pd.to_datetime(df['date'])
                    pool[name] = df.set_index('date')['close']
            
            if not pool:
                return None
                
            # 0. 数据清洗与对齐
            combined_df = pd.DataFrame(pool).ffill().dropna()
            
            if combined_df.empty:
                return None

            # 1. 计算相关性矩阵
            corr_matrix = combined_df.corr().round(2)
            corr_data = []
            for i, row in corr_matrix.iterrows():
                for j, val in row.items():
                    corr_data.append({"x": str(i), "y": str(j), "value": float(val)})
            
            # 2. 计算波动率 (30日年化波动率)
            returns = combined_df.pct_change()
            volatility = (returns.std() * (252**0.5) * 100).round(2).to_dict()
            
            # 3. 计算最近动能 (5日涨跌)
            recent_change = ((combined_df.iloc[-1] / combined_df.iloc[-6] - 1) * 100).round(2).to_dict() if len(combined_df) >= 6 else {}
            
            return {
                "correlation": corr_data,
                "volatility": volatility,
                "momentum": recent_change,
                "symbols": list(combined_df.columns) # 确保 symbols 与矩阵一致
            }
        except Exception as e:
            logger.error(f"分析数据计算失败：{e}")
            return None

    def get_futures_inventory(self, name):
        """获取库存数据"""
        try:
            em_symbol = self.inventory_map.get(name)
            if not em_symbol:
                return None
            
            logger.info(f"正在获取 {name} ({em_symbol}) 的库存数据...")
            df = ak.futures_inventory_em(symbol=em_symbol)
            
            if df is not None and not df.empty:
                results = []
                # 尝试匹配列名
                date_col = next((c for c in df.columns if '日期' in c or 'date' in c.lower()), df.columns[0])
                val_col = next((c for c in df.columns if '库存' in c or '仓单' in c or 'value' in c.lower()), df.columns[1])
                
                for _, row in df.tail(30).iterrows():
                    try:
                        results.append({
                            "date": str(row[date_col]).split()[0][-5:], # MM-DD
                            "value": float(row[val_col]),
                            "week": pd.to_datetime(row[date_col]).isocalendar().week
                        })
                    except:
                        continue
                return results
            return None
        except Exception as e:
            logger.error(f"获取 {name} 库存失败：{e}")
            return None

    def get_inventory_seasonality(self, name):
        """获取库存季节性分析数据"""
        try:
            mapping_symbol = self.inventory_map.get(name)
            if not mapping_symbol:
                return None
            
            logger.info(f"正在进行 {name} 季节性库存分析...")
            
            # 1. 尝试从 99 期货获取历史数据
            try:
                df_99 = ak.futures_inventory_99(symbol=mapping_symbol)
            except:
                df_99 = None

            if df_99 is not None and not df_99.empty:
                # [原有 99 期货解析逻辑]
                df_99['日期'] = pd.to_datetime(df_99['日期'])
                df_99['库存'] = pd.to_numeric(df_99['库存'], errors='coerce')
                df_99 = df_99.dropna(subset=['库存']).sort_values('日期')
                
                current_year = datetime.now().year
                df_current = df_99[df_99['日期'].dt.year == current_year].copy()
                df_current['week'] = df_current['日期'].dt.isocalendar().week
                
                current_series = []
                for _, row in df_current.iterrows():
                    current_series.append({
                        "week": int(row['week']),
                        "value": float(row['库存']),
                        "date": row['日期'].strftime('%m-%d')
                    })
                
                df_history = df_99[df_99['日期'].dt.year < current_year].copy()
                df_history['week'] = df_history['日期'].dt.isocalendar().week
                history_agg = df_history.groupby('week')['库存'].agg(['mean', 'min', 'max']).round(2)
                
                history_series = []
                for week, row in history_agg.iterrows():
                    history_series.append({
                        "week": int(week),
                        "avg": float(row['mean']),
                        "min": float(row['min']),
                        "max": float(row['max'])
                    })
            else:
                # 2. 兜底逻辑：如果 99 期货失败，使用 EM 的近期数据作为当前序列
                logger.warning(f"{name} 99期货数据获取失败，回退至 EM 基础数据")
                basic_data = self.get_futures_inventory(name)
                if not basic_data: return None
                
                current_series = []
                for item in basic_data:
                    current_series.append({
                        "week": item.get('week', 0),
                        "value": item['value'],
                        "date": item['date']
                    })
                history_series = [] # 无历史对比
                
                # 特殊优化：如果 EM 接口有数据，也可以计算一个简单的 30 日均值作为参考
                if current_series:
                    df_tmp = pd.DataFrame(current_series)
                    avg_val = df_tmp['value'].mean()
                    for item in current_series:
                        history_series.append({
                            "week": item['week'],
                            "avg": float(avg_val),
                            "min": float(df_tmp['value'].min()),
                            "max": float(df_tmp['value'].max())
                        })
                
            return {
                "current": current_series,
                "history": history_series,
                "symbol": name,
                "unit": "手" # 通用单位
            }
        except Exception as e:
            logger.error(f"季节性分析失败：{e}")
            return None

    def generate_trend_chart(self, name, output_path="trend.png"):
        """生成品种的 5 日价格趋势图"""
        try:
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            
            matplotlib.rcParams['font.sans-serif'] = ['WenQuanYi Zen Hei', 'SimHei', 'Arial Unicode MS', 'DejaVu Sans']
            matplotlib.rcParams['axes.unicode_minus'] = False
            
            df = self.get_futures_history(name, days=30)
            if df is None or df.empty:
                logger.warning(f"无法生成 {name} 的趋势图：无数据")
                return None
            
            df['close'] = pd.to_numeric(df['close'], errors='coerce')
            df['date'] = pd.to_datetime(df['date'])
            df = df.dropna(subset=['close'])
            
            plt.figure(figsize=(10, 5))
            plt.plot(df['date'], df['close'], marker='o', linestyle='-', color='#1f77b4', linewidth=2, markersize=6)
            
            last_price = df['close'].iloc[-1]
            first_price = df['close'].iloc[0]
            total_change = (last_price - first_price) / first_price * 100
            
            plt.title(f"{name} {total_change:.2f}% (30 Days Trend)", fontsize=14, pad=15)
            plt.xlabel("Date", fontsize=12)
            plt.ylabel("Price", fontsize=12)
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            plt.savefig(output_path, dpi=100)
            plt.close()
            logger.info(f"{name} 趋势图已保存至：{output_path}")
            return output_path
        except Exception as e:
            logger.error(f"生成 {name} 趋势图失败：{e}")
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

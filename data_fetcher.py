import akshare as ak
import pandas as pd
import requests
import re
from datetime import datetime
import logging
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 过滤 AKShare 的非交易日警告
warnings.filterwarnings('ignore', message='.*非交易日.*')

class DataFetcher:
    """数据采集类，负责从新浪 API 获取期货行情和从 AkShare 获取新闻"""
    
    def __init__(self):
        # 农产品期货品种名称与新浪代码缩写映射 (主力合约通常以 0 结尾)
        self.symbol_map = {
            # 核心品种（玉米、鸡蛋）
            "玉米": "C0", "鸡蛋": "JD0",
            # 蛋白粕类
            "豆粕": "M0", "菜粕": "RM0", "豆二": "B0",
            # 油脂类
            "豆油": "Y0", "棕榈油": "P0", "菜籽油": "OI0", "花生": "PK0",
            # 谷物及加工品
            "淀粉": "CS0", "大豆": "A0",
            # 软商品类
            "白糖": "SR0", "棉花": "CF0", "苹果": "AP0", "红枣": "CJ0",
            # 畜牧类
            "生猪": "LH0",
        }
        
        # 品种分类映射
        self.category_map = {
            # 核心品种
            "玉米": "谷物", "鸡蛋": "畜牧",
            # 蛋白粕类
            "豆粕": "蛋白粕", "菜粕": "蛋白粕", "豆二": "蛋白粕",
            # 油脂类
            "豆油": "油脂", "棕榈油": "油脂", "菜籽油": "油脂", "花生": "油脂",
            # 谷物及加工品
            "淀粉": "谷物", "大豆": "谷物",
            # 软商品类
            "白糖": "软商品", "棉花": "软商品", "苹果": "软商品", "红枣": "软商品",
            # 畜牧类
            "生猪": "畜牧",
        }
        
        # 农产品期货完整列表（用于市场看板显示）
        self.agricultural_symbols = [
            # 核心品种
            "玉米", "鸡蛋",
            # 蛋白粕类
            "豆粕", "菜粕", "豆二",
            # 油脂类
            "豆油", "棕榈油", "菜籽油", "花生",
            # 谷物及加工品
            "淀粉", "大豆",
            # 软商品类
            "白糖", "棉花", "苹果", "红枣",
            # 畜牧类
            "生猪",
        ]
        
        # 库存查询映射
        self.inventory_map = {
            "玉米": "玉米",
            "鸡蛋": "鸡蛋",
            "豆粕": "豆粕",
            "豆油": "豆油",
            "淀粉": "玉米淀粉",
            "生猪": "生猪",
            "白糖": "白糖",
            "棉花": "郑棉",
            "棕榈油": "棕榈油",
            "菜粕": "菜粕",
            "菜籽油": "菜籽油",
            "花生": "花生",
            "苹果": "苹果",
            "红枣": "红枣",
            "大豆": "豆一",
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

    def _fetch_news_cls(self):
        """财联社 7x24 小时电报"""
        items = []
        try:
            df = ak.stock_info_global_cls()
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    title = str(self._get_row_data(row, ['标题', 'title'], 0))
                    content = str(self._get_row_data(row, ['内容', 'content'], 1))
                    date_str = str(self._get_row_data(row, ['发布日期', 'date'], 2))
                    time_str = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                    final_content = content if content and len(content) > 10 else title
                    if final_content and len(final_content) > 10:
                        items.append({
                            "content": final_content,
                            "pub_date": f"{date_str} {time_str}".strip(),
                            "source": "财联社 7x24"
                        })
        except Exception as e:
            logger.warning(f"财联社获取失败: {e}")
        return items

    def _fetch_news_sina_global(self):
        """新浪全球宏观新闻"""
        items = []
        try:
            df = ak.stock_news_em(symbol="全球")
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                    content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                    pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                    final_content = content if content and len(content) > 10 else title
                    if final_content and len(final_content) > 10:
                        items.append({
                            "content": f"[全球宏观] {final_content}",
                            "pub_date": pub_date,
                            "source": "东方财富-全球"
                        })
        except Exception as e:
            logger.warning(f"新浪全球新闻获取失败: {e}")
        return items

    def _fetch_news_macro_symbol(self, symbol):
        """获取单个宏观符号的新闻"""
        items = []
        try:
            df = ak.stock_news_em(symbol=symbol)
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                    content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                    pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                    final_content = content if content and len(content) > 10 else title
                    if final_content and len(final_content) > 10:
                        items.append({
                            "content": f"[宏观数据] {symbol}: {final_content}",
                            "pub_date": pub_date,
                            "source": f"宏观数据-{symbol}"
                        })
        except Exception:
            pass
        return items

    def _fetch_news_shmet(self):
        """SHMET 期货资讯"""
        items = []
        try:
            df = ak.futures_news_shmet()
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    content = str(self._get_row_data(row, ['内容', 'title', '标题'], 1))
                    pub_date = str(self._get_row_data(row, ['发布时间', '时间', 'pubDate'], 0))
                    if content and len(content) > 10:
                        items.append({
                            "content": content,
                            "pub_date": pub_date,
                            "source": "SHMET"
                        })
        except Exception as e:
            logger.warning(f"SHMET 新闻获取失败: {e}")
        return items

    def _fetch_news_symbol(self, symbol):
        """获取单个农产品品种的新闻"""
        items = []
        try:
            df = ak.stock_news_em(symbol=symbol)
            if df is not None and not df.empty:
                for _, row in df.iterrows():
                    title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                    content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                    pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                    final_content = content if content and len(content) > 10 else title
                    if final_content and len(final_content) > 10:
                        items.append({
                            "content": f"{symbol}: {final_content}",
                            "pub_date": pub_date,
                            "source": f"农产品期货-{symbol}"
                        })
        except Exception:
            pass
        return items

    def _fetch_foreign_futures(self):
        """获取外盘期货行情"""
        items = []
        try:
            df = ak.qhkc_tool_foreign()
            if df is not None and not df.empty:
                agri_related = ['玉米', '大豆', '小麦', '豆粕', '豆油', '棉花', '糖', '油']
                for _, row in df.iterrows():
                    name = str(row.get('name', ''))
                    if any(kw in name for kw in agri_related):
                        price = row.get('latest_price', row.get('price', 0))
                        change = row.get('rate', 0)
                        try:
                            price = float(price)
                            change = float(change)
                            items.append({
                                "content": f"[外盘行情] {name} 最新价 {price:.2f} 涨跌 {change:+.2f}%",
                                "pub_date": str(row.get('base_time', datetime.now().strftime('%Y-%m-%d %H:%M'))),
                                "source": "外盘期货",
                                "is_intl": True
                            })
                        except Exception:
                            continue
        except Exception as e:
            logger.warning(f"外盘期货行情获取失败: {e}")

        try:
            for keyword in ["CBOT", "USDA"]:
                try:
                    df = ak.stock_news_em(symbol=keyword)
                    if df is not None and not df.empty:
                        for _, row in df.head(5).iterrows():
                            title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                            content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                            pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                            final_content = content if content and len(content) > 10 else title
                            if final_content and len(final_content) > 10:
                                items.append({
                                    "content": f"[{keyword}国际] {final_content}",
                                    "pub_date": pub_date,
                                    "source": f"外盘-{keyword}",
                                    "is_intl": True
                                })
                except Exception:
                    pass
        except Exception:
            pass

        return items

    def _fetch_macro_china(self):
        """获取中国宏观经济数据（PMI、CPI）及人民币汇率、黄金"""
        items = []
        try:
            df = ak.macro_china_pmi()
            if df is not None and not df.empty:
                latest = df.iloc[-1]
                month = str(latest.get('月份', ''))
                mfg = latest.get('制造业-指数', '')
                non_mfg = latest.get('非制造业-指数', '')
                if mfg:
                    items.append({
                        "content": f"[宏观数据] PMI({month}) 制造业: {mfg} 非制造业: {non_mfg}",
                        "pub_date": datetime.now().strftime('%Y-%m-%d'),
                        "source": "宏观数据-中国"
                    })
        except Exception:
            pass

        try:
            df = ak.macro_china_cpi_yearly()
            if df is not None and not df.empty:
                latest = df.dropna(subset=['今值']).iloc[-1] if not df.dropna(subset=['今值']).empty else df.iloc[-1]
                indicator = str(latest.get('商品', ''))
                value = latest.get('今值', '')
                if indicator and value and str(value) != 'nan':
                    items.append({
                        "content": f"[宏观数据] {indicator}: {value}",
                        "pub_date": str(latest.get('日期', datetime.now().strftime('%Y-%m-%d'))),
                        "source": "宏观数据-中国"
                    })
        except Exception:
            pass

        try:
            df = ak.futures_foreign_commodity_realtime(symbol="黄金")
            if df is not None and not df.empty and len(df) > 0:
                row = df.iloc[-1] if len(df) > 1 else df.iloc[0]
                price = row.get('最新价', row.iloc[2] if len(row) > 2 else 0)
                items.append({
                    "content": f"[宏观数据] 国际黄金 最新价: {price}",
                    "pub_date": datetime.now().strftime('%Y-%m-%d'),
                    "source": "宏观数据-国际"
                })
        except Exception:
            try:
                df = ak.qhkc_tool_foreign()
                if df is not None and not df.empty:
                    gold_rows = df[df['name'].astype(str).str.contains('金')]
                    for _, row in gold_rows.head(2).iterrows():
                        name = str(row.get('name', ''))
                        price = row.get('latest_price', 0)
                        change = row.get('rate', 0)
                        try:
                            items.append({
                                "content": f"[宏观数据] {name} 最新价 {float(price):.2f} 涨跌 {float(change):+.2f}%",
                                "pub_date": datetime.now().strftime('%Y-%m-%d'),
                                "source": "宏观数据-国际"
                            })
                        except Exception:
                            pass
            except Exception:
                pass

        try:
            df = ak.macro_china_fx_gold()
            if df is not None and not df.empty:
                latest = df.iloc[-1]
                gold_price = latest.get('黄金', latest.get('gold', ''))
                if gold_price and str(gold_price) != 'nan':
                    items.append({
                        "content": f"[宏观数据] 中国黄金储备: 最新 {gold_price}",
                        "pub_date": datetime.now().strftime('%Y-%m-%d'),
                        "source": "宏观数据-中国"
                    })
        except Exception:
            pass

        return items

    def _filter_news(self, all_news):
        """对采集的新闻进行关键词过滤"""
        macro_keywords = ["伊朗", "战争", "地缘", "原油", "油价", "制裁", "中东", "冲突", "武装", "导弹", "红海",
                         "俄罗斯", "乌克兰", "美联储", "降息", "加息", "通胀", "cpi", "央行", "宏观",
                         "贸易战", "关税", "外交", "停火", "军事", "石油", "OPEC", "欧佩克", "能源危机",
                         "经济数据", "非农", "GDP", "PMI", "汇率", "人民币", "黄金", "避险", "地缘政治",
                         "岸田", "特朗普", "选举", "贸易摩擦", "制裁", "军事演习", "台海", "南海"]
        agri_keywords = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕",
                        "大豆", "豆二", "菜籽油", "花生", "苹果", "红枣", "小麦", "大米", "usda", "cbot",
                        "巴西", "阿根廷", "马来西亚", "减产", "干旱", "洪涝", "天气", "气候",
                        "农产品", "农业", "猪肉", "牛肉", "禽肉", "饲料", "种植", "播种", "收割",
                        "soybean", "corn", "wheat"]
        intl_keywords = ["cbot", "usda", "巴西", "阿根廷", "马来西亚", "美盘", "出口", "国际", "海外", "欧美", "全球"]

        filtered = []
        for item in all_news:
            content = item['content'].lower()
            is_macro = any(kw in content for kw in macro_keywords)
            is_agri = any(kw in content for kw in agri_keywords)
            is_intl = item.get('is_intl', False) or any(ik in content for ik in intl_keywords)

            if is_macro or is_agri or is_intl:
                item['is_intl'] = is_intl
                if is_macro and not is_agri:
                    item['content'] = "[全球宏观预警] " + item['content']
                filtered.append(item)

        if not filtered and all_news:
            return all_news[:15]
        return filtered[:100]

    def get_commodity_news(self, keywords=None):
        """并行获取全部新闻源并过滤"""
        import time
        t0 = time.time()
        logger.info("正在并行获取大宗商品新闻...")

        all_news = []
        macro_symbols = ["CPI", "PPI", "美联储", "央行", "通胀", "人民币汇率", "黄金", "地缘政治"]
        core_symbols = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "豆二"]

        max_workers = min(20, len(core_symbols) + len(macro_symbols) + 10)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}

            futures[executor.submit(self._fetch_news_cls)] = "cls"
            futures[executor.submit(self._fetch_news_sina_global)] = "sina_global"
            futures[executor.submit(self._fetch_news_shmet)] = "shmet"
            futures[executor.submit(self._fetch_foreign_futures)] = "foreign"
            futures[executor.submit(self._fetch_macro_china)] = "macro"

            for sym in macro_symbols:
                futures[executor.submit(self._fetch_news_macro_symbol, sym)] = f"macro_{sym}"
            for sym in core_symbols:
                futures[executor.submit(self._fetch_news_symbol, sym)] = f"symbol_{sym}"

            for future in as_completed(futures):
                name = futures[future]
                try:
                    items = future.result()
                    all_news.extend(items)
                    count = len(items)
                    if count > 0:
                        logger.debug(f"  [{name}] 获取 {count} 条")
                except Exception as e:
                    logger.warning(f"  [{name}] 失败: {e}")

        elapsed = time.time() - t0
        logger.info(f"新闻并行采集完成，共 {len(all_news)} 条，耗时 {elapsed:.1f}s")

        if keywords:
            return self._filter_news(all_news)
        return all_news[:50]

    def get_futures_history(self, name, days=5):
        """获取品种历史日线数据"""
        try:
            symbol = self.symbol_map.get(name)
            if not symbol:
                logger.warning(f"未找到品种 {name} 的代码映射")
                return None
            
            logger.info(f"正在获取 {name}({symbol}) 的历史数据...")
            df = ak.futures_zh_daily_sina(symbol=symbol)
            if df is not None:
                return df.tail(days)
            return None
        except Exception as e:
            logger.error(f"获取 {name} 历史数据失败：{e}")
            return None

    def get_futures_intraday(self, name):
        """获取品种日内分时数据"""
        try:
            symbol = self.symbol_map.get(name)
            if not symbol: 
                logger.warning(f"未找到品种 {name} 的代码映射")
                return None
            
            logger.info(f"正在获取 {name}({symbol}) 的分时数据...")
            
            # 使用 AkShare 获取期货分时数据
            df = ak.futures_zh_minute_sina(symbol=symbol, period="1")
            if df is not None and not df.empty:
                logger.info(f"获取到 {len(df)} 条分时数据")
                # 处理数据，添加时间列
                df['time'] = pd.to_datetime(df['datetime']).dt.strftime('%H:%M')
                # 选择需要的列（AkShare 返回的列名：datetime, open, high, low, close, volume, hold）
                df = df[['time', 'open', 'high', 'low', 'close', 'volume']].copy()
                # 取最近 240 分钟的数据（覆盖日盘和夜盘）
                result = df.tail(240)
                logger.info(f"返回 {len(result)} 条数据")
                return result
            logger.warning(f"{name} 分时数据为空")
            return None
        except Exception as e:
            logger.error(f"获取 {name} 分时数据失败：{e}")
            import traceback
            logger.error(traceback.format_exc())
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

    def get_spot_prices(self, target_names=None):
        """获取农产品现货价格（使用 AKShare 的 futures_spot_price_daily 接口）"""
        try:
            logger.info("正在获取农产品现货价格...")
            spot_data = []
            
            from datetime import datetime, timedelta
            
            # 期货品种缩写与中文名称映射
            symbol_to_name = {
                "C": "玉米", "A": "大豆", "M": "豆粕", "Y": "豆油", 
                "P": "棕榈油", "JD": "鸡蛋", "LH": "生猪", "CF": "棉花",
                "SR": "白糖", "OI": "菜籽油", "RM": "菜粕", "CS": "淀粉",
                "AP": "苹果", "CJ": "红枣", "PK": "花生", "B": "豆二"
            }
            
            # 农产品品种缩写列表
            agri_symbols = ["C", "A", "M", "Y", "P", "JD", "LH", "CF", "SR", "OI", "RM", "CS", "AP", "CJ", "PK", "B"]
            
            # 使用 futures_spot_price_daily 获取最近30天的数据
            end_date = datetime.now().strftime("%Y%m%d")
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")
            
            try:
                df = ak.futures_spot_price_daily(start_day=start_date, end_day=end_date)
                if df is not None and not df.empty:
                    logger.info(f"futures_spot_price_daily 返回 {len(df)} 条数据")
                    
                    # 获取最新日期的数据
                    latest_date = df['date'].max()
                    df_latest = df[df['date'] == latest_date]
                    logger.info(f"使用最新日期数据: {latest_date}")
                    
                    for _, row in df_latest.iterrows():
                        symbol_code = str(row['symbol'])
                        
                        if symbol_code in agri_symbols:
                            chinese_name = symbol_to_name.get(symbol_code, symbol_code)
                            
                            if target_names and chinese_name not in target_names:
                                continue
                            
                            try:
                                spot_price = float(row['spot_price']) if 'spot_price' in row else 0
                                dominant_contract_price = float(row['dominant_contract_price']) if 'dominant_contract_price' in row else 0
                                dom_basis = float(row['dom_basis']) if 'dom_basis' in row else 0
                                dom_basis_rate = float(row['dom_basis_rate']) if 'dom_basis_rate' in row else 0
                                
                                if spot_price > 0:
                                    spot_data.append({
                                        "name": chinese_name,
                                        "symbol": symbol_code,
                                        "price": round(spot_price, 2),
                                        "futures_price": round(dominant_contract_price, 2) if dominant_contract_price else None,
                                        "basis": round(dom_basis, 2) if dom_basis else None,
                                        "basis_rate": f"{round(dom_basis_rate * 100, 2)}%" if dom_basis_rate else None,
                                        "date": str(latest_date),
                                        "source": "AKShare-现货价格"
                                    })
                                    logger.info(f"获取到 {chinese_name}({symbol_code}) 现货: {spot_price}, 期货: {dominant_contract_price}, 基差: {dom_basis}")
                            except Exception as e:
                                logger.warning(f"解析 {symbol_code} 数据失败: {e}")
                                continue
            except Exception as e:
                logger.warning(f"futures_spot_price_daily 接口获取失败: {e}")
            
            if spot_data:
                logger.info(f"成功获取 {len(spot_data)} 个品种的现货价格")
                return spot_data
            else:
                logger.warning("未获取到任何现货价格数据")
                return []
                
        except Exception as e:
            logger.error(f"获取现货价格失败: {e}")
            return []

    def get_position_rank(self, varieties=None):
        """获取主力合约的持仓排名（多单、空单、成交量前5名及其增减）"""
        import datetime as _dt
        today = _dt.date.today()
        year = today.year % 100
        main_contract_suffix = f"{year:02d}09"
        
        contract_map = {
            "玉米": f"C{main_contract_suffix}", "淀粉": f"CS{main_contract_suffix}",
            "豆粕": f"M{main_contract_suffix}", "豆油": f"Y{main_contract_suffix}",
            "棕榈油": f"P{main_contract_suffix}", "鸡蛋": f"JD{main_contract_suffix}",
            "生猪": f"LH{main_contract_suffix}", "豆二": f"B{main_contract_suffix}",
            "大豆": f"A{main_contract_suffix}", "白糖": f"SR{main_contract_suffix}",
            "棉花": f"CF{main_contract_suffix}", "菜籽油": f"OI{main_contract_suffix}",
            "菜粕": f"RM{main_contract_suffix}",
        }
        
        if varieties is None:
            varieties = ["玉米", "鸡蛋", "豆粕", "豆油", "白糖", "豆二"]

        target_date = None
        for offset in range(5):
            try_date = (today - _dt.timedelta(days=offset)).strftime('%Y%m%d')
            try:
                df = ak.futures_hold_pos_sina(symbol='多单持仓', contract=f"C{main_contract_suffix}", date=try_date)
                if df is not None and len(df) > 0:
                    target_date = try_date
                    break
            except Exception:
                continue
        
        if not target_date:
            logger.warning("未找到可用的持仓排名日期")
            return []

        logger.info(f"使用持仓排名日期: {target_date}")
        
        result = []
        rank_types = [
            ('多单持仓', 'long'),
            ('空单持仓', 'short'),
        ]
        
        for variety in varieties:
            contract = contract_map.get(variety)
            if not contract:
                continue
            
            variety_ranks = {'variety': variety, 'contract': contract, 'date': target_date}
            
            for symbol_key, rank_key in rank_types:
                try:
                    df = ak.futures_hold_pos_sina(symbol=symbol_key, contract=contract, date=target_date)
                    if df is not None and len(df) > 0:
                        top20 = df.head(20)
                        members = []
                        for _, row in top20.iterrows():
                            vol = int(float(row.iloc[2]))
                            change_val = row.iloc[3]
                            try:
                                change_str = f"{float(change_val):+.0f}" if pd.notna(change_val) else "0"
                            except (ValueError, TypeError):
                                change_str = "0"
                            members.append({
                                'rank': int(row.iloc[0]),
                                'name': str(row.iloc[1]),
                                'volume': vol,
                                'change': change_str
                            })
                        variety_ranks[rank_key] = members
                except Exception as e:
                    logger.warning(f"获取{variety}/{contract} {symbol_key}失败: {e}")
                    variety_ranks[rank_key] = []
            
            if variety_ranks.get('long') or variety_ranks.get('short'):
                result.append(variety_ranks)
        
        logger.info(f"获取到 {len(result)} 个品种的持仓排名")
        return result

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

    def calculate_technical_indicators(self, name, days=60):
        """计算技术指标：MA、MACD、KDJ、布林带"""
        try:
            symbol = self.symbol_map.get(name)
            if not symbol:
                logger.warning(f"未找到品种 {name} 的代码映射")
                return None
            
            df = self.get_futures_history(name, days=days)
            if df is None or df.empty: return None
            
            df = df.copy()
            df['date'] = pd.to_datetime(df['date'])
            df['close'] = pd.to_numeric(df['close'], errors='coerce')
            df['high'] = pd.to_numeric(df['high'], errors='coerce')
            df['low'] = pd.to_numeric(df['low'], errors='coerce')
            df = df.dropna(subset=['close', 'high', 'low'])
            
            if len(df) < 20: return None
            
            close = df['close']
            high = df['high']
            low = df['low']
            
            # MA (简单移动平均)
            ma5 = close.rolling(window=5).mean()
            ma20 = close.rolling(window=20).mean()
            ma60 = close.rolling(window=60).mean() if len(close) >= 60 else None
            
            # EMA (指数移动平均，用于MACD)
            ema12 = close.ewm(span=12, adjust=False).mean()
            ema26 = close.ewm(span=26, adjust=False).mean()
            
            # MACD
            macd = ema12 - ema26
            signal = macd.ewm(span=9, adjust=False).mean()
            histogram = macd - signal
            
            # KDJ
            n = 9
            low_n = low.rolling(window=n).min()
            high_n = high.rolling(window=n).max()
            rsv = (close - low_n) / (high_n - low_n) * 100
            rsv = rsv.fillna(50)
            
            k = rsv.ewm(com=2, adjust=False).mean()
            d = k.ewm(com=2, adjust=False).mean()
            j = 3 * k - 2 * d
            
            # 布林带
            bb_mid = close.rolling(window=20).mean()
            bb_std = close.rolling(window=20).std()
            bb_upper = bb_mid + 2 * bb_std
            bb_lower = bb_mid - 2 * bb_std
            
            # 转换为列表格式
            result = {
                "symbol": name,
                "dates": df['date'].dt.strftime('%Y-%m-%d').tolist()[-30:],
                "price": close.tolist()[-30:],
                "ma5": ma5.round(2).tolist()[-30:],
                "ma20": ma20.round(2).tolist()[-30:],
                "ma60": ma60.round(2).tolist()[-30:] if ma60 is not None else None,
                "macd": {
                    "dif": macd.round(2).tolist()[-30:],
                    "dea": signal.round(2).tolist()[-30:],
                    "histogram": histogram.round(3).tolist()[-30:]
                },
                "kdj": {
                    "k": k.round(2).tolist()[-30:],
                    "d": d.round(2).tolist()[-30:],
                    "j": j.round(2).tolist()[-30:]
                },
                "bollinger": {
                    "upper": bb_upper.round(2).tolist()[-30:],
                    "mid": bb_mid.round(2).tolist()[-30:],
                    "lower": bb_lower.round(2).tolist()[-30:]
                }
            }
            
            return result
        except Exception as e:
            logger.error(f"计算 {name} 技术指标失败：{e}")
            return None

    def get_spread_analysis(self, symbol1, symbol2, days=30):
        """获取两个品种的价差分析"""
        try:
            df1 = self.get_futures_history(symbol1, days=days)
            df2 = self.get_futures_history(symbol2, days=days)
            
            if df1 is None or df2 is None: return None
            
            df1 = df1.copy()
            df2 = df2.copy()
            df1['close'] = pd.to_numeric(df1['close'], errors='coerce')
            df2['close'] = pd.to_numeric(df2['close'], errors='coerce')
            
            df1['date'] = pd.to_datetime(df1['date'])
            df2['date'] = pd.to_datetime(df2['date'])
            
            merged = pd.merge(df1[['date', 'close']], df2[['date', 'close']], on='date', suffixes=('_1', '_2'))
            merged = merged.sort_values('date')
            
            if len(merged) < 5: return None
            
            spread = merged['close_1'] - merged['close_2']
            spread_pct = (spread / merged['close_2'] * 100).round(2)
            
            current_spread = round(spread.iloc[-1], 2)
            current_spread_pct = round(spread_pct.iloc[-1], 2)
            spread_mean = round(spread.mean(), 2)
            spread_std = round(spread.std(), 2)
            z_score = round((current_spread - spread_mean) / spread_std, 2) if spread_std != 0 else 0
            
            return {
                "symbol1": symbol1,
                "symbol2": symbol2,
                "dates": merged['date'].dt.strftime('%Y-%m-%d').tolist(),
                "price1": merged['close_1'].tolist(),
                "price2": merged['close_2'].tolist(),
                "spread": spread.round(2).tolist(),
                "spread_pct": spread_pct.tolist(),
                "current": {
                    "spread": current_spread,
                    "spread_pct": current_spread_pct,
                    "z_score": z_score
                },
                "statistics": {
                    "mean": spread_mean,
                    "std": spread_std,
                    "min": round(spread.min(), 2),
                    "max": round(spread.max(), 2)
                }
            }
        except Exception as e:
            logger.error(f"价差分析失败 ({symbol1} vs {symbol2}): {e}")
            return None

    def get_price_ratio(self, symbol1, symbol2, days=30):
        """获取两个品种的比价走势"""
        try:
            df1 = self.get_futures_history(symbol1, days=days)
            df2 = self.get_futures_history(symbol2, days=days)
            
            if df1 is None or df2 is None: return None
            
            df1 = df1.copy()
            df2 = df2.copy()
            df1['close'] = pd.to_numeric(df1['close'], errors='coerce')
            df2['close'] = pd.to_numeric(df2['close'], errors='coerce')
            
            df1['date'] = pd.to_datetime(df1['date'])
            df2['date'] = pd.to_datetime(df2['date'])
            
            merged = pd.merge(df1[['date', 'close']], df2[['date', 'close']], on='date', suffixes=('_1', '_2'))
            merged = merged.sort_values('date')
            
            if len(merged) < 5: return None
            
            ratio = (merged['close_1'] / merged['close_2']).round(4)
            
            return {
                "symbol1": symbol1,
                "symbol2": symbol2,
                "dates": merged['date'].dt.strftime('%Y-%m-%d').tolist(),
                "ratio": ratio.tolist(),
                "current": round(ratio.iloc[-1], 4),
                "mean": round(ratio.mean(), 4),
                "min": round(ratio.min(), 4),
                "max": round(ratio.max(), 4)
            }
        except Exception as e:
            logger.error(f"比价分析失败 ({symbol1}/{symbol2}): {e}")
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

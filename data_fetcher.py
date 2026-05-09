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

            # 数据源 1.5: 新浪财经全球新闻 (新增)
            try:
                df_sina_global = ak.stock_news_em(symbol="全球")
                if df_sina_global is not None and not df_sina_global.empty:
                    for _, row in df_sina_global.iterrows():
                        title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                        content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                        pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                        
                        final_content = content if content and len(content) > 10 else title
                        if final_content and len(final_content) > 10:
                            all_news.append({
                                "content": f"[全球宏观] {final_content}",
                                "pub_date": pub_date,
                                "source": "东方财富-全球"
                            })
            except Exception as e:
                logger.warning(f"新浪全球新闻获取失败：{e}")

            # 数据源 1.6: 宏观经济数据新闻 (仅保留与农产品相关的宏观数据)
            try:
                macro_symbols = ["CPI", "PPI", "美联储", "央行", "通胀"]
                for symbol in macro_symbols:
                    try:
                        df_macro = ak.stock_news_em(symbol=symbol)
                        if df_macro is not None and not df_macro.empty:
                            for _, row in df_macro.iterrows():
                                title = str(self._get_row_data(row, ['新闻标题', 'title'], 1))
                                content = str(self._get_row_data(row, ['新闻内容', 'content'], 2))
                                pub_date = str(self._get_row_data(row, ['发布时间', 'time'], 3))
                                
                                final_content = content if content and len(content) > 10 else title
                                if final_content and len(final_content) > 10:
                                    all_news.append({
                                        "content": f"[宏观数据] {symbol}: {final_content}",
                                        "pub_date": pub_date,
                                        "source": f"宏观数据-{symbol}"
                                    })
                    except:
                        continue
            except Exception as e:
                logger.warning(f"宏观经济数据新闻获取失败：{e}")



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



            # 数据源 3: 核心品种新闻 (玉米、鸡蛋为主)
            try:
                core_symbols = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕"]
                for symbol in core_symbols:
                    try:
                        df_agri = ak.stock_news_em(symbol=symbol)
                        if df_agri is not None and not df_agri.empty:
                            for _, row in df_agri.iterrows():
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


            # 如果没有关键词，返回前 50 条
            if not keywords:
                return all_news[:50]
            
            # 根据关键词过滤 (不区分大小写)
            filtered_news = []
            
            # 全球宏观与地缘关键词 (仅保留与农产品相关的)
            macro_keywords = ["伊朗", "战争", "地缘", "原油", "油价", "制裁", "中东", "冲突", "武装", "导弹", "红海", "俄罗斯", "乌克兰", "美联储", "降息", "加息", "通胀", "cpi", "央行", "宏观", 
                             "贸易战", "关税", "外交", "停火", "军事", "石油", "OPEC", "欧佩克", "能源危机", "经济数据", "非农", "GDP"]
            # 农产品关键词 (扩展版，核心品种优先)
            agri_keywords = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "大豆", "菜籽油", "花生", "苹果", "红枣", "小麦", "大米", "usda", "cbot", "巴西", "阿根廷", "马来西亚", "减产", "干旱", "洪涝", "天气", "气候",
                            "农产品", "农业", " farming", "harvest", "crop", "soybean", "corn", "wheat", "猪肉", "牛肉", "禽肉", "饲料", "fertilizer", "种植", "播种", "收割"]

            filtered_news = []
            
            for item in all_news:
                content = item['content'].lower()
                categories = []
                
                # 分类检索
                is_macro = any(kw in content for kw in macro_keywords)
                is_agri = any(kw in content for kw in agri_keywords)
                
                if is_macro: categories.append("geopolitics")
                if is_agri: categories.append("agriculture")
                
                # 优先保留农产品新闻，其次保留宏观新闻
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
        """获取农产品现货价格（使用 AKShare 的 futures_spot_price 接口）"""
        try:
            logger.info("正在获取农产品现货价格...")
            spot_data = []
            
            # 期货品种缩写与中文名称映射
            symbol_to_name = {
                "C": "玉米", "A": "大豆", "M": "豆粕", "Y": "豆油", 
                "P": "棕榈油", "JD": "鸡蛋", "LH": "生猪", "CF": "棉花",
                "SR": "白糖", "OI": "菜籽油", "RM": "菜粕", "CS": "淀粉",
                "AP": "苹果", "CJ": "红枣", "PK": "花生", "B": "豆二",
                "L": "塑料", "V": "PVC", "PP": "聚丙烯", "EG": "乙二醇",
                "EB": "苯乙烯", "PG": "LPG", "J": "焦炭", "JM": "焦煤",
                "I": "铁矿石", "WH": "强麦", "PM": "普麦", "FG": "玻璃",
                "SA": "纯碱", "UR": "尿素", "SP": "纸浆", "RU": "橡胶",
                "NR": "20号胶", "BU": "沥青", "FU": "燃料油", "LU": "低硫燃料油",
                "SC": "原油", "CU": "铜", "AL": "铝", "ZN": "锌", "PB": "铅",
                "NI": "镍", "SN": "锡", "AU": "黄金", "AG": "白银", "RB": "螺纹钢",
                "HC": "热卷", "SS": "不锈钢"
            }
            
            # 使用 AKShare 的 futures_spot_price 接口获取现货价格和基差
            try:
                df = ak.futures_spot_price()
                if df is not None and not df.empty:
                    logger.info(f"futures_spot_price 返回 {len(df)} 条数据")
                    
                    # 农产品品种缩写列表
                    agri_symbols = ["C", "A", "M", "Y", "P", "JD", "LH", "CF", "SR", "OI", "RM", "CS", "AP", "CJ", "PK", "B"]
                    
                    for _, row in df.iterrows():
                        symbol_code = str(row['symbol']) if 'symbol' in df.columns else str(row.iloc[1])
                        
                        # 检查是否是农产品
                        if symbol_code in agri_symbols:
                            chinese_name = symbol_to_name.get(symbol_code, symbol_code)
                            
                            # 如果指定了 target_names，过滤
                            if target_names and chinese_name not in target_names:
                                continue
                            
                            # 获取数据
                            try:
                                spot_price = float(row['spot_price']) if 'spot_price' in row else 0
                                dominant_contract_price = float(row['dominant_contract_price']) if 'dominant_contract_price' in row else 0
                                dom_basis = float(row['dom_basis']) if 'dom_basis' in row else 0
                                dom_basis_rate = float(row['dom_basis_rate']) if 'dom_basis_rate' in row else 0
                                date_str = str(row['date']) if 'date' in row else ""
                                
                                if spot_price > 0:
                                    spot_data.append({
                                        "name": chinese_name,
                                        "symbol": symbol_code,
                                        "price": round(spot_price, 2),
                                        "futures_price": round(dominant_contract_price, 2) if dominant_contract_price else None,
                                        "basis": round(dom_basis, 2) if dom_basis else None,
                                        "basis_rate": f"{round(dom_basis_rate * 100, 2)}%" if dom_basis_rate else None,
                                        "date": date_str,
                                        "source": "AKShare-现货价格"
                                    })
                                    logger.info(f"获取到 {chinese_name}({symbol_code}) 现货: {spot_price}, 期货: {dominant_contract_price}, 基差: {dom_basis}")
                            except Exception as e:
                                logger.warning(f"解析 {symbol_code} 数据失败: {e}")
                                continue
            except Exception as e:
                logger.warning(f"futures_spot_price 接口获取失败: {e}")
            
            # 如果 futures_spot_price 失败，尝试使用 99期货 数据源
            if not spot_data:
                try:
                    spot_table = ak.spot_price_table_qh()
                    if spot_table is not None and not spot_table.empty:
                        agri_keywords = ["玉米", "大豆", "豆粕", "豆油", "鸡蛋", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "菜籽油", "淀粉", "花生", "苹果", "红枣"]
                        
                        for _, row in spot_table.iterrows():
                            symbol_name = str(row.iloc[0]) if len(row) > 0 else ""
                            if any(kw in symbol_name for kw in agri_keywords):
                                if target_names and not any(t in symbol_name for t in target_names):
                                    continue
                                
                                try:
                                    df_trend = ak.spot_price_qh(symbol=symbol_name)
                                    if df_trend is not None and not df_trend.empty:
                                        latest = df_trend.iloc[-1]
                                        # 99期货返回：日期、期货收盘价、现货价格
                                        spot_price = float(latest.iloc[2]) if len(latest) > 2 else 0
                                        futures_price = float(latest.iloc[1]) if len(latest) > 1 else 0
                                        
                                        if spot_price > 0:
                                            spot_data.append({
                                                "name": symbol_name,
                                                "price": round(spot_price, 2),
                                                "futures_price": round(futures_price, 2) if futures_price else None,
                                                "basis": round(futures_price - spot_price, 2) if futures_price and spot_price else None,
                                                "date": str(latest.iloc[0]).split()[0] if len(latest) > 0 else "",
                                                "source": "99期货"
                                            })
                                except:
                                    continue
                except Exception as e:
                    logger.warning(f"99期货现货价格获取失败: {e}")
            
            if spot_data:
                logger.info(f"成功获取 {len(spot_data)} 个品种的现货价格")
                return spot_data
            else:
                logger.warning("未获取到任何现货价格数据")
                return []
                
        except Exception as e:
            logger.error(f"获取现货价格失败: {e}")
            return []

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

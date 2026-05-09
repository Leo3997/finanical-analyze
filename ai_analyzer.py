import os
import sys
import io

# 强制设置标准输出编码为 UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from openai import OpenAI
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AIAnalyzer:
    """AI 分析类，负责调用 DeepSeek API 进行研报生成"""
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com"
        )

    def _strip_opening_remark(self, text):
        lines = text.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('#') or stripped.startswith('【'):
                return '\n'.join(lines[i:])
            if stripped.startswith('**') and ('】' in stripped or '趋势' in stripped or '核心' in stripped or '当前' in stripped):
                return '\n'.join(lines[i:])
        return text

    def generate_report(self, quotes_data, news_data):
        """根据行程数据和新闻生成深度研报"""
        if not quotes_data:
            return "暂无行情数据进行分析。"

        # 构建 Prompt
        prompt = f"""你是一个资深农产品期货分析师。请根据以下今日期货行情数据和行业新闻，撰写一份简洁、专业且具有洞察力的每日研报。

### 今日行情数据：
{quotes_data}

### 相关财经新闻：
{news_data}

### 输出要求：
1. **使用 Markdown 格式**。
2. **市场情绪指数**：根据行情数据给出 0-100 的情绪评分（0-40 极度恐慌/看空，40-60 中性，60-100 乐观/看多），并提供一个简单的可视化条（如：`[████░░░░░░] 40%`）。
3. **报告结构**：
    - **【市场情绪】**：展示得分及简要定性描述。
    - **【当前趋势总结】**：简明扼要地概括当前农产品期货市场的整体趋势和行情特征。
    - **【核心品种聚焦】**：重点分析玉米和鸡蛋两个核心品种，包括价格走势、成交量变化、资金流向及背后逻辑。
    - **【异动品种提示】**：识别涨跌幅较大或成交活跃的品种，并结合新闻简析原因。
    - **【名家指北】**：引用一句经济学名人名言，并借此深刻点评当日最具代表性的异动品种及其背后的逻辑。
    - **【板块精评】**：
        - **核心品种**：玉米、鸡蛋深度分析
        - **蛋白粕板块**：豆粕、菜粕、豆二等品种分析
        - **油脂板块**：豆油、棕榈油、菜籽油等品种分析
        - **谷物板块**：淀粉、大豆等品种分析
        - **软商品板块**：白糖、棉花、苹果、红枣等品种分析
        - **畜牧板块**：生猪等品种分析
    - **【明日关注】**：列出需要重点盯防的指标或事件。
4. **排版规范**：必须做到排版整齐一致，层次分明，适当留白。数据和核心观点必须加粗，列表符号需保持统一，确保在手机端浏览体验极佳。
5. **风格**：专业、干练，避免废话，适合在手机钉钉上快速阅读。
6. **分析要求**：
    - 玉米和鸡蛋作为核心品种，需要重点分析，篇幅占比最大。
    - 其余品种作为辅助，简要分析即可，突出各板块的特点和趋势。
    - 分析农产品之间的关联性和整体板块效应。
"""

        try:
            logger.info("正在调用 DeepSeek API 生成研报...")
            response = self.client.chat.completions.create(
                model="deepseek-v4-pro",
                messages=[
                    {"role": "system", "content": "你是一个专业的农产品期货分析师，特别擅长分析玉米和鸡蛋等核心品种，同时兼顾其他农产品板块的整体趋势。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return self._strip_opening_remark(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"调用 DeepSeek API 失败: {e}")
            return f"AI 分析失败: {e}"

    def analyze_news_impact(self, news_items):
        """对当前新闻进行深度期货影响分析"""
        if not news_items:
            return "暂无新闻内容进行分析。"

        # 将新闻列表转换为字符串
        news_text = ""
        for i, item in enumerate(news_items[:15]): # 取最近 15 条
            source = item.get('source', '未知来源')
            news_text += f"{i+1}. [{item['pub_date']}][{source}] {item['content']}\n"

        prompt = f"""你是一个顶尖的农产品期货市场研究员，擅长从海量资讯中提炼核心矛盾。请针对以下最新的市场快讯，进行深度解析。

### 最新快讯内容：
{news_text}

### 输出要求：
1. **使用 Markdown 格式**。
2. **报告结构**：
    - **【核心矛盾点拨】**：用一句话总结当前市场最关键的博弈核心（如供需缺口、政策预期、天气影响等）。
    - **【核心品种影响】**：重点分析新闻对玉米、鸡蛋、豆粕、豆油、生猪的影响。
        - 格式：**[玉米/鸡蛋/豆粕/豆油/生猪]** - 影响：[看多/看空/震荡] - 逻辑：[简述原因]。
    - **【其他品种影响矩阵】**：
        - 列出 3-5 个受影响的其他农产品品种（如豆粕、豆油、生猪等）。
        - 格式：**[品种名称]** - 影响：[看多/看空/震荡] - 逻辑：[简述原因]。
    - **【宏观环境扫描】**：分析当前的金融环境（利率、汇率）对农产品市场的整体扰动。
    - **【操作建议/风险警示】**：给出一句极具洞察力的风险提示。
3. **排版规范**：各模块内容排版整齐，重点信息加粗，适合在深色调看板上阅读。
4. **风格**：专业、深刻、一针见血。
5. **分析要求**：
    - 优先分析玉米和鸡蛋，篇幅占比最大。
    - 其余品种简要分析即可。
"""

        try:
            logger.info("正在调用 DeepSeek API 进行新闻深度分析...")
            response = self.client.chat.completions.create(
                model="deepseek-v4-pro",
                messages=[
                    {"role": "system", "content": "你是一个敏锐的农产品期货市场策略分析师，特别关注玉米和鸡蛋等核心品种。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return self._strip_opening_remark(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"新闻深度分析失败: {e}")
            return f"AI 深度分析失败: {e}"

    def generate_commodity_report(self, quotes_data, news_data, keywords, spot_prices=None, position_rank=None):

        """生成农产品期货专项研报"""
        if not news_data:
            return "暂无相关农产品期货新闻数据。"

        position_rank_text = ""
        if position_rank:
            position_rank_text = "\n### 主力持仓排名（前5席多空增减）：\n"
            for item in position_rank:
                variety = item.get('variety', '')
                contract = item.get('contract', '')
                long_list = item.get('long', [])
                short_list = item.get('short', [])
                
                position_rank_text += f"\n**{variety}** ({contract})：\n"
                
                if long_list:
                    longs = ', '.join([f"{m['name']}{m['volume']}({m['change']})" for m in long_list[:5]])
                    position_rank_text += f"  多单TOP5：{longs}\n"
                if short_list:
                    shorts = ', '.join([f"{m['name']}{m['volume']}({m['change']})" for m in short_list[:5]])
                    position_rank_text += f"  空单TOP5：{shorts}\n"

        spot_text = ""
        spot_stats = ""
        if spot_prices and len(spot_prices) > 0:
            spot_names = [item['name'] for item in spot_prices]
            spot_stats = f"\n**现货数据可用品种（{len(spot_prices)}个）**: {', '.join(spot_names)}\n"
            spot_text = "\n### 现货价格参考（含基差数据）：\n"
            for item in spot_prices:
                basis_info = ""
                if item.get('basis') is not None:
                    basis_info = f", 基差: {item['basis']}"
                if item.get('futures_price'):
                    basis_info += f", 对应期货价: {item['futures_price']}"
                spot_text += f"- **{item['name']}**: 现货 {item['price']} 元/吨{basis_info} (日期: {item['date']})\n"
        else:
            spot_stats = "\n**注意：今日未获取到任何现货价格数据**，期现价差分析章节请基于历史经验和行情数据给出定性分析，不要虚构具体基差数值。\n"

        prompt = f"""你是一个资深农产品期货分析师。请针对以下【{', '.join(keywords)}】等品种，撰写一份详细的每日市场动态报告。
重点关注：最新国内外消息、供需变动、国际市场（如CBOT、USDA报告）的影响、期现价差分析。
{spot_stats}
### 市场参考行情：
{quotes_data}
{spot_text}
{position_rank_text}
### 搜集到的最新国内外消息：
{news_data}",

### 输出要求：
**总字数控制在600-700字以内**，精炼干练，去除一切冗余客套。
1. **使用 Markdown 格式**，不要有任何开场白，直接从报告标题开始。
2. **报告结构（以下6个板块，缺一不可）**：
    - **【今日概览】**：一句话总结当日农产品期货市场核心特征，标注涨跌品种个数及领涨/领跌品种名称和幅度。（约50-60字）
    - **【宏观环境】**：结合人民币汇率、黄金、地缘政治等宏观因素，用1-2句话简述对农产品板块的潜在传导（约40-50字）。
    - **【核心品种聚焦】**：结合价格走势和基差，新闻进行分析。
        - **玉米**：价格、供需、CBOT联动、期现价差，50-70字。
        - **鸡蛋**：价格、存栏、季节性因素、饲料成本，50-70字。
        - **豆粕**：价格、压榨利润、中美贸易影响，40-50字。
        - **豆二**：进口大豆价格、到港情况，40-50字。
        - **豆油**：价格、油脂替代效应、国际棕榈油联动，40-50字。
        - **白糖**：价格、季节性消费、国际原糖联动，40-50字。
    - **【板块扫描】**：蛋白粕、油脂、谷物、软商品、畜牧各用一句简短总结当前走势及关键驱动（每板块15-20字，5板块合计约100字）。
    - **【期现价差】**：**必须使用Markdown表格**，列出主要品种的品种、期货价、现货价、基差、基差率五列。不需求逐行分析，表格本身即说明一切。
    - **【风险预警】**：一句话列出1-2个近期可能引发价格剧烈波动的关键风险因素（约30-50字）。
3. **排版规范**：紧凑排版，层级清晰，关键数据和变动用加粗。表格和列表之间不留多余空行。适合手机钉钉一屏浏览。
4. **风格**：极度精炼、一针见血，不用"分析认为""值得关注"等套话，直接用数据和结论说话。
5. **核心原则**：玉米鸡蛋篇幅占50%，其余品种占50%。避免背景介绍和历史回顾，只讲"今天发生了什么"。
"""

        try:
            logger.info("正在调用 DeepSeek API 生成农产品期货日报...")
            response = self.client.chat.completions.create(
                model="deepseek-v4-pro",
                messages=[
                    {"role": "system", "content": "你是一个沉稳且专业的农产品期货研究员，特别擅长分析玉米和鸡蛋等核心品种，同时兼顾其他农产品板块的整体趋势。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return self._strip_opening_remark(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"生成农产品期货日报失败: {e}")
            return f"日报生成失败: {e}"

if __name__ == "__main__":
    # 模拟测试数据
    test_quotes = [
        {"symbol": "玉米", "price": 2600, "change_pc": 1.2, "volume": 400000, "hold": 900000},
        {"symbol": "鸡蛋", "price": 4200, "change_pc": -0.8, "volume": 300000, "hold": 700000},
        {"symbol": "豆粕", "price": 3100, "change_pc": 2.5, "volume": 500000, "hold": 1200000},
        {"symbol": "豆油", "price": 8500, "change_pc": -0.5, "volume": 350000, "hold": 850000},
        {"symbol": "生猪", "price": 15000, "change_pc": -2.0, "volume": 200000, "hold": 600000}
    ]
    test_news = "1. 美国中西部天气干旱影响大豆产量预期。\n2. 国内玉米库存数据公布。\n3. 鸡蛋存栏量变化。\n4. 生猪存栏量变化。"
    
    analyzer = AIAnalyzer()
    report = analyzer.generate_report(test_quotes, test_news)
    print("\n--- 生成的 AI 研报 ---")
    print(report)

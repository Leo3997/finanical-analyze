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

    def generate_report(self, quotes_data, news_data):
        """根据行程数据和新闻生成深度研报"""
        if not quotes_data:
            return "暂无行情数据进行分析。"

        # 构建 Prompt
        prompt = f"""你是一个资深大宗商品分析师。请根据以下今日期货行情数据和行业新闻，撰写一份简洁、专业且具有洞察力的每日研报。

### 今日行情数据：
{quotes_data}

### 相关财经新闻：
{news_data}

### 输出要求：
1. **使用 Markdown 格式**。
2. **市场情绪指数**：根据行情数据给出 0-100 的情绪评分（0-40 极度恐慌/看空，40-60 中性，60-100 乐观/看多），并提供一个简单的可视化条（如：`[████░░░░░░] 40%`）。
3. **报告结构**：
    - **【市场情绪】**：展示得分及简要定性描述。
    - **【当前趋势总结】**：简明扼要地概括当前市场的整体趋势和行情特征。
    - **【异动品种提示】**：识别涨跌幅较大或成交活跃的品种，并结合新闻简析原因。
    - **【名家指北】**：引用一句经济学名人名言，并借此深刻点评当日最具代表性的异动品种及其背后的逻辑。
    - **【板块精评】**：
        - **农产品板块**：综合分析蛋白粕（豆粕、菜粕）、油脂（豆油、棕榈油、菜籽油）、谷物（玉米、淀粉、大豆）、软商品（白糖、棉花、苹果、红枣）、畜牧（生猪、鸡蛋）等所有农产品分类的整体表现和趋势。
        - **其他板块**：如果有化工等其他板块数据，也进行简要点评。
    - **【明日关注】**：列出需要重点盯防的指标或事件。
4. **排版规范**：必须做到排版整齐一致，层次分明，适当留白。数据和核心观点必须加粗，列表符号需保持统一，确保在手机端浏览体验极佳。
5. **风格**：专业、干练，避免废话，适合在手机钉钉上快速阅读。
6. **农产品覆盖要求**：
    - 必须覆盖所有农产品分类，不要过度聚焦于单一品种（如豆粕）。
    - 对每个农产品分类都要有简要分析，突出各分类的特点和趋势。
    - 分析农产品之间的关联性和整体板块效应。
"""

        try:
            logger.info("正在调用 DeepSeek API 生成研报...")
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个专业的期货市场分析师，特别擅长分析农产品板块的整体趋势和各细分品种的表现。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return response.choices[0].message.content
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

        prompt = f"""你是一个顶尖的期货市场研究员，擅长从海量资讯中提炼核心矛盾。请针对以下最新的市场快讯，进行深度解析。

### 最新快讯内容：
{news_text}

### 输出要求：
1. **使用 Markdown 格式**。
2. **报告结构**：
    - **【核心矛盾点拨】**：用一句话总结当前市场最关键的博弈核心（如地缘溢价、供需缺口、政策预期等）。
    - **【品种影响矩阵】**：
        - 列出 3-5 个受影响最显著的品种（如玉米、大豆、原油等）。
        - 格式：**[品种名称]** - 影响：[看多/看空/震荡] - 逻辑：[简述原因]。
    - **【宏观环境扫描】**：分析当前的金融环境（利率、汇率）对商品市场的整体扰动。
    - **【操作建议/风险警示】**：给出一句极具洞察力的风险提示。
3. **排版规范**：各模块内容排版整齐，重点信息加粗，适合在深色调看板上阅读。
4. **风格**：专业、深刻、一针见血。
5. **农产品覆盖要求**：
    - 分析新闻对农产品各分类（蛋白粕、油脂、谷物、软商品、畜牧）的影响。
    - 不要只关注单一品种，要综合分析整个农产品板块。
"""

        try:
            logger.info("正在调用 DeepSeek API 进行新闻深度分析...")
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个敏锐的期货市场策略分析师，特别关注农产品板块的整体动态。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"新闻深度分析失败: {e}")
            return f"AI 深度分析失败: {e}"

    def generate_commodity_report(self, quotes_data, news_data, keywords):

        """生成大宗商品专项研报"""
        if not news_data:
            return "暂无相关大宗商品新闻数据。"

        prompt = f"""你是一个资深大宗商品分析师。请针对以下【{', '.join(keywords)}】等品种，撰写一份详细的每日市场动态报告。
重点关注：最新国内外消息、供需变动、国际市场（如CBOT、USDA报告）的影响。

### 市场参考行情：
{quotes_data}

### 搜集到的最新国内外消息：
{news_data}

### 输出要求：
1. **使用 Markdown 格式**。
2. **报告结构**：
    - **【当前趋势总结】**：提炼并总结当前大宗商品市场的核心运行趋势。
    - **【今日头条/核心动向】**：提取最具影响力的1-2条国内外消息。
    - **【农产品板块分析】**：
        - **蛋白粕**：豆粕、菜粕等品种分析
        - **油脂**：豆油、棕榈油、菜籽油等品种分析
        - **谷物**：玉米、淀粉、大豆等品种分析
        - **软商品**：白糖、棉花、苹果、红枣等品种分析
        - **畜牧**：生猪、鸡蛋等品种分析
    - **【国际市场联动】**：重点分析美盘（CBOT）、南美产区天气或出口政策对国内的传导。
    - **【产业链深度分析】**：分析农产品产业链的上下游关系和替代效应。
    - **【大师箴言】**：引用一句经典经济学名言，用以点睛和总结当日行情中最关键的品种异动或产业链异象。
    - **【风险提示】**：列出短期内可能导致价格剧烈波动的因素。
3. **排版规范**：各模块内容排版必须高度整齐一致，标题明确，层级清晰。关键变动、核心逻辑和重要数据应用加粗来凸显。
4. **风格**：深度、专业、客观，对“国际消息”需进行重点标注和解读。
5. **覆盖要求**：
    - 必须覆盖所有农产品分类，不要过度聚焦于单一品种。
    - 对每个农产品分类都要有详细分析，突出各分类的特点和趋势。
    - 分析农产品之间的关联性和整体板块效应。
"""

        try:
            logger.info("正在调用 DeepSeek API 生成大宗商品日报...")
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个沉稳且专业的国际大宗商品研究员，特别擅长分析农产品板块的整体趋势。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"生成大宗商品日报失败: {e}")
            return f"日报生成失败: {e}"

if __name__ == "__main__":
    # 模拟测试数据
    test_quotes = [
        {"symbol": "豆粕", "price": 3100, "change_pc": 2.5, "volume": 500000, "hold": 1200000},
        {"symbol": "玉米", "price": 2600, "change_pc": 1.2, "volume": 400000, "hold": 900000},
        {"symbol": "豆油", "price": 8500, "change_pc": -0.8, "volume": 350000, "hold": 850000},
        {"symbol": "白糖", "price": 5800, "change_pc": 1.5, "volume": 300000, "hold": 750000},
        {"symbol": "生猪", "price": 15000, "change_pc": -2.0, "volume": 200000, "hold": 600000}
    ]
    test_news = "1. 美国中西部天气干旱影响大豆产量预期。\n2. 南美棕榈油产量下滑。\n3. 国内玉米库存数据公布。\n4. 生猪存栏量变化。"
    
    analyzer = AIAnalyzer()
    report = analyzer.generate_report(test_quotes, test_news)
    print("\n--- 生成的 AI 研报 ---")
    print(report)

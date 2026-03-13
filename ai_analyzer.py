import os
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
    - **【市场全局总结】**：概括今日行情特征。
    - **【异动品种提示】**：识别涨幅较大或成交活跃的品种，并结合新闻简析原因。
    - **【板块精评】**：针对农产品/饲料板块、化工板块进行点评。
    - **【明日关注】**：列出需要重点盯防的指标或事件。
4. **风格**：专业、干练，避免废话，适合在手机钉钉上快速阅读。
"""

        try:
            logger.info("正在调用 DeepSeek API 生成研报...")
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个专业的期货市场分析师。"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"调用 DeepSeek API 失败: {e}")
            return f"AI 分析失败: {e}"

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
    - **【今日头条/核心动向】**：提取最具影响力的1-2条国内外消息。
    - **【国内市场分析】**：针对玉米、淀粉、大豆、豆粕等品种的国内现货及期货特征。
    - **【国际市场联动】**：重点分析美盘（CBOT）、南美产区天气或出口政策对国内的传导。
    - **【产业链深度：乙醇与生物柴油】**：结合能源和油脂板块，分析其替代效应或成本端变动。
    - **【风险提示】**：列出短期内可能导致价格剧烈波动的因素。
3. **风格**：深度、专业、客观，对“国际消息”需进行重点标注和解读。
"""

        try:
            logger.info("正在调用 DeepSeek API 生成大宗商品日报...")
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个沉稳且专业的国际大宗商品研究员。"},
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
        {"symbol": "甲醇", "price": 2500, "change_pc": -1.2, "volume": 300000, "hold": 800000}
    ]
    test_news = "1. 美国中西部天气干旱影响大豆产量预期。\n2. 化工原料原油价格小幅震荡。"
    
    analyzer = AIAnalyzer()
    report = analyzer.generate_report(test_quotes, test_news)
    print("\n--- 生成的 AI 研报 ---")
    print(report)

import os
import json
from data_fetcher import DataFetcher
from ai_analyzer import AIAnalyzer
from dotenv import load_dotenv

load_dotenv()

def test_commodity_flow():
    fetcher = DataFetcher()
    analyzer = AIAnalyzer()
    
    print("1. 测试数据抓取...")
    keywords = ["玉米", "大豆", "乙醇", "生物柴", "CBOT"]
    news = fetcher.get_commodity_news(keywords)
    print(f"找到 {len(news)} 条相关新闻")
    for item in news[:3]:
        print(f"- [{'国际' if item.get('is_intl') else '国内'}] {item['content'][:50]}...")

    print("\n2. 测试行情抓取...")
    targets = ["玉米", "大豆", "豆油", "乙醇", "生物柴"]
    quotes = fetcher.get_futures_quotes(targets)
    print(f"获取到 {len(quotes)} 条行情数据")

    print("\n3. 测试 AI 报告生成 (模拟)...")
    if news:
        news_str = "\n".join([f"({item['pub_date']}) {item['content']}" for item in news[:5]])
        report = analyzer.generate_commodity_report(quotes, news_str, keywords)
        print("AI 报告预览:")
        print(report[:500] + "...")
    else:
        print("跳过 AI 报告测试，因为没有新闻数据。")

if __name__ == "__main__":
    test_commodity_flow()

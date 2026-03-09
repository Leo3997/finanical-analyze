from datetime import datetime
import os
import logging
from dotenv import load_dotenv

from data_fetcher import DataFetcher
from ai_analyzer import AIAnalyzer
from notifier import DingTalkNotifier
import chinese_calendar

# 加载环境
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    now = datetime.now()
    
    # 1. 节假日判断
    if chinese_calendar.is_holiday(now):
        logger.info(f"今日 {now.strftime('%Y-%m-%d')} 为节假日，跳过任务。")
        return

    logger.info("开始执行 GitHub Actions 自动化推送任务...")
    
    fetcher = DataFetcher()
    analyzer = AIAnalyzer()
    notifier = DingTalkNotifier()

    # 2. 采集数据
    target_symbols = [s.strip() for s in os.getenv("TARGET_SYMBOLS", "").split(",") if s.strip()]
    quotes_data = fetcher.get_futures_quotes(target_symbols)
    
    news_df = fetcher.get_futures_news()
    news_list = []
    if news_df is not None:
        for idx, row in news_df.iterrows():
            content = row.get('title', row.get('content', '无内容'))
            time_str = row.get('pubDate', row.get('发布时间', '无时间'))
            news_list.append(f"{time_str}：{content}")
    news_str = "\n".join(news_list)

    # 3. AI 分析
    report = analyzer.generate_report(quotes_data, news_str)
    
    # 4. 推送
    title = f"【期货研报-豆粕相关】({now.strftime('%m-%d')})"
    full_text = f"# {title}\n\n{report}"
    notifier.send_markdown(title, full_text)
    logger.info("GitHub Actions 任务执行成功。")

if __name__ == "__main__":
    main()

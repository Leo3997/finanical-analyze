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

import argparse
import json

def main():
    parser = argparse.ArgumentParser(description="Futures Daily Report Workflow")
    parser.add_argument("--step", choices=["all", "prepare", "notify"], default="all", help="执行阶段")
    args = parser.parse_args()

    now = datetime.now()
    
    # 1. 节假日判断
    if chinese_calendar.is_holiday(now):
        logger.info(f"今日 {now.strftime('%Y-%m-%d')} 为节假日，跳过任务。")
        return

    fetcher = DataFetcher()
    
    state_file = "workflow_state.json"

    # --- 阶段一：准备数据并生成图表 ---
    if args.step in ["all", "prepare"]:
        logger.info("开始执行数据准备阶段...")
        target_symbols = [s.strip() for s in os.getenv("TARGET_SYMBOLS", "").split(",") if s.strip()]
        if not target_symbols:
            target_symbols = ["豆粕"]
            
        quotes_data = fetcher.get_futures_quotes(target_symbols)
        
        # 获取新闻
        news_df = fetcher.get_futures_news()
        news_list = []
        if news_df is not None:
            for idx, row in news_df.iterrows():
                content = row.get('title', row.get('content', '无内容'))
                time_str = row.get('pubDate', row.get('发布时间', '无时间'))
                news_list.append(f"{time_str}：{content}")
        news_str = "\n".join(news_list)

        # 生成趋势图
        chart_info = {"img_name": "", "chart_url": ""}
        if target_symbols:
            main_symbol = target_symbols[0]
            os.makedirs("static/charts", exist_ok=True)
            img_name = f"trend_{now.strftime('%Y%m%d')}.png"
            img_path = os.path.join("static/charts", img_name)
            if fetcher.generate_trend_chart(main_symbol, output_path=img_path):
                chart_info["img_name"] = img_name
                logger.info(f"图表已成功生成: {img_path}")
            else:
                logger.error(f"图表生成失败: {main_symbol}")

        # 调试：打印 charts 目录内容
        if os.path.exists("static/charts"):
            logger.info(f"目录 static/charts 内容: {os.listdir('static/charts')}")
                
        # 构造 URL
        # 优先级：GitHub Actions 环境 > BASE_URL
        github_repo = os.getenv("GITHUB_REPOSITORY")
        if github_repo:
            # https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
            chart_info["chart_url"] = f"https://raw.githubusercontent.com/{github_repo}/main/static/charts/{img_name}"
        else:
            base_url = os.getenv("BASE_URL", "").rstrip("/")
            if base_url:
                chart_info["chart_url"] = f"{base_url}/static/charts/{img_name}"

        # 保存状态供下一阶段使用
        state = {
            "quotes_data": quotes_data,
            "news_str": news_str,
            "chart_info": chart_info,
            "date_str": now.strftime('%m-%d')
        }
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
        logger.info(f"数据准备完成，状态已保存至 {state_file}")

    # --- 阶段二：AI 分析并推送 ---
    if args.step in ["all", "notify"]:
        if not os.path.exists(state_file):
            logger.error(f"找不到状态文件 {state_file}，请先执行 prepare 阶段。")
            return

        with open(state_file, "r", encoding="utf-8") as f:
            state = json.load(f)

        logger.info("开始执行 AI 分析与推送阶段...")
        analyzer = AIAnalyzer()
        notifier = DingTalkNotifier()
        
        report = analyzer.generate_report(state["quotes_data"], state["news_str"])
        
        title = f"【期货智研-情绪增强版】({state['date_str']})"
        chart_url = state["chart_info"].get("chart_url")
        
        image_markdown = ""
        if chart_url:
            image_markdown = f"![趋势图]({chart_url})\n\n"
            
        full_text = f"## {title}\n\n{image_markdown}{report}"
        notifier.send_markdown(title, full_text)
        logger.info("推送任务执行成功。")

if __name__ == "__main__":
    main()

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
            target_symbols = ["豆粕", "玉米", "大豆", "乙醇", "生物柴"]
            
        quotes_data = fetcher.get_futures_quotes(target_symbols)
        
        # 获取通用期货新闻
        news_df = fetcher.get_futures_news()
        news_list = []
        if news_df is not None:
            for idx, row in news_df.iterrows():
                content = row.get('title', row.get('content', '无内容'))
                time_str = row.get('pubDate', row.get('发布时间', '无时间'))
                news_list.append(f"{time_str}：{content}")
        news_str = "\n".join(news_list)

        # 获取大宗商品专项新闻
        commodity_keywords = ["玉米", "淀粉", "乙醇", "大豆", "豆粕", "豆油", "生物柴", "CBOT", "USDA"]
        commodity_news_list = fetcher.get_commodity_news(commodity_keywords)
        commodity_news_str = "\n".join([f"({item.get('pub_date','')}) {'[国际]' if item.get('is_intl') else ''} {item.get('content','')}" for item in commodity_news_list])

        # 生成趋势图 (全品种)
        charts_list = []
        if target_symbols:
            os.makedirs("static/charts", exist_ok=True)
            for symbol in target_symbols:
                img_name = f"trend_{symbol}_{now.strftime('%Y%m%d')}.png"
                img_path = os.path.join("static/charts", img_name)
                if fetcher.generate_trend_chart(symbol, output_path=img_path):
                    chart_item = {"symbol": symbol, "img_name": img_name}
                    
                    # 构造 URL
                    github_repo = os.getenv("GITHUB_REPOSITORY")
                    if github_repo:
                        chart_item["chart_url"] = f"https://raw.githubusercontent.com/{github_repo}/main/static/charts/{img_name}"
                        chart_item["page_url"] = f"https://github.com/{github_repo}/blob/main/static/charts/{img_name}"
                    
                    charts_list.append(chart_item)
                    logger.info(f"图表已成功生成: {img_path}")
                else:
                    logger.error(f"图表生成失败: {symbol}")

        # 调试：打印 charts 目录内容
        if os.path.exists("static/charts"):
            logger.info(f"目录 static/charts 内容: {os.listdir('static/charts')}")
                

        # 保存状态供下一阶段使用
        state = {
            "quotes_data": quotes_data,
            "news_str": news_str,
            "commodity_news_str": commodity_news_str,
            "commodity_keywords": commodity_keywords,
            "charts_list": charts_list,
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
        
        # 1. 每日智研推送
        report = analyzer.generate_report(state["quotes_data"], state["news_str"])
        title = f"【期货智研-情绪增强版】({state['date_str']})"
        notifier.send_markdown(title, f"## {title}\n\n{report}")
        
        # 2. 大宗商品市场日报推送
        commodity_report = analyzer.generate_commodity_report(
            state["quotes_data"], 
            state["commodity_news_str"],
            state["commodity_keywords"]
        )
        comm_title = f"【大宗商品市场日报】({state['date_str']})"
        notifier.send_markdown(comm_title, f"## {comm_title}\n\n{commodity_report}")

        # 3. 单独发送各品种趋势图 link 消息
        for chart_info in state.get("charts_list", []):
            chart_url = chart_info.get("chart_url")
            symbol = chart_info.get("symbol")
            if chart_url:
                page_url = chart_info.get("page_url", chart_url)
                notifier.send_link(
                    title=f"📈 {symbol} 趋势图 ({state['date_str']})",
                    text=f"点击查看今日 {symbol} 期货趋势分析图",
                    message_url=page_url,
                    pic_url=chart_url
                )
        
        logger.info("推送任务执行成功。")

if __name__ == "__main__":
    main()

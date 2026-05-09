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
        # 农产品期货品种：玉米、鸡蛋为主，其余为辅
        target_symbols = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "菜籽油", "苹果", "红枣", "花生", "大豆"]
            
        quotes_data = fetcher.get_futures_quotes(target_symbols)
        
        # 获取农产品现货价格
        spot_prices = fetcher.get_spot_prices(target_symbols)
        
        # 获取通用期货新闻
        news_df = fetcher.get_futures_news()
        news_list = []
        if news_df is not None:
            for idx, row in news_df.iterrows():
                content = row.get('title', row.get('content', '无内容'))
                time_str = row.get('pubDate', row.get('发布时间', '无时间'))
                news_list.append(f"{time_str}：{content}")
        news_str = "\n".join(news_list)

        # 获取农产品期货专项新闻
        commodity_keywords = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "CBOT", "USDA", "农产品"]
        commodity_news_list = fetcher.get_commodity_news(commodity_keywords)
        commodity_news_str = "\n".join([f"({item.get('pub_date','')}) {'[国际]' if item.get('is_intl') else ''} {item.get('content','')}" for item in commodity_news_list])

        # 调试：打印 charts 目录内容 (已禁用生成)
                

        # 保存状态供下一阶段使用
        state = {
            "quotes_data": quotes_data,
            "spot_prices": spot_prices,
            "news_str": news_str,
            "commodity_news_str": commodity_news_str,
            "commodity_keywords": commodity_keywords,
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
        
        # 1. 每日智研推送 (已取消)
        # report = analyzer.generate_report(state["quotes_data"], state["news_str"])
        # title = f"【期货智研-情绪增强版】({state['date_str']})"
        # notifier.send_markdown(title, f"## {title}\n\n{report}")
        
        # 2. 大宗商品市场日报推送
        commodity_report = analyzer.generate_commodity_report(
            state["quotes_data"], 
            state["commodity_news_str"],
            state["commodity_keywords"],
            state.get("spot_prices", [])
        )
        comm_title = f"【大宗商品市场日报】({state['date_str']})"
        notifier.send_markdown(comm_title, f"## {comm_title}\n\n{commodity_report}")

        # 3. 趋势图推送已取消
        
        logger.info("推送任务执行成功。")

if __name__ == "__main__":
    main()

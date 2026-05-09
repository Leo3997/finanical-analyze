from datetime import datetime
import os
import logging
from dotenv import load_dotenv

from data_fetcher import DataFetcher
from ai_analyzer import AIAnalyzer
from notifier import DingTalkNotifier
from pdf_generator import PDFGenerator
from chart_generator import ChartGenerator
import chinese_calendar

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DESKTOP_NEWS_DIR = os.path.expanduser("~/桌面/日报")

TARGET_SYMBOLS = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "菜籽油", "苹果", "红枣", "花生", "大豆", "豆二"]

COMMODITY_KEYWORDS = ["玉米", "鸡蛋", "豆粕", "豆油", "淀粉", "生猪", "白糖", "棉花", "棕榈油", "菜粕", "豆二", "CBOT", "USDA", "农产品"]


def main():
    now = datetime.now()

    if chinese_calendar.is_holiday(now):
        logger.info(f"今日 {now.strftime('%Y-%m-%d')} 为节假日，跳过任务。")
        return

    logger.info("========== 开始生成每日期货日报 ==========")

    fetcher = DataFetcher()
    analyzer = AIAnalyzer()
    notifier = DingTalkNotifier()

    error_msgs = []

    try:
        logger.info("[1/5] 获取期货行情...")
        quotes_data = fetcher.get_futures_quotes(TARGET_SYMBOLS)
        if not quotes_data:
            error_msgs.append("期货行情获取为空")
    except Exception as e:
        logger.error(f"获取期货行情失败: {e}")
        quotes_data = []
        error_msgs.append(f"期货行情: {e}")

    try:
        logger.info("[2/5] 获取现货价格...")
        spot_prices = fetcher.get_spot_prices(TARGET_SYMBOLS)
    except Exception as e:
        logger.warning(f"获取现货价格失败: {e}")
        spot_prices = []

    try:
        logger.info("[3/5] 获取农产品新闻...")
        commodity_news_list = fetcher.get_commodity_news(COMMODITY_KEYWORDS)
        commodity_news_str = "\n".join([
            f"({item.get('pub_date','')}) {'[国际]' if item.get('is_intl') else ''} {item.get('content','')}"
            for item in commodity_news_list
        ])
        if not commodity_news_str:
            error_msgs.append("新闻获取为空")
    except Exception as e:
        logger.error(f"获取新闻失败: {e}")
        commodity_news_str = ""
        error_msgs.append(f"新闻: {e}")

    position_rank_data = None
    try:
        position_rank_data = fetcher.get_position_rank(
            varieties=["玉米", "鸡蛋", "豆粕", "豆油", "白糖", "豆二"]
        )
        if position_rank_data:
            logger.info(f"持仓排名获取成功: {len(position_rank_data)} 个品种")
    except Exception as e:
        logger.warning(f"持仓排名获取失败: {e}")

    try:
        logger.info("[4/5] AI 生成研报...")
        commodity_report = analyzer.generate_commodity_report(
            quotes_data,
            commodity_news_str,
            COMMODITY_KEYWORDS,
            spot_prices,
            position_rank_data
        )
        if not commodity_report or commodity_report.startswith("日报生成失败"):
            error_msgs.append("AI 研报生成失败")
    except Exception as e:
        logger.error(f"AI 生成研报失败: {e}")
        commodity_report = f"AI 研报生成异常: {e}"
        error_msgs.append(f"AI: {e}")

    date_str = now.strftime('%m-%d')
    comm_title = f"【大宗商品期货日报】({date_str})"

    if commodity_report:
        try:
            notifier.send_markdown(comm_title, f"## {comm_title}\n\n{commodity_report}")
        except Exception as e:
            logger.error(f"钉钉 Markdown 推送失败: {e}")
            error_msgs.append(f"推送: {e}")

    try:
        logger.info("[5/5] 生成 PDF 报告...")
        os.makedirs(DESKTOP_NEWS_DIR, exist_ok=True)
        pdf_gen = PDFGenerator(output_dir=DESKTOP_NEWS_DIR)

        chart_gen = ChartGenerator()
        charts = chart_gen.generate_all_charts(fetcher, date_str=now.strftime('%m%d'), position_rank_data=position_rank_data)
        logger.info(f"图表生成完毕，共 {len(charts)} 张")

        today_str = now.strftime('%Y年%m月%d日')
        pdf_filepath = pdf_gen.markdown_to_pdf(
            commodity_report or "日报生成失败，请检查日志。",
            comm_title,
            report_date=today_str,
            charts=charts
        )

        if pdf_filepath and os.path.exists(pdf_filepath):
            logger.info(f"PDF 已生成: {pdf_filepath}")
            try:
                notifier.send_file(pdf_filepath, title=comm_title)
            except Exception as e:
                logger.error(f"PDF 推送失败: {e}")
                error_msgs.append(f"PDF推送: {e}")
        else:
            logger.warning("PDF 生成返回空路径")
            error_msgs.append("PDF生成失败")
    except Exception as e:
        logger.error(f"PDF 生成流程异常: {e}")
        error_msgs.append(f"PDF: {e}")

    if error_msgs:
        logger.warning(f"任务完成但有 {len(error_msgs)} 个错误: {'; '.join(error_msgs)}")
    else:
        logger.info("========== 每日期货日报生成完成 ==========")


if __name__ == "__main__":
    main()

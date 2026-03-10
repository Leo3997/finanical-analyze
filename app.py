import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory
from flask_apscheduler import APScheduler
import chinese_calendar

from data_fetcher import DataFetcher
from ai_analyzer import AIAnalyzer
from notifier import DingTalkNotifier

# 加载环境
load_dotenv()

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("App")

class Config:
    SCHEDULER_API_ENABLED = True

app = Flask(__name__)
app.config.from_object(Config())

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

fetcher = DataFetcher()
analyzer = AIAnalyzer()
notifier = DingTalkNotifier()

def daily_job():
    """每日执行的核心任务"""
    now = datetime.now()
    
    # 判断是否为节假日（中国）
    if chinese_calendar.is_holiday(now):
        logger.info(f"今日 {now.strftime('%Y-%m-%d')} 是节假日，跳过自动推送。")
        return

    logger.info("开始执行每日研报生成与推送任务...")
    
    # 1. 采集数据
    target_symbols = [s.strip() for s in os.getenv("TARGET_SYMBOLS", "").split(",") if s.strip()]
    
    # 获取行情 (新版接口直接传 symbols)
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

    # 2. AI 分析
    report = analyzer.generate_report(quotes_data, news_str)
    
    # 3. 推送
    title = f"【期货研报-豆粕相关】({now.strftime('%m-%d')})"
    full_text = f"# {title}\n\n{report}"
    notifier.send_markdown(title, full_text)
    
    logger.info("每日任务执行完毕。")

@app.route('/run')
def run_now():
    """手动触发接口"""
    try:
        daily_job()
        return jsonify({"status": "Success", "message": "任务已手动触发并执行"})
    except Exception as e:
        logger.exception("手动触发任务失败")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/health')
def health():
    return jsonify({"status": "OK", "time": datetime.now().isoformat()})

@app.route('/static/charts/<path:filename>')
def serve_charts(filename):
    return send_from_directory('static/charts', filename)

if __name__ == "__main__":
    # 添加定时计划：周一至周五 16:00
    try:
        scheduler.add_job(id='daily_push', func=daily_job, trigger='cron', day_of_week='mon-fri', hour=16, minute=0)
    except Exception as e:
        logger.error(f"添加定时任务失败: {e}")
    
    logger.info("Flask 服务启动...")
    # host='0.0.0.0' 允许外部访问
    app.run(host='0.0.0.0', port=5000, debug=False)

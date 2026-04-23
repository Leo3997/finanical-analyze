import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_apscheduler import APScheduler
import chinese_calendar
import json
import threading

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
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("App")

class Config:
    SCHEDULER_API_ENABLED = True

app = Flask(__name__)
CORS(app) # 启用跨域支持
app.config.from_object(Config())

scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

fetcher = DataFetcher()
analyzer = AIAnalyzer()
notifier = DingTalkNotifier()

# 互斥锁，防止并发执行任务
task_lock = threading.Lock()
current_task_status = {"running": False, "last_result": None}

def daily_job(manual=False, send_notify=True):
    """每日执行的核心任务"""
    if not task_lock.acquire(blocking=False):
        logger.warning("任务已在运行中，跳过本次请求。")
        return False
        
    try:
        current_task_status["running"] = True
        now = datetime.now()
        
        # 如果是自动触发，检查节假日
        if not manual and chinese_calendar.is_holiday(now):
            logger.info(f"今日 {now.strftime('%Y-%m-%d')} 是节假日，跳过自动推送。")
            return True

        logger.info(f"{'手动' if manual else '自动'}触发研报生成任务 (推送: {send_notify})...")
        
        # 1. 采集数据
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

        # 2. AI 分析
        report = analyzer.generate_report(quotes_data, news_str)
        
        # 3. 持久化到状态文件 (供前端显示)
        state_file = 'workflow_state.json'
        state = {}
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r', encoding='utf-8') as f:
                    state = json.load(f)
            except:
                pass
        
        # 更新研报列表 (保留最近 5 条)
        reports = state.get("reports", [])
        new_report = {
            "title": f"研报 {now.strftime('%Y-%m-%d %H:%M')}",
            "content": report,
            "date": now.strftime('%Y-%m-%d %H:%M:%S')
        }
        reports.insert(0, new_report)
        state["reports"] = reports[:5]
        state["quotes_data"] = quotes_data # 同步更新行情数据
        state["date_str"] = now.strftime('%m-%d')
        
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)

        # 4. 推送 (仅当需要时)
        if send_notify:
            title = f"【期货研报-每日智领】({now.strftime('%m-%d %H:%M')})"
            full_text = f"# {title}\n\n{report}"
            notifier.send_markdown(title, full_text)
            logger.info("钉钉推送已发送。")
        else:
            logger.info("已跳过钉钉推送。")
        
        current_task_status["last_result"] = "Success"
        logger.info("任务执行完毕。")
        return True
    except Exception as e:
        logger.exception("任务执行出错")
        current_task_status["last_result"] = f"Error: {str(e)}"
        return False
    finally:
        current_task_status["running"] = False
        task_lock.release()


@app.route('/api/state')
def get_state():
    """获取当前系统状态（从 workflow_state.json 读取）"""
    try:
        with open('workflow_state.json', 'r', encoding='utf-8') as f:
            state = json.load(f)
        return jsonify({
            "status": "Success",
            "data": state,
            "system": current_task_status
        })
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/trigger', methods=['POST'])
def trigger_task():
    """手动触发任务接口"""
    if current_task_status["running"]:
        return jsonify({"status": "Busy", "message": "任务正在执行中"}), 409
    
    # 异步执行
    thread = threading.Thread(target=daily_job, kwargs={"manual": True, "send_notify": False})

    thread.start()
    return jsonify({"status": "Started", "message": "任务已在后台启动"})

@app.route('/api/logs')
def get_logs():
    """获取最新的日志内容"""
    try:
        if os.path.exists("app.log"):
            with open("app.log", "r", encoding='utf-8') as f:
                # 只取最后 100 行
                lines = f.readlines()
                return jsonify({"status": "Success", "logs": lines[-100:]})
        return jsonify({"status": "Success", "logs": []})
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/health')
def health():
    return jsonify({"status": "OK", "time": datetime.now().isoformat()})

@app.route('/api/news')
def get_all_news():
    """获取综合财经新闻与国际局势"""
    try:
        # 定义核心板块关键词（涵盖所有 16 个品种及宏观词）
        commodity_keywords = [
            "豆粕", "玉米", "菜粕", "生猪", "白糖", "棉花", 
            "甲醇", "尿素", "PTA", "纯碱", "PVC", "淀粉", 
            "大豆", "豆油", "乙醇", "生物柴",
            "CBOT", "USDA", "美联储", "地缘", "冲突"
        ]
        news_list = fetcher.get_commodity_news(commodity_keywords)
        return jsonify({"status": "Success", "data": news_list})
    except Exception as e:
        logger.error(f"获取综合新闻失败: {e}")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/analyze_news', methods=['POST'])
def analyze_current_news():
    """使用 AI 分析当前新闻"""
    try:
        data = request.json
        news_items = data.get('news', [])
        if not news_items:
            return jsonify({"status": "Error", "message": "No news data provided"}), 400
        
        analysis = analyzer.analyze_news_impact(news_items)
        return jsonify({"status": "Success", "analysis": analysis})
    except Exception as e:
        logger.error(f"AI 新闻分析失败: {e}")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/history')
def get_history():
    """获取品种历史走势数据"""
    symbol = request.args.get('symbol', '豆粕')
    try:
        df = fetcher.get_futures_history(symbol, days=30)
        if df is not None:
            # 格式化为前端 Recharts 易读的 JSON
            history_data = []
            for _, row in df.iterrows():
                history_data.append({
                    "name": str(row['date']).split()[0][-5:], # 取月-日
                    "value": float(row['close'])
                })
            return jsonify({"status": "Success", "data": history_data})
        return jsonify({"status": "Error", "message": "未找到历史数据"}), 404
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/market_analysis')
def get_market_analysis():
    """获取综合行情分析数据"""
    try:
        # 获取核心品种
        target_symbols = ["豆粕", "玉米", "大豆", "白糖", "棉花", "甲醇", "PTA"]
        analysis_data = fetcher.get_market_analysis_data(target_symbols)
        if analysis_data:
            return jsonify({"status": "Success", "data": analysis_data})
        return jsonify({"status": "Error", "message": "计算分析数据失败"}), 500
    except Exception as e:
        logger.error(f"行情分析接口异常: {e}")
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/api/inventory')
def get_inventory():
    """获取品种库存及其季节性数据"""
    symbol = request.args.get('symbol', '豆粕')
    try:
        data = fetcher.get_inventory_seasonality(symbol)
        if data:
            return jsonify({"status": "Success", "data": data})
        
        # 降级：如果无季节性数据，尝试获取基础数据
        basic_data = fetcher.get_futures_inventory(symbol)
        if basic_data:
             return jsonify({
                 "status": "Success", 
                 "data": {
                     "current": basic_data, 
                     "history": [], 
                     "symbol": symbol,
                     "unit": "手"
                 }
             })
             
        return jsonify({"status": "Error", "message": "未找到库存数据"}), 404
    except Exception as e:
        return jsonify({"status": "Error", "message": str(e)}), 500

@app.route('/static/charts/<path:filename>')
def serve_charts(filename):
    return send_from_directory('static/charts', filename)

if __name__ == "__main__":
    # 添加定时计划：周一至周五 16:00
    try:
        scheduler.add_job(id='daily_push', func=daily_job, trigger='cron', 
                          day_of_week='mon-fri', hour=16, minute=0,
                          kwargs={"send_notify": False})

    except Exception as e:
        logger.error(f"添加定时任务失败: {e}")
    
    logger.info("Flask 服务启动...")
    app.run(host='0.0.0.0', port=5000, debug=True)

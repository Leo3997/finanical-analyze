import os
import requests
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DingTalkNotifier:
    """钉钉推送类，负责将研报推送到群聊"""
    
    def __init__(self):
        self.webhook_url = os.getenv("DINGTALK_WEBHOOK")

    def send_markdown(self, title, text):
        """发送 Markdown 类型消息"""
        if not self.webhook_url:
            logger.error("未配置 DINGTALK_WEBHOOK，无法发送推送。")
            return False

        headers = {"Content-Type": "application/json"}
        data = {
            "msgtype": "markdown",
            "markdown": {
                "title": title,
                "text": text
            }
        }

        try:
            logger.info(f"正在推送消息到钉钉: {title}")
            response = requests.post(self.webhook_url, headers=headers, data=json.dumps(data))
            result = response.json()
            if result.get("errcode") == 0:
                logger.info("钉钉推送成功")
                return True
            else:
                logger.error(f"钉钉推送失败: {result.get('errmsg')}")
                return False
        except Exception as e:
            logger.error(f"钉钉推送请求异常: {e}")
            return False

if __name__ == "__main__":
    # 测试推送
    notifier = DingTalkNotifier()
    test_title = "【测试】每日期货智能研报"
    test_text = """### 【测试】每日期货智能研报
- **时间**：2026-03-09
- **状态**：系统调试中
- **内容**：这是一条来自 AI 自动生成的测试消息。
"""
    notifier.send_markdown(test_title, test_text)

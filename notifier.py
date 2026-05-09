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
        self.app_key = os.getenv("DINGTALK_APP_KEY")
        self.app_secret = os.getenv("DINGTALK_APP_SECRET")
        self.base_url = os.getenv("BASE_URL", "")
        self.access_token = None

    def _has_enterprise_api(self):
        return bool(self.app_key and self.app_secret)

    def _get_access_token(self):
        """获取企业应用access_token"""
        if not self.app_key or not self.app_secret:
            logger.warning("未配置DINGTALK_APP_KEY或DINGTALK_APP_SECRET，无法使用企业API")
            return None
        
        if self.access_token:
            return self.access_token
        
        try:
            url = "https://oapi.dingtalk.com/gettoken"
            params = {
                "appkey": self.app_key,
                "appsecret": self.app_secret
            }
            response = requests.get(url, params=params)
            result = response.json()
            
            if result.get("errcode") == 0:
                self.access_token = result.get("access_token")
                logger.info("获取access_token成功")
                return self.access_token
            else:
                logger.error(f"获取access_token失败: {result.get('errmsg')}")
                return None
        except Exception as e:
            logger.error(f"获取access_token异常: {e}")
            return None

    def _upload_media(self, file_path, media_type="file"):
        """上传媒体文件到钉钉"""
        access_token = self._get_access_token()
        if not access_token:
            return None
        
        try:
            url = f"https://oapi.dingtalk.com/media/upload"
            params = {
                "access_token": access_token,
                "type": media_type
            }
            
            with open(file_path, 'rb') as f:
                files = {'media': f}
                response = requests.post(url, params=params, files=files)
            
            result = response.json()
            if result.get("errcode") == 0:
                media_id = result.get("media_id")
                logger.info(f"媒体文件上传成功, media_id: {media_id}")
                return media_id
            else:
                logger.error(f"媒体文件上传失败: {result.get('errmsg')}")
                return None
        except Exception as e:
            logger.error(f"媒体文件上传异常: {e}")
            return None

    def send_file(self, file_path, title=None):
        """发送文件消息到钉钉（优先企业API，降级为webhook link）"""
        if not os.path.exists(file_path):
            logger.error(f"文件不存在: {file_path}")
            return False
        
        if self._has_enterprise_api():
            return self._send_file_via_api(file_path)
        else:
            return self._send_file_via_webhook_link(file_path, title)

    def _send_file_via_api(self, file_path):
        media_id = self._upload_media(file_path)
        if not media_id:
            logger.error("文件上传失败，无法发送文件消息")
            return False
        
        access_token = self._get_access_token()
        if not access_token:
            return False
        
        try:
            url = f"https://oapi.dingtalk.com/message/send_to_conversation"
            params = {"access_token": access_token}
            
            data = {
                "chatid": os.getenv("DINGTALK_CHAT_ID", ""),
                "msg": {
                    "msgtype": "file",
                    "file": {
                        "media_id": media_id
                    }
                }
            }
            
            response = requests.post(url, params=params, json=data)
            result = response.json()
            
            if result.get("errcode") == 0:
                logger.info("钉钉文件消息发送成功")
                return True
            else:
                logger.error(f"钉钉文件消息发送失败: {result.get('errmsg')}")
                return False
        except Exception as e:
            logger.error(f"钉钉文件消息发送异常: {e}")
            return False

    def _send_file_via_webhook_link(self, file_path, title=None):
        file_name = os.path.basename(file_path)
        
        if self.base_url:
            pdf_url = f"{self.base_url.rstrip('/')}/pdf_reports/{file_name}"
        else:
            pdf_url = f"file://{os.path.abspath(file_path)}"
            logger.warning("未配置BASE_URL，无法生成可用的PDF下载链接，使用本地路径")
        
        if not self.webhook_url:
            logger.error("未配置 DINGTALK_WEBHOOK，无法发送推送。")
            return False
        
        link_title = title or file_name
        link_text = f"📄 期货市场日报 PDF 已生成\n点击查看或下载报告"
        
        return self.send_link(link_title, link_text, pdf_url)

    def send_markdown_with_file(self, title, text, file_path=None):
        """发送Markdown消息，可选附带文件下载链接"""
        if file_path and os.path.exists(file_path):
            file_name = os.path.basename(file_path)
            text += f"\n\n---\n📎 **附件**: [{file_name}](file://{os.path.abspath(file_path)})"
        
        return self.send_markdown(title, text)

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

    def send_link(self, title, text, message_url, pic_url=""):
        """发送 Link 类型消息（带图片预览）"""
        if not self.webhook_url:
            logger.error("未配置 DINGTALK_WEBHOOK，无法发送推送。")
            return False

        headers = {"Content-Type": "application/json"}
        data = {
            "msgtype": "link",
            "link": {
                "title": title,
                "text": text,
                "messageUrl": message_url,
                "picUrl": pic_url
            }
        }

        try:
            logger.info(f"正在推送 Link 消息到钉钉: {title}")
            response = requests.post(self.webhook_url, headers=headers, data=json.dumps(data))
            result = response.json()
            if result.get("errcode") == 0:
                logger.info("钉钉 Link 消息推送成功")
                return True
            else:
                logger.error(f"钉钉 Link 推送失败: {result.get('errmsg')}")
                return False
        except Exception as e:
            logger.error(f"钉钉 Link 推送请求异常: {e}")
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

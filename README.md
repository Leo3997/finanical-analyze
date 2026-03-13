# 大宗商品期货每日智能推送系统 (Finanical-Analyze)

![Futures Analysis](https://img.shields.io/badge/Focus-Commodities%20%26%20Futures-blue)
![AI Powered](https://img.shields.io/badge/AI-DeepSeek-green)
![Data Source](https://img.shields.io/badge/Data-AkShare-orange)

这是一个基于 Python 的自动化大宗商品投研系统，旨在通过 AI (DeepSeek) 深度分析国内外市场动态，并实时推送专业研报至钉钉群聊。

---

## 🚀 核心功能

- **自动化数据采集**：集成 AkShare 与新浪财经 HQ，实时获取国内期货主流合约行情及 10 日历史日线。
- **双模 AI 研报**：
    - **【期货智研-情绪增强版】**：针对全市场情绪及主力品种异动进行复盘分析。
    - **【大宗商品市场日报】**：专项覆盖玉米、大豆、淀粉、豆粕、豆油、乙醇、生物柴油等品种，深度挖掘国内外产区消息及 CBOT 联动逻辑。
- **全品种趋势可视化**：自动生成目标品种的 10 日价格趋势图，通过独立消息卡片推送，支持图片预览。
- **国内外信息过滤**：智能匹配 USDA 报告、巴西/阿根廷产量动态、CBOT 报价等国际核心因子。
- **全自动化工作流**：支持 GitHub Actions 定时触发，实现工作日早盘前/收盘后的定点推送，内置中国法定节假日自动跳过功能。

---

## 🛠️ 技术架构

- **语言**：Python 3.9+
- **核心库**：
    - `AkShare`: 财经数据接口
    - `Matplotlib`: 趋势图表绘制
    - `OpenAI SDK`: 连接 DeepSeek 模型
    - `Chinese-Calendar`: 节假日识别
- **推送渠道**：钉钉自定义机器人 (Webhook)
- **部署环境**：GitHub Actions / 本地 Server

---

## 📦 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/Leo3997/finanical-analyze.git
cd finanical-analyze
```

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 配置环境变量
在根目录创建 `.env` 文件：
```env
DEEPSEEK_API_KEY=你的DeepSeek_API密钥
DINGTALK_WEBHOOK=你的钉钉机器人地址
TARGET_SYMBOLS=豆粕,玉米,大豆,乙醇,生物柴
# GitHub 仓库名 (用于 Actions 环境图片访问)
GITHUB_REPOSITORY=Leo3997/finanical-analyze
```

### 4. 运行
```bash
# 执行完整准备与推送流程
python main.py --step all

# 仅准备数据（生成图表和中间状态）
python main.py --step prepare

# 仅执行推送（读取已有状态进行推送）
python main.py --step notify
```

---

## 📈 功能预览

系统推送包含以下模块：
1. **行情综述**：各品种涨跌幅、持仓变化一览。
2. **AI 深度研报**：基于最新消息的专业市场解读。
3. **趋势图卡片**：10 日价格走势的可视化呈现。

---

## 🤝 贡献与反馈

如果您有任何建议、新的品种映射需求或发现 Bug，欢迎通过 Issue 提交。

---
*声明：本系统生成的研报仅供参考，不构成任何投资建议。*
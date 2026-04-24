# GitHub Actions 工作流配置指南

## 📋 配置概览

本项目已配置 GitHub Actions 工作流，用于**每个工作日早晨 8:00（北京时间）自动执行期货日报生成任务**。

## ⏰ 定时任务说明

### 执行时间
- **频率**：每周一至周五
- **时间**：北京时间 08:00（UTC 00:00）
- **节假日**：自动跳过中国法定节假日

### Cron 表达式解析
```yaml
cron: '0 0 * * 1-5'
# ─┬─ ─┬─ ─┬─ ─┬─ ─┬─
#  │   │   │   │   └──── 星期几 (1-5 = 周一至周五)
#  │   │   │   └──────── 月份 (每月)
#  │   │   └──────────── 日期 (每日)
#  │   └──────────────── 小时 (UTC 0 点 = 北京 8 点)
#  └──────────────────── 分钟 (0 分)
```

## 🚀 同步到 GitHub 的步骤

### 1. 提交工作流文件到 GitHub

```bash
# 进入项目目录
cd /home/greatwall/桌面/期货看板 new

# 添加所有更改的文件
git add .

# 提交更改
git commit -m "Update: 调整每日研报推送时间为工作日早晨 8 点"

# 推送到 GitHub
git push origin main
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库中配置以下环境变量：

1. 进入仓库页面 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加以下密钥：

#### 必需的 Secrets：

| 名称 | 说明 | 示例值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek AI API 密钥 | `sk-xxxxxxxxxxxxxxxx` |
| `DINGTALK_WEBHOOK` | 钉钉机器人 Webhook 地址 | `https://oapi.dingtalk.com/robot/send?access_token=xxx` |
| `TARGET_SYMBOLS` | 目标期货品种（逗号分隔） | `豆粕，玉米，大豆，乙醇，生物柴` |

#### 添加 Secret 的示例命令（使用 GitHub CLI）：

```bash
# 安装 GitHub CLI (如果未安装)
# sudo apt install gh

# 登录 GitHub
gh auth login

# 设置 Secrets
gh secret set DEEPSEEK_API_KEY --body="sk-your-api-key"
gh secret set DINGTALK_WEBHOOK --body="https://oapi.dingtalk.com/robot/send?access_token=xxx"
gh secret set TARGET_SYMBOLS --body="豆粕，玉米，大豆，乙醇，生物柴"
```

### 3. 验证工作流

#### 方法一：手动触发工作流

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **Futures Daily Report** 工作流
4. 点击 **Run workflow** 按钮
5. 选择分支（通常是 `main`）
6. 点击 **Run workflow**

#### 方法二：查看自动执行

- 工作流会在下一个工作日北京时间 8:00 自动执行
- 可以在 **Actions** 标签中查看执行历史

## 📊 工作流执行内容

### 执行步骤：

1. **代码检出** - 拉取最新代码
2. **Python 环境设置** - 安装 Python 3.10
3. **安装依赖** - 安装 requirements.txt 中的包
4. **节假日检查** - 判断是否为中国的节假日
5. **执行日报生成** - 运行 `main.py --step all`
   - 采集期货行情数据
   - 获取相关新闻
   - AI 分析生成研报
   - 推送到钉钉（如果配置了 webhook）
6. **上传状态文件** - 保存执行结果（可选）

### 输出产物：

- `workflow_state.json` - 包含生成的研报和行情数据
- 保留期限：7 天

## 🔧 自定义配置

### 修改执行时间

编辑 `.github/workflows/daily_report.yml`：

```yaml
on:
  schedule:
    # 修改 cron 表达式
    - cron: '0 0 * * 1-5'  # 改为其他时间
```

### 修改目标品种

在 GitHub Secrets 中修改 `TARGET_SYMBOLS`：

```
TARGET_SYMBOLS=豆粕，玉米，淀粉，乙醇，大豆，豆油，棕榈油
```

### 禁用节假日检查

如果需要每天都执行（包括节假日），删除或注释掉节假日检查步骤：

```yaml
# - name: Check if holiday (China)
#   id: holiday_check
#   run: |
#     ...
```

### 修改 Python 版本

```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'  # 改为其他版本
```

## ⚠️ 注意事项

1. **GitHub Actions 限制**：
   - 免费账户每月有 2000 分钟的免费额度
   - 每次运行时间不能超过 6 小时
   - 工作流并发数有限制

2. **Secrets 安全**：
   - 不要在代码中硬编码 API 密钥
   - 定期更新密钥
   - 限制 Secrets 的访问权限

3. **节假日判断**：
   - 使用 `chinese_calendar` 库判断中国节假日
   - 会自动跳过周末和法定节假日
   - 调休工作日会正常执行

4. **失败处理**：
   - 查看 **Actions** 中的日志了解失败原因
   - 检查 API 密钥是否有效
   - 确认网络连接正常

## 📝 常见问题

### Q: 如何查看执行日志？
A: 进入 **Actions** → 选择具体的运行记录 → 查看每个步骤的输出

### Q: 为什么没有收到钉钉推送？
A: 检查以下配置：
   - `DINGTALK_WEBHOOK` 是否正确
   - 钉钉机器人是否启用了自定义关键词
   - 研报标题是否包含关键词

### Q: 如何手动测试工作流？
A: 使用 `workflow_dispatch` 触发器手动运行，无需等待定时时间

### Q: 工作流执行失败怎么办？
A: 
   1. 查看错误日志
   2. 检查依赖是否完整
   3. 确认 API 密钥有效
   4. 重新运行工作流

## 🔗 相关资源

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Cron 表达式语法](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#onschedule)
- [chinese_calendar 库](https://github.com/LKI/chinese-calendar)
- [钉钉机器人配置](https://open.dingtalk.com/document/robots/custom-robot-access)

---

**最后更新**: 2026-04-24  
**推送时间**: 工作日 08:00（北京时间）

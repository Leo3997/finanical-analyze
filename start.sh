#!/bin/bash

echo "========================================"
echo "  期货看板 - 启动脚本"
echo "========================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "📁 项目目录：$SCRIPT_DIR"
echo "📁 前端目录：$FRONTEND_DIR"
echo ""

# 检查 Python 依赖
echo "🔍 检查 Python 依赖..."
if ! python -c "import flask" 2>/dev/null; then
    echo "⚠️  正在安装 Python 依赖..."
    pip install -r "$SCRIPT_DIR/requirements.txt"
fi

# 检查 Node.js 依赖
echo "🔍 检查 Node.js 依赖..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "⚠️  正在安装前端依赖..."
    cd "$FRONTEND_DIR" && npm install
    cd "$SCRIPT_DIR"
fi

echo ""
echo "========================================"
echo "  启动服务..."
echo "========================================"
echo ""

# 启动后端服务（后台运行）
echo "🚀 启动后端服务 (Flask - 端口 5000)..."
python "$SCRIPT_DIR/app.py" > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
echo "📝 后端日志：$SCRIPT_DIR/backend.log"
echo ""

# 等待后端服务启动
sleep 3

# 启动前端服务（后台运行）
echo "🚀 启动前端服务 (Vite - 端口 5173)..."
cd "$FRONTEND_DIR" && npm run dev > "$SCRIPT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"
echo "📝 前端日志：$SCRIPT_DIR/frontend.log"
echo ""

# 等待前端服务启动
sleep 5

echo "========================================"
echo "  所有服务已启动!"
echo "========================================"
echo ""
echo "📊 后端地址：http://localhost:5000"
echo "🎨 前端地址：http://localhost:5173"
echo ""
echo "📝 查看日志:"
echo "   后端：tail -f $SCRIPT_DIR/backend.log"
echo "   前端：tail -f $SCRIPT_DIR/frontend.log"
echo ""
echo "🛑 停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   或者：pkill -f 'python app.py' && pkill -f 'npm run dev'"
echo ""
echo "========================================"

# 等待进程
wait


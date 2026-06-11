#!/bin/bash
# 教我如何不想她 — 刘半农生平地理叙事 · 数字伴生作品
# Mac / Linux 启动脚本

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║  教我如何不想她                  ║"
echo "  ║  刘半农生平地理叙事 · 数字伴生   ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# 检查 Python
PYTHON=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON="$cmd"
        break
    fi
done

if [ -z "$PYTHON" ]; then
    echo "[错误] 未检测到 Python 3"
    echo "请先安装: https://www.python.org/downloads/"
    echo "Mac: brew install python3"
    echo "Ubuntu/Debian: sudo apt install python3"
    exit 1
fi

echo "Python 已就绪 ($PYTHON)"
echo ""
echo "正在启动服务器..."

# 进入脚本所在目录
cd "$(dirname "$0")"

# 启动服务器
$PYTHON server_nocache.py &
SERVER_PID=$!

# 等待服务器就绪
for i in $(seq 1 10); do
    sleep 1
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo "服务器已就绪"
        # 打开浏览器
        if command -v open &>/dev/null; then
            open http://localhost:8000
        elif command -v xdg-open &>/dev/null; then
            xdg-open http://localhost:8000
        fi
        echo ""
        echo "  浏览器已打开 → http://localhost:8000"
        echo "  按 Ctrl+C 停止服务器"
        echo ""
        # 等待服务器进程
        wait $SERVER_PID
        exit 0
    fi
done

echo "[警告] 服务器启动较慢，正在打开浏览器..."
if command -v open &>/dev/null; then
    open http://localhost:8000
elif command -v xdg-open &>/dev/null; then
    xdg-open http://localhost:8000
fi
echo "如果页面无法加载，请稍等几秒后刷新"
wait $SERVER_PID

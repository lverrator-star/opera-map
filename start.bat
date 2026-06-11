@echo off
chcp 65001 >nul 2>&1
title 教我如何不想她 · 数字伴生作品

echo.
echo   ╔══════════════════════════════════╗
echo   ║  教我如何不想她                  ║
echo   ║  刘半农生平地理叙事 · 数字伴生   ║
echo   ╚══════════════════════════════════╝
echo.

:: 自带 Python 3.12（免安装，解压即用）
set "PYTHON=runtime\python\python.exe"
if exist "%PYTHON%" goto ok

:: 回退：尝试系统 Python
python --version >nul 2>&1
if "%errorlevel%"=="0" (
    echo 使用系统 Python
    set "PYTHON=python"
    goto start
)

echo.
echo  ═══════════════════════════════════════
echo  [错误] 未找到 Python
echo  请重新解压压缩包，确保 runtime\python 文件夹存在，
echo  或访问 https://www.python.org/downloads/ 安装 Python 3
echo  ═══════════════════════════════════════
pause
exit /b 1

:ok
echo 使用自带 Python 3.12 ^(免安装^)

:start
echo.
echo 服务器启动中...
start http://localhost:8000
echo 浏览器打开 → http://localhost:8000
echo 关闭此窗口停止服务器
echo.
"%PYTHON%" server_nocache.py
pause

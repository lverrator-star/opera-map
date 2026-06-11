#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
教我如何不想她 · 刘半农生平地理叙事
HTTP 服务器 — 禁止浏览器缓存，确保每次加载最新文件
"""

import http.server
import socketserver
import sys
import os

PORT = 8000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """为所有响应添加 no-cache 头，防止浏览器缓存过期文件"""
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # 精简日志输出
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # 允许多次快速重启
    socketserver.TCPServer.allow_reuse_address = True

    handler = NoCacheHandler

    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"\n  服务器已启动 → http://localhost:{PORT}")
            print(f"  按 Ctrl+C 停止\n")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 10048:  # Windows: port already in use
            print(f"\n  [错误] 端口 {PORT} 已被占用")
            print(f"  请先关闭其他程序，或运行: taskkill /F /IM python.exe\n")
        else:
            print(f"\n  [错误] {e}\n")
        input("按 Enter 退出...")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n  服务器已停止\n")

if __name__ == '__main__':
    main()

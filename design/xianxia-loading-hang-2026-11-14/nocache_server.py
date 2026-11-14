# 本地试玩用的静态服务器：禁止浏览器缓存，避免重新构建后旧 index.html 引用已删除的资源而卡在加载页。
import http.server, sys
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache'); self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 8741), H).serve_forever()

"""Local preview with cache disabled and automatic fallback when a port is occupied."""
import errno
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class PreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(Path(__file__).resolve().parent.parent)
    for port in range(8767, 8777):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), PreviewHandler)
            break
        except OSError as error:
            if error.errno != errno.EADDRINUSE:
                raise
    else:
        raise RuntimeError('本地预览端口 8767–8776 均被占用')
    print(f'游戏预览：http://127.0.0.1:{port}/scripts/cocos-preview.html', flush=True)
    server.serve_forever()

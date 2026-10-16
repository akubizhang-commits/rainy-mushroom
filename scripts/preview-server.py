"""Local preview with cache disabled and automatic fallback when a port is occupied."""
import errno
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Rebuilds can share timestamps; always serve the current local artifact.
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
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
    print(f'游戏预览：http://127.0.0.1:{port}/scripts/survivor-preview.html', flush=True)
    server.serve_forever()

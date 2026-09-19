"""Explicit local-only exporter for the game's own rendered scene thumbnails."""
import base64
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
ROOT = Path(__file__).resolve().parent.parent
SCENES = {'yn-pine', 'yn-alpine', 'hl-mixed', 'hl-meadow', 'jl-mixed', 'jl-river', 'ln-oak', 'ln-edge', 'yn-ridge', 'hl-deadwood', 'jl-backwater', 'ln-glade'}
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_POST(self):
        scene = self.path.removeprefix('/capture/')
        size = int(self.headers.get('Content-Length', 0))
        if self.path != '/capture/' + scene or scene not in SCENES or not 0 < size < 2000000:
            self.send_error(400)
            return
        raw = self.rfile.read(size).decode('ascii')
        if not raw.startswith('data:image/jpeg;base64,'):
            self.send_error(400)
            return
        data = base64.b64decode(raw.split(',', 1)[1], validate=True)
        path = ROOT / 'assets' / 'scene-previews' / (scene + '.jpg')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        self.send_response(200)
        self.end_headers()
os.chdir(ROOT)
ThreadingHTTPServer(('127.0.0.1', 8778), Handler).serve_forever()

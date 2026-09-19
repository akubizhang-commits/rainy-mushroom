"""One-shot loopback server to save exactly the 12 rendered habitat previews."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import os,json,threading
ROOT=Path(__file__).resolve().parents[2]
SCENES={'yn-pine','yn-alpine','yn-ridge','hl-mixed','hl-meadow','hl-deadwood','jl-mixed','jl-river','jl-backwater','ln-oak','ln-edge','ln-glade'}
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
 def do_POST(self):
  scene=self.path.removeprefix('/__preview/').removesuffix('.jpg')
  if self.path!='/__preview/'+scene+'.jpg' or scene not in SCENES or self.headers.get('Origin')!='http://127.0.0.1:'+str(self.server.server_port):self.send_error(403);return
  size=int(self.headers.get('Content-Length','0'))
  if not 100<size<500000:self.send_error(413);return
  data=self.rfile.read(size)
  if not data.startswith(b'\xff\xd8'):self.send_error(415);return
  for directory in ['assets/scene-previews','cocos-pilot/assets/resources/previews']:(ROOT/directory/(scene+'.jpg')).write_bytes(data)
  self.send_response(200);self.end_headers();self.wfile.write(b'OK');self.server.completed.add(scene)
  print('Saved',scene,len(data),flush=True)
  if self.server.completed==SCENES:threading.Thread(target=self.server.shutdown,daemon=True).start()
os.chdir(ROOT);server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.completed=set();Path('/tmp/rainy-capture-port').write_text(str(server.server_port));print('Capture port',server.server_port,flush=True);server.serve_forever();server.server_close()

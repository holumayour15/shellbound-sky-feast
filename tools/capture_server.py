# Receives trailer frames (POST /f/NNNN, JPEG) and audio (POST /audio, WebM) from the browser and saves them.
import http.server, os, re, sys
OUT = sys.argv[1]
os.makedirs(os.path.join(OUT, 'frames'), exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        m = re.fullmatch(r'/f/(\d{4})', self.path)
        if m: path = os.path.join(OUT, 'frames', f'f{m.group(1)}.jpg')
        elif self.path == '/audio': path = os.path.join(OUT, 'audio.webm')
        else: self.send_response(404); self.cors(); self.end_headers(); return
        with open(path, 'wb') as f: f.write(body)
        self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('127.0.0.1', 8790), H).serve_forever()

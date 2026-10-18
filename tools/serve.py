"""Local static server for the game with caching disabled (handy while editing).
Usage: python tools/serve.py [port]   (serves the dist folder at http://127.0.0.1:8000)"""
import functools, http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.js': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(NoCache, directory=root)).serve_forever()

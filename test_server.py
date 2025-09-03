#!/usr/bin/env python3
"""
Simple HTTP server for testing Star Charts system
Serves files with proper CORS headers to avoid module loading issues
"""

import http.server
import socketserver
import os
from pathlib import Path

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def main():
    PORT = 8080
    
    # Change to project root directory
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    print(f"🚀 Starting Star Charts test server...")
    print(f"📂 Serving from: {project_root}")
    print(f"🌐 Open: http://localhost:{PORT}/test_star_charts.html")
    print(f"🎮 Game: http://localhost:{PORT}/frontend/static/index.html")
    print(f"⏹️  Press Ctrl+C to stop")
    
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    main()

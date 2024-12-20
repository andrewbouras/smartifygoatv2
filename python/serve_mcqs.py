import http.server
import socketserver
import json
import os
import sys
from urllib.parse import parse_qs
import webbrowser

# Add the python directory to the path if needed
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from db_utils import log_incorrect_answer

class MCQHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/log_incorrect':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Log the incorrect answer
            log_incorrect_answer(data['mcq_id'], data['factoid'])
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode())
        else:
            super().do_POST()

def start_server():
    PORT = 8000
    Handler = MCQHandler
    httpd = socketserver.TCPServer(("", PORT), Handler)
    
    print(f"\nStarting server at http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server")
    
    webbrowser.open(f'http://localhost:{PORT}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    start_server()
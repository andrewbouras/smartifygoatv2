import http.server
import socketserver
import webbrowser

def start_server():
    """Start a simple HTTP server and open the browser."""
    PORT = 8000
    
    Handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", PORT), Handler)
    
    print(f"\nStarting server at http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server")
    
    # Open browser
    webbrowser.open(f'http://localhost:{PORT}')
    
    # Start server
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    start_server()
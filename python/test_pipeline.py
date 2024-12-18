import os
import time
from transcribe_pdf import transcribe_pdf
from process_large_text import process_large_file
from generate_mcqs import main as generate_mcqs
import http.server
import socketserver
import webbrowser

def ensure_directories():
    """Create necessary directories if they don't exist."""
    dirs = ['python/pdfs', 'python/transcribed', 'python/factoids', 'python/mcqs']
    for dir in dirs:
        os.makedirs(dir, exist_ok=True)

def process_pdf(pdf_name):
    """Process a single PDF through the entire pipeline."""
    print(f"\n1. Processing PDF: {pdf_name}")
    
    # Transcribe PDF to text
    transcribe_pdf(
        pdf_path=os.path.join('python/pdfs', pdf_name),
        output_folder='python/transcribed'
    )
    
    # Get the transcribed text file name
    txt_name = os.path.splitext(pdf_name)[0] + '.txt'
    txt_path = os.path.join('python/transcribed', txt_name)
    
    print("\n2. Generating factoids...")
    # Process the text file to generate factoids
    process_large_file(
        input_file=txt_path,
        output_dir='python/factoids'
    )
    
    print("\n3. Generating MCQs...")
    # Generate MCQs
    generate_mcqs()
    
    return True

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
    httpd.serve_forever()

def main():
    # Ensure all directories exist
    ensure_directories()
    
    # Check for PDFs
    pdfs = [f for f in os.listdir('python/pdfs') if f.lower().endswith('.pdf')]
    
    if not pdfs:
        print("No PDFs found in the 'python/pdfs' directory!")
        return
    
    # Process each PDF
    for pdf in pdfs:
        success = process_pdf(pdf)
        if success:
            print(f"\nSuccessfully processed {pdf}")
            print("Starting local server to view MCQs...")
            start_server()
        else:
            print(f"\nFailed to process {pdf}")

if __name__ == "__main__":
    main() 
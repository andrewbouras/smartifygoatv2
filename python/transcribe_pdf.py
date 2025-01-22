import os
from PyPDF2 import PdfReader

def clean_text(text):
    """Clean the extracted text by removing unwanted patterns."""
    # Remove "MEHLMANMEDICAL.COM" (case insensitive)
    cleaned = text.replace("MEHLMANMEDICAL.COM", "").replace("mehlmanmedical.com", "")
    # Remove multiple consecutive newlines and spaces
    while "\n\n\n" in cleaned:
        cleaned = cleaned.replace("\n\n\n", "\n\n")
    return cleaned.strip()

def main(pdf_dir="python/pdfs", output_dir="python/transcribed"):
    # Ensure directories exist
    os.makedirs(pdf_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    
    # Get list of PDF files
    pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("\n❌ No PDF files found in python/pdfs directory!")
        return
    
    # If multiple files exist, let user choose
    if len(pdf_files) > 1:
        print("\n📚 Available PDF files:")
        for i, file in enumerate(pdf_files, 1):
            print(f"{i}. {file}")
        
        while True:
            try:
                choice = int(input("\nChoose a file number to process (or 0 to exit): "))
                if choice == 0:
                    return
                if 1 <= choice <= len(pdf_files):
                    pdf_file = pdf_files[choice - 1]
                    break
                print("Invalid choice. Please try again.")
            except ValueError:
                print("Please enter a valid number.")
    else:
        pdf_file = pdf_files[0]
    
    pdf_path = os.path.join(pdf_dir, pdf_file)
    print(f"\n📄 Processing: {pdf_file}")
    
    try:
        # Create PDF reader object
        reader = PdfReader(pdf_path)
        
        # Create output file path
        txt_filename = os.path.splitext(pdf_file)[0] + '.txt'
        output_path = os.path.join(output_dir, txt_filename)
        
        # Extract text from all pages
        with open(output_path, 'w', encoding='utf-8') as txt_file:
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                # Clean the extracted text before writing
                page_text = clean_text(page.extract_text())
                if page_text.strip():  # Only write if there's content after cleaning
                    txt_file.write(f"\n--- Page {page_num + 1} ---\n\n")
                    txt_file.write(page_text)
                    txt_file.write("\n")
        
        print(f"✅ Transcription complete. Text saved to: {output_path}")
        
    except Exception as e:
        print(f"❌ Error processing {pdf_file}: {str(e)}")

if __name__ == "__main__":
    main() 
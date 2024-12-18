import os
from PyPDF2 import PdfReader

def transcribe_pdf(pdf_path, output_folder):
    # Get the PDF filename without extension
    pdf_filename = os.path.basename(pdf_path)
    txt_filename = os.path.splitext(pdf_filename)[0] + '.txt'
    output_path = os.path.join(output_folder, txt_filename)
    
    # Create PDF reader object
    reader = PdfReader(pdf_path)
    
    # Extract text from all pages
    with open(output_path, 'w', encoding='utf-8') as txt_file:
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            txt_file.write(f"\n--- Page {page_num + 1} ---\n\n")
            txt_file.write(page.extract_text())
            txt_file.write("\n")
    
    print(f"Transcription complete. Text saved to: {output_path}")

if __name__ == "__main__":
    # Define paths
    pdf_folder = "0_PDFs"
    output_folder = "1_TranscribedPDFs"
    
    # Process all PDFs in the folder
    for pdf_file in os.listdir(pdf_folder):
        if pdf_file.lower().endswith('.pdf'):
            pdf_path = os.path.join(pdf_folder, pdf_file)
            transcribe_pdf(pdf_path, output_folder) 
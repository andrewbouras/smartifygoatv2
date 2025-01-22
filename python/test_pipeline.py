import os
import time
from transcribe_pdf import main as transcribe_pdf_main
from generate_factoids import main as generate_factoids_main
from generate_mcqs import main as generate_mcqs_main
from serve_mcqs import start_server
from pymongo import MongoClient
from dotenv import load_dotenv
import json

def get_project_root():
    """Get the project root directory."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # If we're in the python directory, go up one level
    if os.path.basename(current_dir) == 'python':
        return os.path.dirname(current_dir)
    return current_dir

def ensure_directories():
    """Create necessary directories if they don't exist."""
    root_dir = get_project_root()
    dirs = [
        os.path.join(root_dir, 'python', 'pdfs'),
        os.path.join(root_dir, 'python', 'transcribed'),
        os.path.join(root_dir, 'python', 'factoids'),
        os.path.join(root_dir, 'python', 'mcqs')
    ]
    for dir in dirs:
        os.makedirs(dir, exist_ok=True)
        print(f"Directory ensured: {dir}")
    return dirs

def import_to_mongodb(mcqs_file, source_name):
    """Import MCQs to MongoDB."""
    try:
        load_dotenv()
        MONGODB_URI = os.getenv("MONGODB_URI")
        MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")
        
        print(f"\nConnecting to MongoDB...")
        client = MongoClient(MONGODB_URI)
        db = client[MONGO_DB_NAME]
        mcqs_collection = db['mcqs']
        
        print(f"Reading MCQs from {mcqs_file}")
        with open(mcqs_file, 'r') as f:
            data = json.load(f)
        
        # Add source_file to each MCQ based on the bank ID
        mcqs = data.get('mcqs', [])
        source_file = f"{source_name}_factoids.json"
        print(f"Using source file: {source_file}")
        
        # Add metadata to each MCQ
        for mcq in mcqs:
            mcq['source_file'] = source_file
            mcq['bank_id'] = 'mehlman-microbiology'  # Add bank_id for frontend
        
        if mcqs:
            # Remove any existing MCQs for this source
            print(f"Removing existing MCQs for {source_file}")
            mcqs_collection.delete_many({
                '$or': [
                    {'source_file': source_file},
                    {'bank_id': 'mehlman-microbiology'}
                ]
            })
            
            # Insert new MCQs
            print(f"Inserting {len(mcqs)} new MCQs")
            result = mcqs_collection.insert_many(mcqs)
            print(f"✅ Successfully imported {len(result.inserted_ids)} MCQs to MongoDB")
            return True
        else:
            print("❌ No MCQs found in the data")
            return False
            
    except Exception as e:
        print(f"❌ Error importing to MongoDB: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return False

def process_pdf(pdf_dir, transcribed_dir, factoids_dir, mcqs_dir):
    """Process PDFs through the entire pipeline."""
    print("\n=== Starting PDF Processing Pipeline ===")
    
    # Get list of PDFs
    pdfs = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
    
    # Get the project root directory
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    for pdf in pdfs:
        print(f"\nProcessing: {pdf}")
        source_name = os.path.splitext(pdf)[0]
        
        # Step 1: Transcribe PDF
        print("\n1. 📝 Transcribing PDF to text...")
        transcribe_pdf_main(pdf_dir=pdf_dir, output_dir=transcribed_dir)
        
        # Step 2: Generate Factoids
        print("\n2. 🎯 Generating factoids from text...")
        generate_factoids_main(input_dir=transcribed_dir, output_dir=factoids_dir)
        
        # Step 3: Generate MCQs
        print("\n3. ❓ Creating MCQs from factoids...")
        generate_mcqs_main(
            input_dir=os.path.join(factoids_dir),
            output_dir=os.path.join(mcqs_dir)
        )
        
        # Step 4: Import to MongoDB
        mcqs_file = os.path.join(mcqs_dir, f"{source_name}_mcqs.json")
        print("\n4. 📦 Importing MCQs to MongoDB...")
        if import_to_mongodb(mcqs_file, source_name):
            print(f"✅ Successfully processed {pdf}")
        else:
            print(f"❌ Failed to process {pdf}")
    
    return True

def main():
    # Ensure all directories exist
    pdf_dir, transcribed_dir, factoids_dir, mcqs_dir = ensure_directories()
    
    # Check for PDFs
    pdfs = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
    
    if not pdfs:
        print("\n❌ No PDFs found in the 'python/pdfs' directory!")
        return
    
    print(f"\nFound PDFs: {pdfs}")
    
    # Process the PDFs
    success = process_pdf(pdf_dir, transcribed_dir, factoids_dir, mcqs_dir)
    if success:
        print("\n✨ Pipeline completed successfully!")
        print("\n🌐 Starting local server to view MCQs...")
        start_server()
    else:
        print("\n❌ Pipeline failed to complete")

if __name__ == "__main__":
    main() 
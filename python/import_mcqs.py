from pymongo import MongoClient
from dotenv import load_dotenv
import os
import json

def import_mcqs_to_mongodb():
    """Import existing MCQs to MongoDB."""
    try:
        # Load environment variables
        load_dotenv()
        MONGODB_URI = os.getenv("MONGODB_URI")
        MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")
        
        print(f"\nConnecting to MongoDB...")
        client = MongoClient(MONGODB_URI)
        db = client[MONGO_DB_NAME]
        mcqs_collection = db['mcqs']
        
        # Get the correct path relative to the script location
        current_dir = os.path.dirname(os.path.abspath(__file__))
        mcqs_file = os.path.join(current_dir, 'mcqs', 'Microbiology_mcqs.json')
        print(f"Reading MCQs from {mcqs_file}")
        
        if not os.path.exists(mcqs_file):
            print(f"❌ File not found at {mcqs_file}")
            print(f"Current directory contents: {os.listdir(current_dir)}")
            return False
        
        with open(mcqs_file, 'r') as f:
            data = json.load(f)
        
        mcqs = data.get('mcqs', [])
        source_file = "Microbiology_factoids.json"
        
        # Add metadata to each MCQ
        for mcq in mcqs:
            mcq['source_file'] = source_file
            mcq['bank_id'] = 'mehlman-microbiology'
        
        if mcqs:
            # Remove any existing MCQs for this source
            print(f"Removing existing MCQs for {source_file}")
            mcqs_collection.delete_many({
                '$or': [
                    {'source_file': source_file},
                    {'bank_id': 'mehlman-microbiology]'}
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

if __name__ == "__main__":
    import_mcqs_to_mongodb() 
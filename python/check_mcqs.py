from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pprint import pprint

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

def check_mcqs():
    # Initialize MongoDB client
    client = MongoClient(MONGODB_URI)
    db = client[MONGO_DB_NAME]
    mcqs_collection = db['mcqs']
    
    print("\n📊 MCQ Database Summary:")
    print("------------------------")
    
    # Show all collections first
    print("\n📁 Collections in Database:")
    collections = db.list_collection_names()
    for collection in collections:
        count = db[collection].count_documents({})
        print(f"- {collection}: {count} documents")
    
    # Show all unique source files and their counts
    print("\n🔍 All MCQ Source Files:")
    print("------------------------")
    all_sources = mcqs_collection.distinct('source_file')
    
    if not all_sources:
        print("No MCQs found in database!")
    else:
        for source in all_sources:
            count = mcqs_collection.count_documents({'source_file': source})
            print(f"\n📚 Source: {source}")
            print(f"   Questions: {count}")
            
            # Show a sample question from each source
            if count > 0:
                sample = mcqs_collection.find_one({'source_file': source})
                print(f"   Sample Question: {sample['question'][:100]}...")
                print(f"   Source File Pattern: {source.replace(':', '\\:')}") # Show exact pattern to match

if __name__ == "__main__":
    check_mcqs() 
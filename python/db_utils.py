from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def get_db():
    client = MongoClient(os.getenv('MONGODB_URI'))
    return client[os.getenv('MONGO_DB_NAME')]

def log_incorrect_answer(mcq_id, factoid):
    db = get_db()
    collection = db['incorrect_answers']
    
    # Simply insert the incorrect answer with timestamp
    collection.insert_one({
        'mcq_id': mcq_id,
        'factoid': factoid,
        'timestamp': datetime.utcnow()
    })
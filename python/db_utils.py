from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def get_db():
    client = MongoClient(os.getenv('MONGODB_URI'))
    return client[os.getenv('MONGO_DB_NAME')]

def log_incorrect_answer(mcq_id, factoid, user_id):
    db = get_db()
    collection = db['incorrect_answers']
    
    collection.insert_one({
        'mcq_id': mcq_id,
        'factoid': factoid,
        'userId': user_id,
        'timestamp': datetime.utcnow()
    })
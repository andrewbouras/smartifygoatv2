import os
import json
import uuid
from openai import AzureOpenAI
from dotenv import load_dotenv
from datetime import datetime
import time
import requests
from pymongo import MongoClient

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")

# Initialize MongoDB client
client = MongoClient(MONGODB_URI)
db = client[MONGO_DB_NAME]
mcqs_collection = db['mcqs']

# Azure OpenAI Configuration
azure_client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "Notes_Test_1")

# System message (instructions)
SYSTEM_MESSAGE = {
    "role": "system",
    "content": (
        "You are a helpful assistant that creates multiple choice questions (MCQs) from given medical factoids. "
        "Each MCQ:\n"
        "- Should be a single-best-answer question testing the factoid.\n"
        "- Should have one correct answer choice and four realistic distractors.\n"
        "- The question should be directly related to the factoid, testing knowledge of it.\n"
        "- The answer choices should be medically plausible and relevant, but only one should be correct.\n"
        "- Include an 'explanation' field that explains why the correct choice is correct.\n"
        "- Include the original 'factoid' field as metadata.\n"
        "- The JSON format should look like this:\n\n"
        "{\n"
        '  "question": "Question text?",\n'
        '  "answerChoices": [\n'
        '    {\n'
        '      "value": "Choice A",\n'
        '      "correct": false\n'
        '    },\n'
        '    {\n'
        '      "value": "Choice B",\n'
        '      "correct": true\n'
        '    }\n'
        '  ],\n'
        '  "explanation": "Explanation of the correct answer",\n'
        '  "factoid": "The original factoid here"\n'
        '}'
    )
}

def process_factoid(factoid):
    """Process a single factoid and generate an MCQ."""
    try:
        print(f"  🔄 Processing factoid: {factoid[:100]}...")  # Show first 100 chars
        
        user_message = {
            "role": "user",
            "content": f'Create a single MCQ based on the following factoid:\n\nFactoid: "{factoid}"'
        }

        response = azure_client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[SYSTEM_MESSAGE, user_message],
            max_tokens=2048,
            temperature=0.7,
            top_p=1.0
        )

        # Extract and validate the completion
        completion = response.choices[0].message.content
        print(f"  📝 Got response: {completion[:100]}...")  # Show first 100 chars
        
        # Ensure the response is valid JSON
        try:
            mcq = json.loads(completion)
            # Validate MCQ structure
            required_fields = ['question', 'answerChoices', 'explanation', 'factoid']
            if not all(field in mcq for field in required_fields):
                print("  ❌ Missing required fields in MCQ")
                raise ValueError("Missing required fields in MCQ")
            print("  ✅ Successfully validated MCQ format")
            return mcq
        except json.JSONDecodeError:
            # If not valid JSON, try to extract JSON portion
            print("  ⚠️ Invalid JSON format, attempting to extract JSON portion...")
            import re
            json_match = re.search(r'\{.*\}', completion, re.DOTALL)
            if json_match:
                mcq = json.loads(json_match.group())
                if all(field in mcq for field in required_fields):
                    print("  ✅ Successfully extracted and validated MCQ")
                    return mcq
            print("  ❌ Failed to extract valid JSON")
            raise ValueError("Invalid MCQ format")

    except Exception as e:
        print(f"  ❌ Error processing factoid: {str(e)}")
        return None

def save_checkpoint(source_file, current_batch, total_batches):
    """Save progress to a checkpoint file."""
    checkpoint = {
        'source_file': source_file,
        'last_completed_batch': current_batch,
        'total_batches': total_batches,
        'timestamp': datetime.now().isoformat()
    }
    
    with open('python/checkpoint.json', 'w') as f:
        json.dump(checkpoint, f, indent=2)
    print(f"\n💾 Checkpoint saved: Batch {current_batch}/{total_batches}")

def load_checkpoint(source_file):
    """Load the last checkpoint if it exists."""
    try:
        if os.path.exists('python/checkpoint.json'):
            with open('python/checkpoint.json', 'r') as f:
                checkpoint = json.load(f)
                
            if checkpoint['source_file'] == source_file:
                print(f"\n📋 Found checkpoint for {source_file}")
                print(f"Last completed batch: {checkpoint['last_completed_batch']}")
                print(f"Total batches: {checkpoint['total_batches']}")
                return checkpoint['last_completed_batch']
    except Exception as e:
        print(f"Error loading checkpoint: {e}")
    
    return 0  # Start from beginning if no valid checkpoint found

def process_factoids_in_batches(factoids, source_file, batch_size=5):
    """Process factoids in small batches with improved error handling."""
    total_batches = (len(factoids) + batch_size - 1) // batch_size
    
    for batch_num in range(0, len(factoids), batch_size):
        batch = factoids[batch_num:batch_num + batch_size]
        current_batch = (batch_num // batch_size) + 1
        
        print(f"\n🔄 Processing batch {current_batch}/{total_batches}")
        print(f"Factoids in this batch: {len(batch)}")
        
        batch_mcqs = []
        for i, factoid in enumerate(batch, 1):
            print(f"\n  Processing factoid {i}/{len(batch)}")
            mcq = process_factoid(factoid)
            
            if mcq:
                print("  ✅ MCQ generated successfully")
                batch_mcqs.append(mcq)
            else:
                print("  ❌ Failed to generate MCQ")
        
        if batch_mcqs:
            print(f"\n📤 Saving batch {current_batch} to database...")
            save_mcqs_to_db(batch_mcqs, source_file)
            print(f"✅ Successfully saved batch {current_batch} with {len(batch_mcqs)} MCQs")
        
        print(f"\n💾 Checkpoint saved: Batch {current_batch}/{total_batches}")
        time.sleep(1)  # Rate limiting

def save_mcqs_to_db(mcqs, source_file):
    """Save MCQs to MongoDB."""
    try:
        # Prepare the documents
        documents = []
        for mcq in mcqs:
            doc = {
                'source_file': source_file,
                'question': mcq['question'],
                'answerChoices': mcq['answerChoices'],
                'explanation': mcq['explanation'],
                'factoid': mcq['factoid'],
                'created_at': datetime.utcnow()
            }
            documents.append(doc)
        
        # Insert the documents
        if documents:
            result = mcqs_collection.insert_many(documents)
            print(f"✅ Successfully saved {len(result.inserted_ids)} MCQs to database")
            return True
            
    except Exception as e:
        print(f"❌ Error saving MCQs to database: {str(e)}")
        return False

def check_existing_mcqs(source_file):
    """Check how many MCQs already exist for this source file."""
    try:
        # Use the import endpoint with an empty questions array to check if the bank exists
        api_url = "http://localhost:3001/api/questionbank/import"
        response = requests.post(api_url, json={
            "sourceFile": source_file,
            "questions": []
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and data.get('questionBank'):
                question_count = len(data['questionBank'].get('questions', []))
                if question_count > 0:
                    print(f"\n📊 Found existing question bank:")
                    print(f"- Source file: {source_file}")
                    print(f"- Questions already in database: {question_count}")
                    return question_count
        
        print(f"\n📊 No existing questions found for {source_file}")
        return 0
        
    except Exception as e:
        print(f"\n❌ Error checking existing MCQs: {str(e)}")
        print(f"Response status code: {getattr(response, 'status_code', 'N/A')}")
        print(f"Response text: {getattr(response, 'text', 'N/A')}")
        return None

def clear_existing_mcqs(source_file):
    """Clear all existing MCQs for this source file."""
    try:
        api_url = "http://localhost:3001/api/questionbank/import"
        response = requests.post(api_url, json={
            "sourceFile": source_file,
            "questions": [],
            "clearExisting": True
        })
        
        if response.status_code == 200:
            print(f"\n🗑️  Cleared all existing questions for {source_file}")
            return True
        else:
            print(f"\n❌ Failed to clear questions: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error clearing MCQs: {str(e)}")
        return False

def get_factoid_files(input_dir):
    """Get all JSON files in the input directory."""
    json_files = []
    for file in os.listdir(input_dir):
        if file.endswith('_factoids.json'):
            json_files.append(os.path.join(input_dir, file))
    if not json_files:
        print(f"\n❌ No factoid JSON files found in {input_dir} directory!")
    else:
        print(f"\nFound factoid files: {[os.path.basename(f) for f in json_files]}")
    return json_files

def process_factoids_file(file_path):
    """Process a single factoids file."""
    try:
        print(f"\n📂 Reading factoids from {os.path.basename(file_path)}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        source_file = data.get('source_file')
        factoids = data.get('factoids', [])
        
        print(f"📊 Found {len(factoids)} factoids")
        print(f"📄 Source file: {source_file}")
        
        # Process factoids in batches
        batch_size = 5
        total_batches = (len(factoids) + batch_size - 1) // batch_size
        
        all_mcqs = []
        for batch_num in range(0, len(factoids), batch_size):
            batch = factoids[batch_num:batch_num + batch_size]
            current_batch = (batch_num // batch_size) + 1
            
            print(f"\n🔄 Processing batch {current_batch}/{total_batches}")
            print(f"📝 Factoids in this batch: {len(batch)}")
            
            batch_mcqs = []
            for i, factoid in enumerate(batch, 1):
                print(f"\n  Processing factoid {i}/{len(batch)}")
                mcq = process_factoid(factoid)
                
                if mcq:
                    print("  ✅ MCQ generated successfully")
                    batch_mcqs.append(mcq)
                else:
                    print("  ❌ Failed to generate MCQ")
            
            if batch_mcqs:
                all_mcqs.extend(batch_mcqs)
                print(f"\n💾 Saving batch {current_batch} with {len(batch_mcqs)} MCQs...")
                save_mcqs_to_db(batch_mcqs, source_file)
                print(f"✅ Successfully saved batch {current_batch}")
            
            print(f"\n⏳ Waiting before next batch...")
            time.sleep(1)  # Rate limiting
        
        return all_mcqs
        
    except Exception as e:
        print(f"❌ Error processing file: {str(e)}")
        return None

def main(input_dir=None, output_dir=None):
    """Generate MCQs from factoids files."""
    if input_dir is None:
        input_dir = os.path.join(os.path.dirname(__file__), 'factoids')
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), 'mcqs')  # Changed from COMPLETED_MCQS

    print(f"Reading factoids from: {input_dir}")
    print(f"Writing MCQs to: {output_dir}")

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Get factoid files
    factoid_files = [f for f in os.listdir(input_dir) if f.endswith('_factoids.json')]
    
    if not factoid_files:
        print(f"No factoid files found in {input_dir}!")
        print(f"Directory contents: {os.listdir(input_dir)}")
        return

    for factoid_file in factoid_files:
        source_name = factoid_file.replace('_factoids.json', '')
        input_path = os.path.join(input_dir, factoid_file)
        output_path = os.path.join(output_dir, f"{source_name}_mcqs.json")
        
        print(f"\nProcessing {factoid_file}...")
        
        try:
            # Read factoids
            with open(input_path, 'r') as f:
                factoids_data = json.load(f)
            
            print(f"Found {len(factoids_data['factoids'])} factoids")
            
            # Generate MCQs for each factoid
            mcqs = []
            for factoid in factoids_data['factoids']:
                print(f"Generating MCQ for: {factoid[:50]}...")
                mcq = process_factoid(factoid)
                if mcq:
                    mcqs.append(mcq)
            
            # Add metadata to each MCQ
            for mcq in mcqs:
                mcq['source_file'] = source_name
                mcq['bank_id'] = source_name.replace('_factoids.json', '').lower()
                if mcq['bank_id'].startswith('mehlman '):
                    mcq['bank_id'] = 'mehlman-' + mcq['bank_id'].replace('mehlman ', '')
                elif mcq['bank_id'] == 'biochemistry':
                    mcq['bank_id'] = 'mehlman-biochemistry'
                elif mcq['bank_id'] == 'psychology':
                    mcq['bank_id'] = 'mehlman-psychology'
            
            # Save MCQs
            output_data = {
                'source_file': source_name,
                'mcqs': mcqs
            }
            
            with open(output_path, 'w') as f:
                json.dump(output_data, f, indent=2)
            
            print(f"✅ Successfully generated {len(mcqs)} MCQs for {source_name}")
            
        except Exception as e:
            print(f"❌ Error processing {factoid_file}: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main() 
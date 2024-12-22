import os
import json
import uuid
from openai import AzureOpenAI
from dotenv import load_dotenv
from datetime import datetime
import time
import requests

# Load environment variables
load_dotenv()

# Azure OpenAI Configuration
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

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
        user_message = {
            "role": "user",
            "content": f'Create a single MCQ based on the following factoid:\n\nFactoid: "{factoid}"'
        }

        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[SYSTEM_MESSAGE, user_message],
            max_tokens=2048,
            temperature=0.7,
            top_p=1.0
        )

        completion = response.choices[0].message.content.strip()
        
        # Parse the JSON response
        mcq_json = json.loads(completion)
        # Add a unique ID
        mcq_json["id"] = str(uuid.uuid4())
        return mcq_json

    except Exception as e:
        print(f"Error processing factoid: {str(e)}")
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
    """Process factoids in batches and save each batch immediately."""
    total_batches = (len(factoids) + batch_size - 1) // batch_size
    
    # Calculate starting batch from existing questions
    existing_count = check_existing_mcqs(source_file) or 0
    last_completed_batch = existing_count // batch_size
    start_index = last_completed_batch * batch_size
    
    if start_index >= len(factoids):
        print("\n✅ All batches were already processed!")
        return
    
    print(f"\n=== Starting batch processing ===")
    print(f"Total factoids: {len(factoids)}")
    print(f"Batch size: {batch_size}")
    print(f"Total batches: {total_batches}")
    print(f"Starting from batch: {last_completed_batch + 1}")
    print(f"Source file: {source_file}\n")
    
    # Initialize consolidated backup file
    all_failed_mcqs = []
    
    try:
        for i in range(start_index, len(factoids), batch_size):
            batch = factoids[i:i + batch_size]
            current_batch = (i//batch_size) + 1
            print(f"\n🔄 Processing batch {current_batch}/{total_batches}")
            print(f"Factoids in this batch: {len(batch)}")
            
            batch_mcqs = []
            for idx, factoid in enumerate(batch, 1):
                print(f"\n  Processing factoid {idx}/{len(batch)}")
                mcq = process_factoid(factoid)
                if mcq:
                    batch_mcqs.append(mcq)
                    print(f"  ✅ MCQ generated successfully")
                else:
                    print(f"  ❌ Failed to generate MCQ")
                time.sleep(1)  # Rate limiting
            
            # Modified error handling
            try:
                api_url = "http://localhost:3001/api/questionbank/import"
                payload = {
                    "sourceFile": source_file,
                    "questions": batch_mcqs
                }
                
                print(f"\n📤 Saving batch {current_batch} to database...")
                response = requests.post(api_url, json=payload)
                response.raise_for_status()
                print(f"✅ Successfully saved batch {current_batch} with {len(batch_mcqs)} MCQs")
                
                # Save checkpoint after successful batch
                save_checkpoint(source_file, current_batch, total_batches)
                
            except Exception as e:
                print(f"❌ Error saving batch {current_batch}: {str(e)}")
                print(f"Response status code: {getattr(e.response, 'status_code', 'N/A')}")
                print(f"Response text: {getattr(e.response, 'text', 'N/A')}")
                all_failed_mcqs.extend(batch_mcqs)
                
    except KeyboardInterrupt:
        print("\n\n⚠️ Process interrupted by user")
        print(f"Progress saved at batch {current_batch}/{total_batches}")
        print("You can resume from this point by running the script again")
        
    finally:
        # Save consolidated backup file if there were any failures
        if all_failed_mcqs:
            backup_file = f"python/mcqs/failed_mcqs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "source_file": source_file,
                    "mcqs": all_failed_mcqs,
                    "total_failed": len(all_failed_mcqs)
                }, f, indent=2)
            print(f"\n💾 Saved all failed MCQs to {backup_file}")

def save_mcqs_to_database(source_file, mcqs):
    """Save MCQs to MongoDB via backend API."""
    try:
        api_url = "http://localhost:3001/api/questionbank/import"
        
        payload = {
            "sourceFile": source_file,
            "questions": mcqs
        }
        
        print(f"Attempting to save to: {api_url}")
        print(f"Payload size: {len(mcqs)} MCQs")
        
        response = requests.post(api_url, json=payload)
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        response.raise_for_status()
        print(f"Successfully saved {len(mcqs)} MCQs to database")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Network error: {str(e)}")
        print(f"Response status code: {e.response.status_code if hasattr(e, 'response') else 'N/A'}")
        print(f"Response body: {e.response.text if hasattr(e, 'response') else 'N/A'}")
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

def main():
    input_file_path = "python/factoids/Mehlman Microbiology_factoids.json"
    print(f"\n🚀 Starting MCQ generation process")
    print(f"📂 Processing factoids from: {input_file_path}")
    
    try:
        with open(input_file_path, "r", encoding='utf-8') as f:
            data = json.load(f)
        
        factoids = data.get("factoids", [])
        source_file = os.path.basename(input_file_path)
        
        # Check existing MCQs before starting
        existing_count = check_existing_mcqs(source_file)
        if existing_count is not None and existing_count > 0:
            user_input = input(f"\nDo you want to continue generating MCQs? (y/n/c for clear existing): ")
            if user_input.lower() == 'c':
                if clear_existing_mcqs(source_file):
                    print("Starting fresh MCQ generation...")
                    existing_count = check_existing_mcqs(source_file)
                    if existing_count > 0:
                        print("❌ Failed to clear questions - they still exist in the database. Aborting...")
                        return
                else:
                    print("Failed to clear existing MCQs. Aborting...")
                    return
            elif user_input.lower() != 'y':
                print("Aborting process...")
                return
        
        print(f"📊 Found {len(factoids)} factoids to process")
        process_factoids_in_batches(factoids, source_file)
        print("\n✨ MCQ generation process completed!")
        
    except Exception as e:
        print(f"\n❌ Error in main process: {str(e)}")
        return

if __name__ == "__main__":
    main() 
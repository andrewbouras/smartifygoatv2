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

def process_factoids_in_batches(factoids, source_file, batch_size=5):
    """Process factoids in batches and save each batch immediately."""
    total_batches = (len(factoids) + batch_size - 1) // batch_size
    print(f"\n=== Starting batch processing ===")
    print(f"Total factoids: {len(factoids)}")
    print(f"Batch size: {batch_size}")
    print(f"Total batches: {total_batches}")
    print(f"Source file: {source_file}\n")
    
    # Initialize consolidated backup file
    all_failed_mcqs = []
    
    for i in range(0, len(factoids), batch_size):
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
        except Exception as e:
            print(f"❌ Error saving batch {current_batch}: {str(e)}")
            print(f"Response status code: {getattr(e.response, 'status_code', 'N/A')}")
            print(f"Response text: {getattr(e.response, 'text', 'N/A')}")
            all_failed_mcqs.extend(batch_mcqs)
            
    # Save consolidated backup file if there were any failures
    if all_failed_mcqs:
        backup_file = f"python/mcqs/failed_mcqs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump({
                "source_file": source_file,
                "mcqs": all_failed_mcqs,
                "total_failed": len(all_failed_mcqs)
            }, f, indent=2)
        print(f"💾 Saved all failed MCQs to {backup_file}")

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

def send_questions_to_backend(questions):
    url = 'http://localhost:3001/api/questionbank/import'
    
    # You'll need to get a valid JWT token. For development, you could either:
    # 1. Use an API key approach
    # 2. Create a development token
    # 3. Implement a service-to-service authentication
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_AUTH_TOKEN',  # Add proper authentication
        'X-API-Key': 'YOUR_API_KEY'  # Store this in environment variables
    }
    
    try:
        response = requests.post(url, json=questions, headers=headers)
        response.raise_for_status()
        print("Questions successfully sent to backend")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending questions to backend: {e}")
        return None

def main():
    input_file_path = "python/factoids/Mehlman Microbiology_factoids.json"
    print(f"\n🚀 Starting MCQ generation process")
    print(f"📂 Processing factoids from: {input_file_path}")
    
    try:
        with open(input_file_path, "r", encoding='utf-8') as f:
            data = json.load(f)
        
        factoids = data.get("factoids", [])
        source_file = os.path.basename(input_file_path)
        
        print(f"📊 Found {len(factoids)} factoids")
        process_factoids_in_batches(factoids, source_file)
        print("\n✨ MCQ generation process completed!")
        
    except Exception as e:
        print(f"\n❌ Error in main process: {str(e)}")
        return

if __name__ == "__main__":
    main() 
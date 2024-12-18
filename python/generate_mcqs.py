import os
import json
import uuid
from openai import AzureOpenAI
from dotenv import load_dotenv
from datetime import datetime
import time

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

def process_factoids_in_batches(factoids, batch_size=5):
    """Process factoids in batches to handle rate limits."""
    mcqs = []
    total_batches = (len(factoids) + batch_size - 1) // batch_size
    
    for i in range(0, len(factoids), batch_size):
        batch = factoids[i:i + batch_size]
        print(f"\nProcessing batch {(i//batch_size)+1}/{total_batches}")
        
        for factoid in batch:
            mcq = process_factoid(factoid)
            if mcq:
                mcqs.append(mcq)
            
        # Add delay between batches
        if i + batch_size < len(factoids):
            time.sleep(2)  # Adjust based on your rate limits
    
    return mcqs

def main():
    # Find the most recent factoids file
    factoids_dir = "python/factoids"
    files = [f for f in os.listdir(factoids_dir) if f.endswith('.json')]
    if not files:
        print("No factoid files found!")
        return
    
    latest_file = max(files, key=lambda x: os.path.getctime(os.path.join(factoids_dir, x)))
    input_file_path = os.path.join(factoids_dir, latest_file)
    
    print(f"Processing factoids from: {input_file_path}")
    
    # Read the factoids
    with open(input_file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Extract factoids (handle both string and list formats)
    factoids_raw = data.get("factoids", [])
    if isinstance(factoids_raw, str):
        # Split the string into a list if it's a string
        factoids = [f.strip() for f in factoids_raw.split('\n') if f.strip()]
    else:
        factoids = factoids_raw
    
    # Process each factoid
    mcqs = process_factoids_in_batches(factoids)
    
    # Create output directory if it doesn't exist
    output_dir = "python/mcqs"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate output filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = os.path.splitext(os.path.basename(input_file_path))[0]
    output_file = os.path.join(output_dir, f"{base_name}_mcqs_{timestamp}.json")
    
    # Save the MCQs
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "source_file": data.get("source_file"),
            "mcqs": mcqs
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\nMCQs have been generated and saved to: {output_file}")
    print(f"Successfully generated {len(mcqs)} MCQs out of {len(factoids)} factoids")

if __name__ == "__main__":
    main() 
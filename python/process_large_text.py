import os
import json
import time
from openai import AzureOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Azure OpenAI Configuration
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

def chunk_text(text, chunk_size=4000):
    """Split text into chunks of roughly equal size."""
    # Split by paragraphs first
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_size = 0
    
    for para in paragraphs:
        para_size = len(para)
        if current_size + para_size > chunk_size and current_chunk:
            # Join the current chunk and add to chunks
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [para]
            current_size = para_size
        else:
            current_chunk.append(para)
            current_size += para_size
    
    # Add the last chunk if it exists
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    return chunks

def process_chunk_with_retry(chunk, max_retries=3, delay=1):
    """Process a single chunk with retry logic."""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=DEPLOYMENT_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": "Extract testable medical factoids from the text. Each factoid should be a single, clear statement."
                    },
                    {
                        "role": "user",
                        "content": f"Extract factoids from this text:\n\n{chunk}"
                    }
                ],
                max_tokens=2048,
                temperature=0.0
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed after {max_retries} attempts: {str(e)}")
                return None
            print(f"Attempt {attempt + 1} failed: {str(e)}. Retrying...")
            time.sleep(delay * (attempt + 1))  # Exponential backoff

def process_large_file(input_file, output_dir):
    """Process a large text file and generate factoids."""
    # Read the input file
    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Split into chunks
    chunks = chunk_text(text)
    print(f"Split text into {len(chunks)} chunks")
    
    # Process each chunk with rate limiting
    all_factoids = []
    for i, chunk in enumerate(chunks, 1):
        print(f"Processing chunk {i}/{len(chunks)}")
        
        # Add rate limiting delay
        if i > 1:
            time.sleep(2)  # Basic rate limiting
        
        # Process chunk
        result = process_chunk_with_retry(chunk)
        if result:
            # Split result into individual factoids and clean them
            chunk_factoids = [f.strip() for f in result.split('\n') if f.strip()]
            all_factoids.extend(chunk_factoids)
            print(f"Extracted {len(chunk_factoids)} factoids from chunk {i}")
    
    # Save results
    output_file = os.path.join(
        output_dir,
        f"{os.path.splitext(os.path.basename(input_file))[0]}_factoids.json"
    )
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "source_file": os.path.basename(input_file),
            "factoids": all_factoids
        }, f, indent=2)
    
    return output_file

if __name__ == "__main__":
    input_dir = "1_TranscribedPDFs"
    output_dir = "2_factoids"
    os.makedirs(output_dir, exist_ok=True)
    
    for filename in os.listdir(input_dir):
        if filename.endswith('.txt'):
            input_file = os.path.join(input_dir, filename)
            print(f"\nProcessing {filename}...")
            output_file = process_large_file(input_file, output_dir)
            print(f"Saved factoids to {output_file}") 
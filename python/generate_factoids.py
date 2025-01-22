import os
from openai import AzureOpenAI
from dotenv import load_dotenv
import json
from datetime import datetime

# Load environment variables
load_dotenv()

# Azure OpenAI Configuration
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

# System message prompt (persistent instructions)
SYSTEM_MESSAGE = {
    "role": "system",
    "content": (
        "You are a helpful assistant that converts educational medical text into a set of standalone factoids. "
        "Each factoid should represent a testable piece of information drawn directly from the provided text. "
        "Maintain faithfulness to the source content, avoid adding information not present in the text, and do "
        "not categorize them. If a concept appears multiple times, you may present it from different angles or "
        "with different details, but avoid simple redundant repetition. Each factoid should be a short, single-"
        "sentence statement that could be turned into a test question."
    )
}

def process_text_file(file_path, output_dir):
    """Process a single text file and generate factoids."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text_content = f.read()

        # Split text into chunks of roughly 100k characters
        chunk_size = 100000
        chunks = [text_content[i:i + chunk_size] for i in range(0, len(text_content), chunk_size)]
        
        all_factoids = []
        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)}...")
            
            user_prompt = {
                "role": "user",
                "content": (
                    "Below is a block of text extracted from a resource who has curated a high-yield document for a given subject for student preparation for the USMLE STEP 1 exam. The author has already done a great job at only including high yield information, so now I want to have a way of actively engaging with the material via MCQs. To do so, I need to effectively convert this document into testable chunks of information that I can reasonably go through and convert into MCQs. I don't want to be doing thousands of questions per document, I would like to keep it at hundreds max. "
                    "Please convert all testable information into a list of factoids as described in the instructions -- Avoid redundancy but the entirety of the document should be covered and addressed accordingly.\n\n"
                    f"[BEGIN TEXT]\n{chunk}\n[END TEXT]"
                )
            }

            response = client.chat.completions.create(
                model=DEPLOYMENT_NAME,
                messages=[SYSTEM_MESSAGE, user_prompt],
                max_tokens=2048,
                temperature=0.0,
                top_p=1.0
            )

            # Extract and clean the factoids from this chunk
            completion = response.choices[0].message.content
            
            # Split by newlines and clean up
            chunk_factoids = []
            for line in completion.split('\n'):
                line = line.strip()
                # Remove bullet points and other markers
                line = line.lstrip('- ').lstrip('* ').lstrip('• ')
                if line and not line.startswith(('Note:', 'Example:', 'Remember:')):
                    chunk_factoids.append(line)
            
            all_factoids.extend(chunk_factoids)

        # Limit to maximum 100 factoids from all chunks combined
        all_factoids = all_factoids[:100]
        
        # Save to JSON file
        output_file = os.path.join(
            output_dir,
            f"{os.path.splitext(os.path.basename(file_path))[0]}_factoids.json"
        )
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                "source_file": os.path.basename(file_path),
                "factoids": all_factoids
            }, f, indent=2, ensure_ascii=False)
        
        return all_factoids

    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return None

def save_factoids(filename, factoids):
    """Save factoids to a JSON file with timestamp."""
    output_dir = "2_factoids"
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = os.path.splitext(os.path.basename(filename))[0]
    output_file = os.path.join(output_dir, f"{base_name}_factoids_{timestamp}.json")
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({"source_file": filename, "factoids": factoids}, f, indent=2)
    
    return output_file

def main(input_dir="python/transcribed", output_dir="python/factoids"):
    """Main function to process all text files."""
    # Ensure directories exist
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    
    # Get list of transcribed text files
    text_files = [f for f in os.listdir(input_dir) if f.endswith('.txt')]
    
    if not text_files:
        print("\n❌ No text files found in transcribed directory!")
        return
    
    for text_file in text_files:
        print(f"\nProcessing {text_file}...")
        file_path = os.path.join(input_dir, text_file)
        factoids = process_text_file(file_path, output_dir)
        
        if factoids:
            print(f"✅ Successfully generated factoids for {text_file}")
        else:
            print(f"❌ Failed to generate factoids for {text_file}")

if __name__ == "__main__":
    main() 
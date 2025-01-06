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

def process_text_file(file_path):
    """Process a single text file and generate factoids."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text_content = f.read()

        # Construct user prompt
        user_prompt = {
            "role": "user",
            "content": (
                "Below is a block of text extracted from a medical textbook resource. "
                "Please convert all testable information into a list of factoids as described in the instructions.\n\n"
                f"[BEGIN TEXT]\n{text_content}\n[END TEXT]"
            )
        }

        # Send request to Azure OpenAI
        response = client.chat.completions.create(
            model=DEPLOYMENT_NAME,
            messages=[SYSTEM_MESSAGE, user_prompt],
            max_tokens=2048,
            temperature=0.0,
            top_p=1.0
        )

        # Extract the completion
        completion = response.choices[0].message.content
        return completion

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

def main():
    input_dir = "1_TranscribedPDFs"
    
    # Process each text file in the input directory
    for filename in os.listdir(input_dir):
        if filename.endswith(".txt"):
            print(f"\nProcessing {filename}...")
            file_path = os.path.join(input_dir, filename)
            
            # Generate factoids
            factoids = process_text_file(file_path)
            
            if factoids:
                # Save factoids to JSON file
                output_file = save_factoids(filename, factoids)
                print(f"Factoids saved to: {output_file}")
            else:
                print(f"Failed to generate factoids for {filename}")

if __name__ == "__main__":
    main() 
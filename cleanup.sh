#!/bin/bash

# Create a new clean directory structure
mkdir -p clean_structure
cd clean_structure

# Create Python processing directories
mkdir -p python/{pdfs,transcribed,factoids,mcqs}

# Create Next.js app directory
mkdir -p web

# Move files to their proper locations
cd ..

# Move PDF processing files
cp 0_PDFs/* clean_structure/python/pdfs/
cp 1_TranscribedPDFs/* clean_structure/python/transcribed/
cp 2_factoids/* clean_structure/python/factoids/
cp 3_mcqs/* clean_structure/python/mcqs/

# Move Python scripts
cp transcribe_pdf.py generate_factoids.py generate_mcqs.py requirements.txt .env clean_structure/python/

# Move Next.js app
cp -r my-app/mcq-viewer/* clean_structure/web/

# Create a new README
echo "# Medical MCQ Generator and Viewer

This project consists of two main parts:

1. Python Processing Pipeline:
   - PDF to Text Transcription
   - Factoid Generation
   - MCQ Generation

2. Web Interface:
   - Next.js MCQ Viewer
   - Interactive Quiz Interface

## Directory Structure:
- python/
  - pdfs/: Source PDF files
  - transcribed/: Transcribed text files
  - factoids/: Generated factoids
  - mcqs/: Generated MCQs
  - *.py: Processing scripts
- web/: Next.js web application" > clean_structure/README.md

# Remove old directories and files
rm -rf my-app components app smartifygoatv2 install-components.sh
rm -rf 0_PDFs 1_TranscribedPDFs 2_factoids 3_mcqs
rm -f transcribe_pdf.py generate_factoids.py generate_mcqs.py

# Move everything from clean_structure to current directory
mv clean_structure/* .
rm -rf clean_structure 
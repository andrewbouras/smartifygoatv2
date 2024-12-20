python python/test_pipeline.py --> creates MCQs from uploaded PDF
python serve_mcqs.py --> opens generated MCQs in browser (localhost:8000)

cd frontend --> npm run dev
cd backend --> npm run dev

git add .
git commit -m "Initial commit"
git push





# Medical MCQ Generator and Viewer

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
- web/: Next.js web application

python python/generate_mcqs.py --> creates MCQs from uploaded PDF
python serve_mcqs.py --> opens generated MCQs in browser (localhost:8000)

cd frontend --> npm run dev
cd backend --> npm run dev

git add .
git commit -m "
git push



1. Add PDF to python/pdfs/
2. Add to Home.jsx
3. Add to index.html
4. Add to generate_mcqs.py
5. cd backend --> npm run dev
6. cd frontend --> npm run dev
7. cd python --> python test_pipeline.py
8. Delete files from transcribed/, factoids/, and move /mcqs to COMPLETED_MCQS/

Great, I just added .pdf, can we make sure we're all set and ready to go witht this file @Home.jsx @index.html @generate_mcqs.py 











# Fetch the latest updates from remote
git fetch origin

# Show the latest commit on the remote main branch
git log origin/main -1

# Reset to that version
git reset --hard origin/main


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

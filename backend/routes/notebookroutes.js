const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Notebook, Chapter, Question, UserResponseChapter } = require('../models/Notebook');
const ensureAuthenticated = require('../middlewares/auth');
const axios = require('axios');
const mongoose = require('mongoose');
const ShortenedUrl = require('../models/ShortenedUrl'); // Import the ShortenedUrl model
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Add this line to import the crypto module
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');



const upload = multer({ dest: 'uploads/' }).fields([
  { name: 'pdfs', maxCount: 10 },
  { name: 'videos', maxCount: 10 }, 
  { name: 'audios', maxCount: 10 }
]);



// Create a new notebook
router.post('/notebooks/new', ensureAuthenticated, async (req, res) => {
  try {
    const newNotebook = new Notebook({
      title: req.body.title,
      user: req.user.id,
      permissions: [
        {
          userId: req.user.id,
          level: 'admin'
        }
      ]
    });
    await newNotebook.save();
    res.status(201).json(newNotebook);
  } catch (error) {
    console.error('Error creating new notebook:', error);
    res.status(500).json({ message: 'Failed to create new notebook', error: error.toString() });
  }
});


// Get all notebooks and chapters for a user
router.get('/notebooks', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const notebooks = await Notebook.find({
      $or: [
        { user: userId },
        { 'permissions.userId': userId }
      ]
    }).populate({
      path: 'chapters',
      match: {
        $or: [
          { 'permissions.userId': userId },
          { 'notebook.user': userId }
        ]
      },
      select: '_id title'
    });

    const formattedNotebooks = notebooks.map(notebook => ({
      _id: notebook._id,
      title: notebook.title,
      chapters: notebook.chapters.map(chapter => ({
        _id: chapter._id,
        title: chapter.title,
        notebookId: notebook._id
      }))
    }));

    res.status(200).json(formattedNotebooks);
  } catch (error) {
    console.error('Error retrieving notebooks and chapters:', error);
    res.status(500).json({ message: 'Failed to retrieve notebooks and chapters', error: error.toString() });
  }
});



// Get a specific notebook by ID
router.get('/notebooks/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // Log the request for debugging
    //console.log(`Fetching notebook with ID: ${req.params.id} for user ID: ${userId}`);

    // Find the notebook by ID and check if the user has access
    const notebook = await Notebook.findOne({
      _id: req.params.id,
      $or: [
        { user: userId }, // The user is the owner
        { 'permissions.userId': userId } // The user has been granted access
      ]
    }).populate('chapters');

    // Log the result for debugging
    console.log('Notebook found:', );

    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found or access denied' });
    }

    // Return the notebook data
    res.status(200).json(notebook);

  } catch (error) {
    console.error('Error retrieving specific notebook:', error);
    res.status(500).json({ message: 'Failed to retrieve notebook', error: error.toString() });
  }
});




// Update a notebook
router.put('/notebooks/:id', ensureAuthenticated, async (req, res) => {
  try {
    const notebook = await Notebook.findById(req.params.id);
    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found' });
    }
    if (notebook.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this notebook' });
    }

    notebook.title = req.body.title;
    await notebook.save();
    res.status(200).json({ message: 'Notebook updated successfully', notebook });
  } catch (error) {
    console.error('Error updating notebook:', error);
    res.status(500).json({ message: 'Failed to update notebook', error: error.toString() });
  }
});

// Delete a notebook
router.delete('/notebooks/:id', ensureAuthenticated, async (req, res) => {
  try {
    const notebook = await Notebook.findById(req.params.id);
    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found' });
    }
    if (notebook.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this notebook' });
    }
    await Notebook.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Notebook deleted successfully' });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ message: 'Failed to delete notebook', error: error.toString() });
  }
});



// Create a new chapter in a notebook and inherit permissions from the notebook
router.post('/notebooks/:notebookId/chapters/new', ensureAuthenticated, upload, async (req, res) => {
  try {
    const notebook = await Notebook.findById(req.params.notebookId).populate('permissions');
    if (!notebook) {
      return res.status(404).json({ message: 'Notebook not found' });
    }

    const { title, question_style, text, num_questions, use_bolding, intro_questions, "Statements of information": statements } = req.body;
    const strategicModeBoolean = use_bolding === 'on';

    const newChapter = new Chapter({
      title,
      content: text,
      notebook: req.params.notebookId,
      permissions: notebook.permissions, // Inherit permissions from the notebook
      questionType: question_style, // Save question style
      strategicMode: strategicModeBoolean, // Save strategic mode status
      intro_questions: intro_questions,
    });

    notebook.chapters.push(newChapter._id);

    await newChapter.save();
    await notebook.save();

    // Map question style
    const mappedQuestionStyle = question_style.toLowerCase();

    // Prepare data for generating questions with correct number of questions based on selected type
    const questionCount = num_questions;
    const generateRequestData = {
      ID: newChapter._id.toString(),
      text: text,
      num_questions: questionCount,
      question_style: mappedQuestionStyle,
      use_bolding: strategicModeBoolean,
      intro_questions: intro_questions,
      "Statements of information": statements
    };

    // Make POST request to generate questions
    const generateResponse = axios.post('https://mcqgen.wonderfulrock-33947cca.australiaeast.azurecontainerapps.io/generate', generateRequestData);

    if (generateResponse.status === 202) {
      console.log('Job accepted for generating questions');
    }

    res.status(201).json(newChapter);
  } catch (error) {
    console.error('Error creating new chapter:', error);
    res.status(500).json({ message: 'Failed to create new chapter', error: error.toString() });
  }
});

// Updated /similarresponse endpoint
router.post('/similarresponse', async (req, res) => {
  // console.log("Received request at /similarresponse with body:", JSON.stringify(req.body, null, 2));
  try {
    const { notebook_ID, chapter_ID, question_ID, questions, user_ID } = req.body;

    // Step 1: Validate input
    console.log("Validating request body...");
    if (!notebook_ID || !chapter_ID || !question_ID || !Array.isArray(questions) || questions.length === 0) {
      console.error("Invalid request data:", req.body);
      return res.status(400).json({ message: 'Invalid request data. Please provide notebook_ID, chapter_ID, question_ID, and questions array.' });
    }

    // Step 2: Find the notebook and chapter
    // console.log(`Looking for notebook with ID: ${notebook_ID}`);
    const notebook = await Notebook.findOne({ _id: notebook_ID });
    if (!notebook) {
      console.error(`Notebook not found for ID: ${notebook_ID}`);
      return res.status(404).json({ message: 'Notebook not found' });
    }
    // console.log("Notebook found:", notebook);

    console.log(`Looking for chapter with ID: ${chapter_ID}`);
    const chapter = await Chapter.findOne({ _id: chapter_ID });
    if (!chapter) {
      console.error(`Chapter not found for ID: ${chapter_ID}`);
      return res.status(404).json({ message: 'Chapter not found' });
    }
    // console.log("Chapter found:", chapter);

    // Step 3: Process each question in the `questions` array
    console.log("Processing questions...");
    const questionPromises = questions.map(async (questionData, index) => {
      // console.log(`Processing question ${index + 1}:`, questionData);

      // Step 3.1: Validate question data
      if (!questionData.question || !Array.isArray(questionData.answerChoices) || questionData.answerChoices.length === 0) {
        console.error("Invalid question data:", questionData);
        throw new Error(`Invalid question data at index ${index}`);
      }

      // Step 3.2: Construct the new Question object
      const newQuestion = new Question({
        question: questionData.question,
        answerChoices: questionData.answerChoices.map(choice => ({
          value: choice.value,
          correct: choice.correct
        })),
        explanation: questionData.explanation || 'No explanation provided',
        concept: questionData.concept,
        createdForUser: user_ID ? user_ID : null // Handle absence of user_ID explicitly
      });

      // Step 3.3: Save the question to the database
      // console.log(`Saving question ${index + 1} to database...`);
      await newQuestion.save();
      // console.log(`Question ${index + 1} saved successfully with ID:`, newQuestion._id);

      // Step 3.4: Add the question to the chapter
      chapter.questions.push(newQuestion._id);
    });

    // Step 4: Wait for all promises to complete
    console.log("Waiting for all questions to be saved...");
    await Promise.all(questionPromises);
    console.log("All questions saved. Now saving chapter...");

    // Step 5: Save the chapter with the new questions
    await chapter.save();
    console.log("Chapter saved successfully.");

    // Step 6: Send success response
    res.status(200).json({ message: 'Similar questions saved successfully' });

  } catch (error) {
    console.error('Error during similar questions processing:', error);
    res.status(500).json({ message: 'Failed to save similar questions', error: error.toString() });
  }
});


// Updated /generatedresponse endpoint without user_ID
router.post('/generatedresponse', async (req, res) => {
  console.log("Request received", req.body);
  try {
    const { ID, questions } = req.body;

    const chapter = await Chapter.findById(ID);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    if (!chapter.questions) {
      chapter.questions = [];
    }

    const questionPromises = questions.map(async (questionData) => {
      const newQuestion = new Question({
        question: questionData.question,
        answerChoices: questionData.answerChoices.map(choice => ({
          value: choice.value,
          correct: choice.correct
        })),
        explanation: questionData.explanation,
        concept: questionData.concept
      });

      await newQuestion.save();
      chapter.questions.push(newQuestion._id);

    });

    await Promise.all(questionPromises);
    await chapter.save();

    res.status(200).json({ message: 'Questions saved successfully' });
  } catch (error) {
    console.error('Error saving questions:', error);
    res.status(500).json({ message: 'Failed to save questions', error: error.toString() });
  }
});





// router.post('/similarresponse', async (req, res) => {
//   console.log(" req body for similar response", req.body);
//   try {
//     const { notebook_ID, user_ID, question_ID, questions } = req.body;

//     // Find the notebook and chapter where the original question resides
//     const notebook = await Notebook.findOne({ _id: notebook_ID });
//     if (!notebook) {
//       return res.status(404).json({ message: 'Notebook not found' });
//     }

//     // Assuming there's a way to map the original question ID to its chapter
//     const chapter = await Chapter.findOne({ questions: question_ID });
//     if (!chapter) {
//       return res.status(404).json({ message: 'Chapter not found' });
//     }

//     // Loop through and save the similar questions
//     const questionPromises = questions.map(async (questionData) => {
//       const newQuestion = new Question({
//         question: questionData.question,
//         answerChoices: questionData.answerChoices.map(choice => ({
//           value: choice.value,
//           correct: choice.correct
//         })),
//         explanation: questionData.explanation,
//         createdForUser: user_ID // Mark the question as created for a specific user
//       });

//       await newQuestion.save();
//       chapter.questions.push(newQuestion._id); // Add to the chapter
//     });

//     await Promise.all(questionPromises);
//     await chapter.save();

//     res.status(200).json({ message: 'Similar questions saved successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to save similar questions', error: error.toString() });
//   }
// });


// Receive generated questions and save them
router.post('/mcq_response', async (req, res) => {
  try {
    const { id, questions } = req.body;

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    if (!chapter.questions) {
      chapter.questions = [];
    }

    const questionPromises = questions.map(async (questionData) => {
      const newQuestion = new Question({
        question: questionData.question,
        answerChoices: questionData.answerChoices.map(choice => ({
          value: choice.value,
          correct: choice.correct
        })),
        explanation: questionData.explanation
      });

      await newQuestion.save();

      chapter.questions.push(newQuestion._id);
    });

    await Promise.all(questionPromises);
    await chapter.save();

    res.status(200).json({ message: 'Questions saved successfully' });
  } catch (error) {
    console.error('Error saving questions:', error);
    res.status(500).json({ message: 'Failed to save questions', error: error.toString() });
  }
});


// Get a specific chapter by ID
router.get('/notebooks/:notebookId/chapters/:chapterId', ensureAuthenticated, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ _id: req.params.chapterId, notebook: req.params.notebookId });
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    res.status(200).json(chapter);
  } catch (error) {
    console.error('Error retrieving specific chapter:', error);
    res.status(500).json({ message: 'Failed to retrieve chapter', error: error.toString() });
  }
});

// Update a chapter
router.put('/notebooks/:notebookId/chapters/:chapterId', ensureAuthenticated, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ _id: req.params.chapterId, notebook: req.params.notebookId });
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (chapter.notebook.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this chapter' });
    }

    chapter.title = req.body.title;
    chapter.content = req.body.content;
    await chapter.save();
    res.status(200).json({ message: 'Chapter updated successfully', chapter });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Failed to update chapter', error: error.toString() });
  }
});

// Delete a chapter
router.delete('/notebooks/:notebookId/chapters/:chapterId', ensureAuthenticated, async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ _id: req.params.chapterId, notebook: req.params.notebookId }).populate('notebook');
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    if (chapter.notebook.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this chapter' });
    }

    await Chapter.findByIdAndDelete(req.params.chapterId);
    res.status(200).json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ message: 'Failed to delete chapter', error: error.toString() });
  }
});


// // Get all questions for a chapter with user responses, flagged status, and chapter title
// router.get('/chapter/:chapterID/questions', ensureAuthenticated, async (req, res) => {
//   try {
//     const chapter = await Chapter.findById(req.params.chapterID).populate('questions');
//     if (!chapter) {
//       return res.status(404).json({ message: 'Chapter not found' });
//     }

//     const userResponses = await UserResponseChapter.find({ userId: req.user.id }) || [];
    
//     // console.log('Chapter Questions:', chapter.questions);
//     // console.log('User Responses:', userResponses);

//     const questionsWithResponses = chapter.questions.map(question => {
//       const response = userResponses.find(resp => resp.questionId.toString() === question._id.toString());
      
//       // if (response) {
//       //   console.log(`Response matched for questionId ${question._id.toString()}:`, response);
//       // }

//       return {
//         question: {
//           _id: question._id,
//           question: question.question,
//           answerChoices: question.answerChoices,
//           explanation: question.explanation,
//           __v: question.__v
//         },
//         userResponse: response ? response.selectedAnswer : null,
//         flagged: response ? response.flagged : false
//       };
//     });

//     res.status(200).json({
//       chapterTitle: chapter.title,
//       questionsWithResponses: questionsWithResponses
//     });
//   } catch (error) {
//     console.error('Error retrieving questions:', error);
//     res.status(500).json({ message: 'Failed to retrieve questions', error: error.toString() });
//   }
// });

router.get('/chapter/:chapterID/questions', ensureAuthenticated, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterID).populate('questions');
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    const userResponses = await UserResponseChapter.find({ userId: req.user.id }) || [];
    
    // Filter questions to include user-specific and general questions
    const questions = chapter.questions.filter(question => 
      question.createdForUser === null || question.createdForUser.toString() === req.user.id.toString()
    );

    const questionsWithResponses = questions.map(question => {
      const response = userResponses.find(resp => resp && resp.questionId && question._id && resp.questionId.toString() === question._id.toString());
      
      return {
        question: {
          _id: question._id,
          question: question.question,
          answerChoices: question.answerChoices,
          explanation: question.explanation,
          __v: question.__v
        },
        userResponse: response ? response.selectedAnswer : null,
        flagged: response ? response.flagged : false
      };
    });

    res.status(200).json({
      chapterTitle: chapter.title,
      questionsWithResponses: questionsWithResponses
    });
  } catch (error) {
    console.error('Error retrieving questions:', error);
    res.status(500).json({ message: 'Failed to retrieve questions', error: error.toString() });
  }
});



router.post('/questions/:questionId/responses', ensureAuthenticated, async (req, res) => {
  try {
    const { selectedAnswer, flagged, questionId } = req.body;
    const userId = req.user.id;

    const existingResponse = await UserResponseChapter.findOne({ userId, questionId });
    let question;
    if (existingResponse) {
      existingResponse.selectedAnswer = selectedAnswer;
      existingResponse.flagged = flagged;
      await existingResponse.save();
      question = await Question.findById(questionId);
    } else {
      const newResponse = new UserResponseChapter({
        userId,
        questionId,
        selectedAnswer,
        flagged
      });
      await newResponse.save();
      question = await Question.findById(questionId);
    }

    const answerChoice = question.answerChoices.find(choice => choice.value === selectedAnswer);
    const isCorrect = answerChoice && answerChoice.correct;

    if (!isCorrect) {
      // If the answer is incorrect, generate more questions
      const chapter = await Chapter.findOne({ questions: questionId }).populate('notebook');
      const notebookId = chapter.notebook._id;

      const similarRequestData = {
        notebook_ID: notebookId.toString(),
        chapter_ID: chapter._id.toString(),
        user_ID: userId,
        question_ID: questionId,
        text: chapter.content,
        question: question.question,
        answerChoices: question.answerChoices,
        explanation: question.explanation,
        concept: question.concept,
        style: chapter.questionType,
        num_questions: 1, // Generate 1 more question
        bold: chapter.strategicMode
      };

      console.log("Generating new question after incorrect answer", similarRequestData);

      await axios.post('https://mcqgen.wonderfulrock-33947cca.australiaeast.azurecontainerapps.io/similar', similarRequestData);
    }

    res.status(200).json({ message: 'Response saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save response', error: error.toString() });
  }
});



module.exports = router;

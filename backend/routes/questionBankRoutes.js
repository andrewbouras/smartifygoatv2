const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const ensureAuthenticated = require('../middlewares/auth');
const User = require('../models/user');
const mcqs_collection = require('../models/mcqs');
const mongoose = require('mongoose');

// Get the MongoDB connection
const db = mongoose.connection;

// Test endpoint to check MongoDB connection
router.get('/test', async (req, res) => {
  try {
    // Try to find any question bank
    const questionBanks = await QuestionBank.find().limit(1);
    res.json({ 
      status: 'success', 
      message: 'MongoDB connection is working',
      data: questionBanks
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack 
    });
  }
});

// Log incorrect answers (requires authentication)
router.post('/log_incorrect', ensureAuthenticated, async (req, res) => {
  try {
    const { mcq_id, factoid } = req.body;
    const userId = req.user.id;

    // Find user and update their incorrect answers
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Initialize incorrectAnswers array if it doesn't exist
    if (!user.incorrectAnswers) {
      user.incorrectAnswers = [];
    }

    // Add the incorrect answer if it's not already there
    const existingAnswer = user.incorrectAnswers.find(
      answer => answer.mcq_id === mcq_id
    );

    if (!existingAnswer) {
      user.incorrectAnswers.push({
        mcq_id,
        factoid,
        timestamp: new Date()
      });
      await user.save();
    }

    res.json({ status: 'success', message: 'Incorrect answer logged' });
  } catch (error) {
    console.error('Error logging incorrect answer:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Test endpoint to check authentication
router.get('/auth-test', ensureAuthenticated, async (req, res) => {
  try {
    res.json({ 
      status: 'success', 
      message: 'You are authenticated!',
      user: req.user
    });
  } catch (error) {
    console.error('Auth test error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message
    });
  }
});

// Simple import endpoint for local use
router.post('/import', ensureAuthenticated, async (req, res) => {
  try {
    const { sourceFile } = req.body;
    
    // Check if MCQs already exist
    let questionBank = await QuestionBank.findOne({ sourceFile });
    
    if (!questionBank) {
      // Read the MCQs from MongoDB mcqs collection
      const mcqs = await mcqs_collection.find({ source_file: sourceFile }).toArray();
      
      if (!mcqs || mcqs.length === 0) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'No MCQs found for import' 
        });
      }

      // Create new question bank
      questionBank = new QuestionBank({
        sourceFile,
        questions: mcqs.map(mcq => ({
          question: mcq.question,
          answerChoices: mcq.answerChoices,
          explanation: mcq.explanation,
          factoid: mcq.factoid
        })),
        userProgress: []
      });

      await questionBank.save();
    }

    res.status(200).json({ 
      status: 'success', 
      message: 'MCQs imported successfully',
      questionBank 
    });
  } catch (error) {
    console.error('Error importing MCQs:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Keep authentication for getting questions
router.get('/:sourceFile', ensureAuthenticated, async (req, res) => {
  try {
    const sourceFile = decodeURIComponent(req.params.sourceFile);
    console.log('Getting questions for source file:', sourceFile);
    
    // Get the mcqs collection properly
    const mcqs = await db.collection('mcqs')
        .find({ source_file: sourceFile })
        .toArray();
    
    console.log(`Found ${mcqs.length} questions for ${sourceFile}`);
    
    if (!mcqs || mcqs.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Question bank not found'
      });
    }

    res.json({
      status: 'success',
      mcqs: mcqs
    });
  } catch (error) {
    console.error('Error fetching MCQs:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Save user progress
router.post('/save-progress', ensureAuthenticated, async (req, res) => {
  try {
    const { questionId, selectedAnswer, isCorrect } = req.body;
    const userId = req.user.id;

    console.log('Saving progress:', { questionId, selectedAnswer, isCorrect, userId });

    // Find the question bank containing this question
    const questionBank = await QuestionBank.findOne({
      'questions.id': questionId
    });

    if (!questionBank) {
      console.log('Question bank not found for question ID:', questionId);
      return res.status(404).json({ status: 'error', message: 'Question not found' });
    }

    console.log('Found question bank:', questionBank.sourceFile);

    // Find or create user progress
    let userProgress = questionBank.userProgress.find(
      progress => progress.userId.equals(userId)
    );

    console.log('Existing user progress:', userProgress);

    if (!userProgress) {
      userProgress = {
        userId,
        lastQuestionIndex: 0,
        answers: []
      };
      questionBank.userProgress.push(userProgress);
      console.log('Created new user progress');
    } else {
      // Get the index of the existing progress
      const progressIndex = questionBank.userProgress.findIndex(
        progress => progress.userId.equals(userId)
      );
      // Update the existing progress in the array
      questionBank.userProgress[progressIndex] = userProgress;
    }

    // Check if answer already exists
    const existingAnswerIndex = userProgress.answers.findIndex(a => a.questionId === questionId);
    if (existingAnswerIndex !== -1) {
      // Update existing answer
      userProgress.answers[existingAnswerIndex] = {
        questionId,
        selectedAnswer,
        isCorrect,
        timestamp: new Date()
      };
      console.log('Updated existing answer at index:', existingAnswerIndex);
    } else {
      // Add new answer
      userProgress.answers.push({
        questionId,
        selectedAnswer,
        isCorrect,
        timestamp: new Date()
      });
      console.log('Added new answer');
    }

    // Update last question index
    const questionIndex = questionBank.questions.findIndex(q => q.id === questionId);
    if (questionIndex > userProgress.lastQuestionIndex) {
      userProgress.lastQuestionIndex = questionIndex;
    }

    // Mark the userProgress array as modified
    questionBank.markModified('userProgress');
    await questionBank.save();
    console.log('Saved question bank with updated progress');

    res.status(200).json({ 
      status: 'success', 
      message: 'Progress saved',
      userProgress 
    });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router; 
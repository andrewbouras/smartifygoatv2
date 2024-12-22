const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const ensureAuthenticated = require('../middlewares/auth');
const User = require('../models/user');

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
router.post('/import', async (req, res) => {
  try {
    const { sourceFile, questions, clearExisting } = req.body;
    
    // Check if question bank already exists
    let questionBank = await QuestionBank.findOne({ sourceFile });
    
    if (questionBank) {
      if (clearExisting) {
        // Clear existing questions if flag is set
        questionBank.questions = [];
      } else {
        // Append new questions
        questionBank.questions.push(...questions);
      }
      await questionBank.save();
    } else {
      questionBank = new QuestionBank({
        sourceFile,
        title: sourceFile.split('.')[0],
        questions
      });
      await questionBank.save();
    }

    res.status(200).json({ status: 'success', questionBank });
  } catch (error) {
    console.error('Error importing MCQs:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Keep authentication for getting questions
router.get('/:sourceFile', ensureAuthenticated, async (req, res) => {
  try {
    const questionBank = await QuestionBank.findOne({ 
      sourceFile: req.params.sourceFile 
    });
    
    if (!questionBank) {
      return res.status(404).json({ status: 'error', message: 'Question bank not found' });
    }

    res.status(200).json({ 
      status: 'success', 
      mcqs: questionBank.questions 
    });
  } catch (error) {
    console.error('Error fetching MCQs:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router; 
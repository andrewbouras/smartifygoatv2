const mongoose = require('mongoose');

const AnswerChoiceSchema = new mongoose.Schema({
  value: String,
  correct: Boolean,
});

const PermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  level: { type: String, enum: ['admin', 'editor', 'view-only'], default: 'view-only' },
});

const QuestionSchema = new mongoose.Schema({
  question: String,
  answerChoices: [AnswerChoiceSchema],
  explanation: String,
  concept: String,
  createdForUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Null means it's a general question
});

const ChapterSchema = new mongoose.Schema({
  title: String,
  content: String,
  notebook: { type: mongoose.Schema.Types.ObjectId, ref: 'Notebook' },
  permissions: [PermissionSchema],
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  questionType: String, // Store the question type
  questionStyle: String, // Store the question style
  strategicMode: { type: Boolean, default: false }, // Store strategic mode as boolean
  intro_questions: { type: Boolean, default: false }, // Store intro q's as boolean
});


const NotebookSchema = new mongoose.Schema({
  title: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }],
  permissions: [PermissionSchema],
});

const UserResponseChapterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selectedAnswer: String,
  flagged: { type: Boolean, default: false },
  correct: { type: Boolean, default: false }, // Track if the answer was correct
  concept: String, // Add concept field
  consecutiveCorrect: { type: Number, default: 0 } // Track consecutive correct answers
});



module.exports = {
  Notebook: mongoose.model('Notebook', NotebookSchema),
  Chapter: mongoose.model('Chapter', ChapterSchema),
  Question: mongoose.model('Question', QuestionSchema),
  UserResponseChapter: mongoose.model('UserResponseChapter', UserResponseChapterSchema),
};

const mongoose = require('mongoose');

const AnswerChoiceSchema = new mongoose.Schema({
  value: String,
  correct: Boolean,
});

const QuestionSchema = new mongoose.Schema({
  question: String,
  answerChoices: [AnswerChoiceSchema],
  explanation: String,
  factoid: String,
  id: String
});

const UserProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastQuestionIndex: { type: Number, default: 0 },
  answers: [{
    questionId: String,
    selectedAnswer: String,
    isCorrect: Boolean,
    timestamp: { type: Date, default: Date.now }
  }]
});

const QuestionBankSchema = new mongoose.Schema({
  sourceFile: { type: String, required: true, unique: true },
  title: String,
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questions: [QuestionSchema],
  userProgress: [UserProgressSchema],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);

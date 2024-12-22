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

const QuestionBankSchema = new mongoose.Schema({
  sourceFile: { type: String, required: true, unique: true },
  title: String,
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questions: [QuestionSchema],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);

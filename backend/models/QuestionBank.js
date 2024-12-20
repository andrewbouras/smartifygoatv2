const mongoose = require('mongoose');

const AnswerChoiceSchema = new mongoose.Schema({
  value: String,
  correct: Boolean,
});

const QuestionSchema = new mongoose.Schema({
  question: String,
  answerChoices: [AnswerChoiceSchema],
  explanation: String,
});

const QuestionBankSchema = new mongoose.Schema({
  title: String,
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: String,
  urls: String,
  questions: [QuestionSchema],
  visibility: { type: String, enum: ['public', 'private'], default: 'private' },
  paid: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('QuestionBank', QuestionBankSchema);

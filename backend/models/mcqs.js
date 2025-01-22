const mongoose = require('mongoose');

const answerChoiceSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true
  },
  correct: {
    type: Boolean,
    required: true
  }
});

const mcqSchema = new mongoose.Schema({
  source_file: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answerChoices: [answerChoiceSchema],
  explanation: {
    type: String,
    required: true
  },
  factoid: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const MCQ = mongoose.model('MCQ', mcqSchema);

module.exports = { MCQ }; 
const mongoose = require('mongoose');

const IncorrectAnswerSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    mcq_id: {
        type: String,
        required: true
    },
    factoid: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { collection: 'incorrect_answers_v2' });

const IncorrectAnswer = mongoose.model('IncorrectAnswer', IncorrectAnswerSchema);

module.exports = { IncorrectAnswer };
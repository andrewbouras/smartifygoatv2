// controllers/mcqController.js
const { Note } = require('../models/note');
const { MCQ } = require('../models/mcq');
const { openaiClient } = require('../utils/openaiUtils');

// Controller to retrieve MCQs for a note
exports.getMCQsForNote = async (req, res) => {
    const noteId = req.params.id;
    try {
        const mcqs = await MCQ.find({ noteId: noteId });
        if (!mcqs.length) {
            return res.status(404).json({ message: 'No MCQs found for this note' });
        }
        res.status(200).json({ mcqs });
    } catch (error) {
        console.error('Error retrieving MCQs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Controller to save user responses to MCQs
exports.saveMCQResponses = async (req, res) => {
    const noteId = req.params.id;
    const { responses } = req.body; // Expected format: [{ questionId, answer, isCorrect }]

    try {
        const note = await Note.findById(noteId);
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        // Assuming a structure where each MCQ in MCQBANK can store user responses
        responses.forEach(response => {
            const question = note.MCQBANK.find(q => q.questionId === response.questionId);
            if (question) {
                question.responses = question.responses || [];
                question.responses.push({ userId: req.user._id, answer: response.answer, isCorrect: response.isCorrect });
            }
        });

        await note.save();
        res.status(200).json({ message: 'Responses saved successfully' });
    } catch (error) {
        console.error('Error saving MCQ responses:', error.message, error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
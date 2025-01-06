// NoteController.js - Handles all note-related operations

const Note = require('../models/note');
const User = require('../models/user'); // Ensure User model is imported to handle user-specific operations
const MCQ = require('../models/mcq'); // Import the MCQ model to handle MCQ operations linked to notes
const { generateMCQs } = require('../utils/openaiUtils');

// Create a new note
exports.createNote = async (req, res) => {
  try {
    if (!req.body.content || !req.body.title) {
      return res.status(400).json({ status: 'error', message: 'Content and title are required' });
    }

    const note = new Note({
      title: req.body.title,
      content: req.body.content,
      user: req.user.id
    });

    const newNote = await note.save();
    console.log(`New note created with id: ${newNote._id}`);
    res.status(201).json({ status: 'success', note: newNote });
  } catch (err) {
    console.error(`Error creating new note: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get all notes for a user
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id });
    console.log(`Fetched ${notes.length} notes for user id: ${req.user.id}`);
    res.status(200).json({ status: 'success', notes: notes });
  } catch (err) {
    console.error(`Error fetching notes for user id: ${req.user.id}, Error: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get a specific note
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      console.error(`Note with id: ${req.params.id} not found for user id: ${req.user.id}`);
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }
    console.log(`Fetched note with id: ${req.params.id} for user id: ${req.user.id}`);
    res.status(200).json({ status: 'success', note: note });
  } catch (err) {
    console.error(`Error fetching note with id: ${req.params.id} for user id: ${req.user.id}, Error: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update a specific note
exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { title: req.body.title, content: req.body.content },
      { new: true }
    );
    if (!note) {
      console.error(`Note with id: ${req.params.id} not found for user id: ${req.user.id}`);
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }
    console.log(`Updated note with id: ${req.params.id} for user id: ${req.user.id}`);
    res.status(200).json({ status: 'success', note: note });
  } catch (err) {
    console.error(`Error updating note with id: ${req.params.id} for user id: ${req.user.id}, Error: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Add a shared note to a user's library
exports.addSharedNoteToLibrary = async (req, res) => {
  try {
    const { shareToken } = req.body;
    const note = await Note.findOne({ 'sharedNotes.token': shareToken });
    if (!note) {
      console.error(`Shared note with token: ${shareToken} not found`);
      return res.status(404).json({ status: 'error', message: 'Shared note not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      console.error(`User with id: ${req.user.id} not found`);
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (!user.notes) {
      user.notes = [];
    }
    user.notes.push(note._id);
    await user.save();
    console.log(`Added shared note with id: ${note._id} to user id: ${req.user.id}`);
    res.status(200).json({ status: 'success', message: 'Shared note added to your library' });
  } catch (err) {
    console.error(`Error adding shared note to library: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Create a new MCQ linked to a note
exports.createMCQ = async (req, res) => {
  try {
    const { noteId, question, options } = req.body;
    if (!noteId || !question || !options) {
      return res.status(400).json({ status: 'error', message: 'Note ID, question, and options are required' });
    }

    const mcq = new MCQ({
      noteId,
      question,
      options
    });

    const newMCQ = await mcq.save();
    console.log(`New MCQ created with id: ${newMCQ._id} linked to note id: ${noteId}`);
    res.status(201).json({ status: 'success', mcq: newMCQ });
  } catch (err) {
    console.error(`Error creating new MCQ: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Generate MCQs for a specific note
exports.generateMCQsForNote = async (req, res) => {
  try {
    const noteId = req.params.noteId;
    const note = await Note.findById(noteId);
    if (!note) {
      console.error(`Note with id: ${noteId} not found`);
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    const mcqs = await generateMCQs(note.content);
    console.log(`Generated MCQs for note id: ${noteId}`);
    res.status(200).json({ status: 'success', mcqs });
  } catch (err) {
    console.error(`Error generating MCQs for note id: ${noteId}, Error: ${err.message}`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
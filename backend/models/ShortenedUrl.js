const mongoose = require('mongoose');

const ShortenedUrlSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  originalUrl: { type: String, required: true },
  accessType: { type: String, enum: ['admin', 'editor', 'view-only'], required: true }
});

module.exports = mongoose.model('ShortenedUrl', ShortenedUrlSchema);

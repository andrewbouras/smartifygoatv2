const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  line2: { type: String, required: false },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postal_code: { type: String, required: true },
  country: { type: String, required: true, default: 'US' }, // Assuming 'US' as default
});

const IncorrectAnswerSchema = new mongoose.Schema({
  mcq_id: String,
  factoid: String,
  timestamp: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  image: {
    type: String,
    required: false,
    unique: false,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  plan: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
  },
  subscriptionEndDate: {
    type: Date,
    required: false,
  },
  questionsGeneratedThisMonth: {
    type: Number,
    default: 0,
  },
  stripeCustomerId: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  address: AddressSchema,  // Embed the address schema here
  cardBrand: {
    type: String,
    required: false,
  },
  cardLast4: {
    type: String,
    required: false,
  },
  incorrectAnswers: [IncorrectAnswerSchema]  // Add array of incorrect answers
}, { collection: 'users' });

module.exports = mongoose.model('User', UserSchema);

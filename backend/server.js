const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { setupGoogleStrategy } = require('./config/googleStrategy'); // Import Google strategy setup
const bodyParser = require('body-parser'); // Import body-parser
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cookieParser = require('cookie-parser');
const path = require('path');
const { IncorrectAnswer } = require('./models/incorrectAnswer');
const jwt = require('jsonwebtoken');
const ensureAuthenticated = require('./middlewares/auth');
const QuestionBank = require('./models/QuestionBank');

const app = express();
const server = http.createServer(app);
// app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
//   const sig = req.headers['stripe-signature'];

//   let event;

//   try {
//       event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//       console.error('⚠️  Webhook signature verification failed:', err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the event
//   switch (event.type) {
//     // Event when the payment intent succeeded
//     case 'payment_intent.succeeded':
//       console.log('Payment intent succeeded!');
//       console.log(event.data);
//       break;


//     //Event when the subscription started
//     case 'checkout.session.completed':
//       console.log('New Subscription started!')
//       console.log(event.data)
//       break;

//     // Event when the payment is successfull (every subscription interval)  
//     case 'invoice.paid':
//       console.log('Invoice paid')
//       console.log(event.data)
//       break;

//     // Event when the payment failed due to card problems or insufficient funds (every subscription interval)  
//     case 'invoice.payment_failed':  
//       console.log('Invoice payment failed!')
//       console.log(event.data)
//       break;

//     // Event when subscription is updated  
//     case 'customer.subscription.updated':
//       console.log('Subscription updated!')
//       console.log(event.data)
//       break

//     default:
//       console.log(`Unhandled event type ${event.type}`);
//   }

//   res.send();
// });
 
const webhookRoutes = require('./routes/webhookRoutes');
app.use('/api/webhook', webhookRoutes);

// Middleware to log payload size
// Middleware to log payload size using the content-length header
app.use((req, res, next) => {
  const payloadSize = req.headers['content-length'];
  if (payloadSize) {
    console.log(`Payload size: ${payloadSize} bytes`);
  }
  next();
});
// Middleware
app.use(express.json({ limit: '700mb' })); // Set a higher limit if needed
app.use(express.urlencoded({ limit: '700mb', extended: true })); // Set a higher limit if needed

// Body Parser Middleware
app.use(bodyParser.json({ limit: '700mb' }));
app.use(bodyParser.urlencoded({ limit: '700mb', extended: true }));



// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  },
  name: 'sessionId'
}));
app.use(passport.initialize());
app.use(passport.session());

// If in production, ensure secure cookies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // trust first proxy
}

// Add this after your other middleware configurations
app.use((req, res, next) => {
  res.cookie('TESTCOOKIESENABLED', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
  next();
});

// Add this middleware to log session and cookie information
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('Cookies:', req.cookies);
  next();
});

// Middleware to prevent caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

try {
    setupGoogleStrategy(passport); // Initialize Google OAuth strategy
    console.log("Google OAuth strategy initialized successfully.");
} catch (error) {
    console.error('Error initializing Google OAuth strategy:', error.message, error.stack);
    process.exit(1);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connection established');
    console.log('Connected to database:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('Please check your MONGODB_URI in .env file');
    process.exit(1);
  });

// Routes
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/notebookRoutes')); // Add notebook routes
app.use('/verify', require('./routes/authRoutes'));
// app.use('/api', require('./routes/noteRoutes'));
// app.use('/api', require('./routes/notebookroutes'));
// app.use('/api', require('./routes/notebookshare'));
app.use('/api/auth', require('./routes/sessionRoutes')); // Added session routes
// app.use('/api', require('./routes/mcqRoutes'));
// app.use('/api', require('./routes/similar'));
// app.use('/api', require('./routes/upload'));
// app.use('/api', require('./routes/questionBank'));
// app.use('/api', require('./routes/enrolledbank'));
// app.use('/api', require('./routes/userAgent'));
// app.use('/api', require('./routes/upgradeplans'));

// const enrollRoutes = require('./routes/enroll');
// app.use('/api', enrollRoutes);

// Debug middleware for tracking requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    url: req.url,
    method: req.method,
    headers: {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      credentials: req.headers.credentials
    }
  });
  next();
});

// Add static file serving for the python directory
app.use('/mcq', express.static(path.join(__dirname, '../python')));

// Add this before your other routes
app.post('/log_incorrect', async (req, res) => {
  try {
    const { mcq_id, factoid } = req.body;
    
    // Debug logging
    console.log('Request cookies:', req.cookies);
    console.log('JWT token:', req.cookies.jwt);
    
    // Get JWT token from cookies
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'No authentication token' });
    }

    // Debug logging
    console.log('Token before verification:', token);
    
    // Decode token to get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    const userId = decoded.id;
    console.log('User ID:', userId);

    const incorrectAnswer = new IncorrectAnswer({
      userId,
      mcq_id,
      factoid,
      timestamp: new Date()
    });

    await incorrectAnswer.save();
    console.log('Incorrect answer saved:', incorrectAnswer);
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error logging incorrect answer:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Add this route before your other routes
app.get('/api/incorrect-answers', ensureAuthenticated, async (req, res) => {
    try {
        // User ID comes from the ensureAuthenticated middleware
        const userId = req.user.id;
        console.log('Fetching incorrect answers for user:', userId);

        const incorrectAnswers = await IncorrectAnswer.find({ userId })
            .sort({ timestamp: -1 });

        console.log('Found incorrect answers:', incorrectAnswers.length);
        res.json({ incorrectAnswers });
    } catch (error) {
        console.error('Error fetching incorrect answers:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add this route to serve static HTML files for MCQs
app.get('/mcq/:page', (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, '../python/', page));
});

// Add this test route
app.get('/api/questionbank/test', async (req, res) => {
  try {
    const testBank = await QuestionBank.findOne();
    res.json({ 
      status: 'success',
      message: 'Database connection working',
      questionBankCount: await QuestionBank.countDocuments(),
      sampleBank: testBank 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

const questionBankRoutes = require('./routes/questionBankRoutes');
app.use('/api/questionbank', questionBankRoutes);

module.exports = { app };

// Start server
// const PORT = process.env.PORT || 3000; 
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// Set the server timeout to 5 minutes
server.timeout = 300000; // 300000 ms = 5 minutes





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
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'Accept',
    'Accept-Language',
    'Origin',
    'User-Agent',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Site',
    'Sec-Fetch-Dest',
    'Priority',
    'stripe-signature'
  ],
  credentials: true,
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    domain: 'localhost',
    path: '/'
  },
  name: 'sessionId'
}));
app.use(passport.initialize());
app.use(passport.session());

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


module.exports = { app };

// Start server
// const PORT = process.env.PORT || 3000; 
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// Set the server timeout to 5 minutes
server.timeout = 300000; // 300000 ms = 5 minutes





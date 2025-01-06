const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user');
const { sendSubscriptionEmail } = require('./emailController');
const axios = require('axios');
const QuestionBank = require('../models/QuestionBank');

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Received Stripe event:', event);  // Log the full event data for debugging
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event);
      break;
    case 'billing_portal.session.created':
      break;
    case 'charge.succeeded':
      console.log("Charge succeeded event received");
      break;
    case 'payment_intent.succeeded':
      console.log("Payment intent succeeded event received");
      break;
    case 'payment_intent.created':
      console.log("Payment intent created event received");
      break;
    case 'charge.updated':
      console.log("Charge updated event received");
      break;
    case 'payment_intent.succeeded':
      console.log("Payment intent succeeded event received");
      await sendPaymentSucceededEmail(event.data.object);  // Add this line
    break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send({ received: true });
};

const handleSubscriptionCreated = async (event) => {
  const session = event.data.object;
  const user = await User.findOne({ stripeCustomerId: session.customer });

  if (user) {
    user.plan = 'premium';
    await user.save();
    await sendSubscriptionEmail(user.email, 'Thank you for your subscription!', 'Thank you for being a premium customer!');
  }
};



// Function to send email on payment intent succeeded
const sendPaymentSucceededEmail = async (paymentIntent) => {
  const receiptEmail = paymentIntent.receipt_email;

  if (receiptEmail) {
    await sendSubscriptionEmail(receiptEmail, 'Your Payment Receipt', `Your payment was successful. You can view your receipt at this link: ${paymentIntent.charges.data[0].receipt_url}`);
  }
};



const handleSubscriptionDeleted = async (event) => {
  const subscription = event.data.object;
  const user = await User.findOne({ stripeCustomerId: subscription.customer });

  if (user) {
    const endDate = new Date(subscription.current_period_end * 1000);
    console.log(`Subscription will cancel on ${endDate}. User will be downgraded at that time.`);

    user.plan = 'premium';
    user.subscriptionEndDate = endDate;
    await user.save();

    await sendSubscriptionEmail(user.email, 'We’re sad to see you go!', 'Could you tell us why you unsubscribed?');

    setTimeout(async () => {
      user.plan = 'free';
      await user.save();
      console.log(`User ${user.email} downgraded to free plan on ${endDate}`);
    }, endDate.getTime() - Date.now());
  }
};

const handleSubscriptionUpdated = async (event) => {
  const subscription = event.data.object;
  const user = await User.findOne({ stripeCustomerId: subscription.customer });

  if (user) {
    console.log('Subscription updated:', subscription);

    user.plan = subscription.status === 'active' ? 'premium' : 'free';
    user.subscriptionEndDate = new Date(subscription.current_period_end * 1000);

    await user.save();

    if (subscription.cancel_at_period_end) {
      await sendSubscriptionEmail(user.email, 'We noticed you canceled', 'We noticed you canceled your subscription. Could you let us know why?');
    }
  }
};

const handlePaymentFailure = async (event) => {
  const invoice = event.data.object;
  const user = await User.findOne({ stripeCustomerId: invoice.customer });

  if (user) {
    user.plan = 'free';
    await user.save();
    console.log('Payment failed, user downgraded to free plan.');
  }
};

const handleCheckoutSessionCompleted = async (event) => {
  const session = event.data.object;
  const user = await User.findOne({ stripeCustomerId: session.customer });

  if (!user) {
    console.error(`User with Stripe ID ${session.customer} not found`);
    return;
  }

  try {
    const questionBankSlug = session.metadata.urlSlug;  // Access the slug from metadata
    const questionBank = await QuestionBank.findOne({ urls: questionBankSlug });

    // Check if questionBank exists
    if (!questionBank) {
      console.error(`Question bank with slug ${questionBankSlug} not found`);
      return;
    }

    if (!questionBank.enrolledUsers.includes(user._id)) {
      questionBank.enrolledUsers.push(user._id);
      await questionBank.save();


      await sendSubscriptionEmail(user.email, 'Invoice for your purchase', `Thank you for purchasing ${questionBank.title}. Your invoice is attached.`);

      await sendSubscriptionEmail(user.email, 'Thank you for your purchase!', `You have successfully enrolled in ${questionBank.title}. If you have any questions, feel free to reach out.`);

      console.log(`User ${user.email} enrolled in ${questionBank.title}`);
    } else {
      console.log(`User ${user.email} is already enrolled in ${questionBank.title}`);
    }
  } catch (error) {
    console.error(`Error enrolling user ${user.email}:`, error);
  }
};

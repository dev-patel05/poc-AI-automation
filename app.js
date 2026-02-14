require('dotenv').config();
const express = require('express');
const Sentry = require('@sentry/node');

const app = express();

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE', // Provide a default or placeholder DSN
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Sentry RequestHandler creates a separate execution context, so that all Sentry.Handlers can run in a clean context
app.use(Sentry.Handlers.requestHandler());
// Sentry TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(express.json());

// Fixed Error 1: Null reference error - check for null before accessing properties
app.get('/api/user/:id', (req, res, next) => {
  const user = null; // Simulating database returning null
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // This part would only be reached if user was not null
  res.json({ name: user.name, id: req.params.id });
});

// Fixed Error 2: Division by zero - validate divisor from query parameters
app.get('/api/calculate', (req, res, next) => {
  const dividend = parseInt(req.query.dividend || '100', 10);
  const divisor = parseInt(req.query.divisor, 10);

  if (isNaN(divisor) || divisor === 0) {
    const error = new Error('Invalid or zero divisor provided. Please use /api/calculate?divisor=X');
    error.statusCode = 400; // Bad Request
    return next(error);
  }
  const result = dividend / divisor;
  res.json({ result });
});

// Fixed Error 3: Undefined variable - removed problematic line
app.get('/api/data', (req, res) => {
  // console.log(undefinedVariable); // Removed the ReferenceError
  res.json({ data: 'test' });
});

// Fixed Error 4: Async error - use try-catch to pass to error middleware
app.get('/api/async-error', async (req, res, next) => {
  try {
    // Simulate an async operation that fails after a short delay
    await new Promise((resolve, reject) => setTimeout(() => reject(new Error('Async operation failed')), 100));
    res.json({ success: true }); // This line will not be reached due to the rejection
  } catch (err) {
    next(err); // Pass the error to the error handling middleware
  }
});

// Sentry error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all errors, or filter based on status code, etc.
    return true;
  },
}));

// Custom error handling middleware
app.use((err, req, res, next) => {
  console.error('Error caught by custom handler:', err.message, err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred',
    // Optionally, only include stack in development environment for security
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 3000;
// Only start the server if the file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Test app running on port ${PORT}`);
  });
}

module.exports = app; // Export the app instance for testing purposes

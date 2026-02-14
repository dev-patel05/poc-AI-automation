require('dotenv').config();
const express = require('express');
const Sentry = require('@sentry/node');

const app = express();

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 1.0,
});

// Sentry request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(express.json());

// Fixed Error 1: Null reference error
app.get('/api/user/:id', (req, res, next) => {
  const user = null; // Simulating database returning null
  if (!user) {
    // Return a 404 Not Found for a non-existent user
    return res.status(404).json({ error: 'User not found' });
  }
  // This part would only be reached if user was not null
  res.json({ name: user.name, id: req.params.id });
});

// Fixed Error 2: Division by zero
app.get('/api/calculate', (req, res, next) => {
  try {
    const divisor = parseInt(req.query.divisor); // Get divisor from query parameter

    if (isNaN(divisor)) {
      return res.status(400).json({ error: 'Divisor must be a number' });
    }
    if (divisor === 0) {
      // Return a specific error for bad input (division by zero)
      return res.status(400).json({ error: 'Divisor cannot be zero' });
    }
    const result = 100 / divisor;
    res.json({ result });
  } catch (error) {
    // Catch any unexpected errors and pass to the global handler
    next(error);
  }
});

// Fixed Error 3: Undefined variable
app.get('/api/data', (req, res, next) => {
  try {
    // The original 'undefinedVariable' would cause a ReferenceError.
    // To fix, we declare the variable or remove the problematic line.
    const definedVariable = 'This is defined data';
    console.log(definedVariable);
    res.json({ data: definedVariable });
  } catch (error) {
    next(error); // Pass any unexpected errors to the global handler
  }
});

// Fixed Error 4: Async error
app.get('/api/async-error', async (req, res, next) => {
  try {
    // Simulate an async operation that fails
    await Promise.reject(new Error('Async operation failed'));
    // This line will not be reached if the promise rejects
    res.json({ success: true });
  } catch (error) {
    // Explicitly pass the error to the global error handler
    next(error);
  }
});

// Sentry error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());

// The default error handler
app.use((err, req, res, next) => {
  console.error('Caught by global error handler:', err.message);
  // Sentry has already handled the error, now send a user-friendly response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred',
    // Optionally, hide internal error details in production
    // message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Test app running on port ${PORT}`);
});
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

// New route to trigger various non-Error objects being passed to next()
app.get('/api/trigger-non-error', (req, res, next) => {
  const errorType = req.query.type;
  if (errorType === 'string') {
    next('This is a custom string error message!');
  } else if (errorType === 'null') {
    next(null); // Pass null to the error handler
  } else if (errorType === 'object') {
    next({ customProperty: 'Some value', another: 123 }); // Pass a plain object
  } else {
    next(new Error('Default error for trigger-non-error'));
  }
});

// Sentry error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());

// The default error handler
app.use((err, req, res, next) => {
  // Ensure 'err' is an Error object for consistent handling.
  // If err is null/undefined, String(err) becomes 'null'/'undefined'.
  // If err is a string, it becomes the error message.
  // If err is a plain object, it tries to use its toString() or message.
  const error = err instanceof Error ? err : new Error(String(err));

  // Refine the error message for specific non-Error cases.
  let errorMessage = error.message;
  if (err === null || err === undefined || errorMessage === 'null' || errorMessage === 'undefined') {
    errorMessage = 'An unknown error occurred';
  } else if (typeof err === 'object' && !err.message) {
    // If it's an object without a 'message' property, try to stringify it or use a default.
    try {
      errorMessage = JSON.stringify(err);
    } catch (e) {
      errorMessage = 'An unknown object error occurred';
    }
  }

  console.error('Caught by global error handler:', errorMessage);

  // Safely get the status code from the original error if it's an object, otherwise default to 500.
  const statusCode = (err && typeof err === 'object' && err.statusCode) ? err.statusCode : 500;

  res.status(statusCode).json({
    error: errorMessage,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Test app running on port ${PORT}`);
});

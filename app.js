require('dotenv').config();
const express = require('express');
const Sentry = require('@sentry/node');

const app = express();

// Initialize Sentry (we'll add DSN later)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 1.0,
});

app.use(express.json());

// Intentional Error 1: Null reference error
app.get('/api/user/:id', (req, res) => {
  const user = null; // Simulating database returning null
  // This will throw: Cannot read property 'name' of null
  res.json({ name: user.name, id: req.params.id });
});

// Intentional Error 2: Division by zero
app.get('/api/calculate', (req, res) => {
  const result = 100 / 0; // Infinity - not ideal
  if (!isFinite(result)) {
    throw new Error('Division by zero detected');
  }
  res.json({ result });
});

// Intentional Error 3: Undefined variable
app.get('/api/data', (req, res) => {
  console.log(undefinedVariable); // ReferenceError
  res.json({ data: 'test' });
});

// Intentional Error 4: Async error
app.get('/api/async-error', async (req, res) => {
  await Promise.reject(new Error('Async operation failed'));
  res.json({ success: true });
});

// Error handler
app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Test app running on port ${PORT}`);
});
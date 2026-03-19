const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const recommendRouter = require('./routes/recommend');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Logs every incoming request with its method, path, and timestamp.
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} -- ${new Date().toISOString()}`);
  next();
});

app.use('/recommend', recommendRouter);

// Returns a simple health check response to verify the server is running.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serves the frontend static files so the app loads in a browser at the root URL.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Only start listening when run directly, not when imported by tests.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MovieRecs backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;

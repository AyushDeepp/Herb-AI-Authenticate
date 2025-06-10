require('dotenv').config();
const express = require('express');
const cors = require('cors');
const plantsRouter = require('./routes/plants');
const diseasesRouter = require('./routes/diseases');

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/plants', plantsRouter);
app.use('/api/diseases', diseasesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Validate environment variables
const requiredEnvVars = ['GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Log environment variable status (without exposing full keys)
console.log('Environment variables loaded:', {
  PORT,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 
    `${process.env.GEMINI_API_KEY.slice(0, 4)}...${process.env.GEMINI_API_KEY.slice(-4)}` : 'Not set'
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
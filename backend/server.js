require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const plantsRoutes = require('./routes/plants');
const diseasesRoutes = require('./routes/diseases');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Wrong file type');
      error.code = 'LIMIT_FILE_TYPES';
      return cb(error, false);
    }
    cb(null, true);
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files from the uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantsRoutes);
app.use('/api/diseases', diseasesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_TYPES') {
    res.status(422).json({ error: 'Only images are allowed' });
    return;
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(422).json({ error: 'File too large. Max size is 10MB' });
    return;
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
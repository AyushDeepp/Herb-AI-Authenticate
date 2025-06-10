const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  scientificName: {
    type: String,
    required: true
  },
  affectedPlants: [{
    type: String,
    required: true
  }],
  symptoms: [{
    description: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    }
  }],
  causes: [{
    type: String,
    required: true
  }],
  affectedParts: [{
    type: String,
    enum: ['leaves', 'stem', 'roots', 'flowers', 'fruits', 'whole plant']
  }],
  treatment: {
    chemical: [{
      method: String,
      products: [String],
      instructions: String
    }],
    biological: [{
      method: String,
      instructions: String
    }],
    cultural: [{
      method: String,
      instructions: String
    }],
    preventive: [{
      method: String,
      instructions: String
    }]
  },
  images: [{
    url: String,
    caption: String
  }],
  spreadMechanism: {
    type: String,
    required: true
  },
  environmentalConditions: {
    temperature: String,
    humidity: String,
    other: String
  },
  seasonalPrevalence: [{
    season: String,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }]
}, {
  timestamps: true
});

// Create indexes for search functionality
diseaseSchema.index({ 
  name: 'text', 
  scientificName: 'text', 
  'symptoms.description': 'text' 
});

module.exports = mongoose.model('Disease', diseaseSchema);
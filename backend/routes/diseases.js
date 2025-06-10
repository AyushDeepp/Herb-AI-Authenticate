const express = require('express');
const Disease = require('../models/Disease');
const auth = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Get comprehensive disease information from Gemini
router.post('/gemini', async (req, res) => {
  try {
    const { diseaseName } = req.body;

    if (!diseaseName) {
      return res.status(400).json({ message: 'Disease name is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API not configured. Please set GEMINI_API_KEY environment variable.' });
    }

    const prompt = `Provide comprehensive information about the plant disease "${diseaseName}" in the following JSON format. Please ensure all information is accurate and scientifically sound:

    {
      "diseaseName": "${diseaseName}",
      "scientificName": "string (if applicable)",
      "commonNames": ["array of alternate names"],
      "overview": "comprehensive description of the disease",
      "symptoms": ["detailed array of symptoms"],
      "causes": ["array of causative agents and factors"],
      "affectedPlants": ["array of commonly affected plant species"],
      "affectedParts": ["array of plant parts commonly affected"],
      "environmentalConditions": {
        "temperature": "optimal temperature range for disease development",
        "humidity": "humidity requirements",
        "moisture": "moisture conditions",
        "season": "seasons when disease is most prevalent"
      },
      "spreadMechanism": "detailed explanation of how the disease spreads",
      "treatment": {
        "chemical": ["array of chemical treatment options"],
        "biological": ["array of biological control methods"],
        "cultural": ["array of cultural management practices"],
        "organic": ["array of organic treatment options"]
      },
      "prevention": ["array of preventive measures"],
      "lifecycle": "detailed lifecycle of the pathogen",
      "economicImpact": "impact on agriculture and economy",
      "diagnosticMethods": ["methods to identify the disease"],
      "differentialDiagnosis": ["similar diseases to distinguish from"],
      "additionalInformation": ["array of additional relevant facts"]
    }

    Please provide accurate, detailed, and practical information. If information is not available for a specific field, use an empty array [] or empty string "" but do not use "Information not available".`;

    console.log(`Making request to Gemini API for disease: ${diseaseName}`);
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    console.log('Successfully received Gemini response');
    const geminiText = response.data.candidates[0].content.parts[0].text;
    console.log('Raw Gemini response:', geminiText.substring(0, 500) + '...');
    
    // Parse JSON from Gemini response
    const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }
    
    const diseaseData = JSON.parse(jsonMatch[0]);
    console.log('Parsed disease data keys:', Object.keys(diseaseData));
    res.json(diseaseData);

  } catch (error) {
    console.error('Gemini API error:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
      return res.status(error.response.status).json({
        message: 'Error from Gemini API',
        error: error.response.data
      });
    }
    res.status(500).json({ 
      message: 'Error fetching disease information from Gemini',
      details: error.message
    });
  }
});

// Search diseases
router.get('/search', auth, async (req, res) => {
  try {
    const { query, plant, symptom } = req.query;
    let searchQuery = {};

    if (query) {
      searchQuery = { $text: { $search: query } };
    } else if (plant) {
      searchQuery = { affectedPlants: { $regex: plant, $options: 'i' } };
    } else if (symptom) {
      searchQuery = { 'symptoms.description': { $regex: symptom, $options: 'i' } };
    } else {
      return res.status(400).json({ message: 'Search parameters required' });
    }

    const diseases = await Disease.find(searchQuery)
      .limit(10);

    res.json(diseases);
  } catch (error) {
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// Get disease details
router.get('/:id', auth, async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id);
    if (!disease) {
      return res.status(404).json({ message: 'Disease not found' });
    }
    res.json(disease);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching disease details', error: error.message });
  }
});

// Get diseases by plant
router.get('/plant/:plantName', auth, async (req, res) => {
  try {
    const diseases = await Disease.find({
      affectedPlants: { $regex: req.params.plantName, $options: 'i' }
    });
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plant diseases', error: error.message });
  }
});

// Get diseases by affected part
router.get('/affected-part/:part', auth, async (req, res) => {
  try {
    const diseases = await Disease.find({
      affectedParts: req.params.part
    });
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diseases by affected part', error: error.message });
  }
});

// Get diseases by severity
router.get('/severity/:level', auth, async (req, res) => {
  try {
    const diseases = await Disease.find({
      'symptoms.severity': req.params.level
    });
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diseases by severity', error: error.message });
  }
});

// Get seasonal disease risks
router.get('/seasonal/:season', auth, async (req, res) => {
  try {
    const diseases = await Disease.find({
      'seasonalPrevalence.season': req.params.season
    }).sort({
      'seasonalPrevalence.riskLevel': -1
    });
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seasonal diseases', error: error.message });
  }
});

module.exports = router;
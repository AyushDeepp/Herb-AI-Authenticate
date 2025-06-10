const express = require('express');
const multer = require('multer');
const axios = require('axios');
const Plant = require('../models/Plant');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Identify plant from image
router.post('/identify', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Received identification request');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'Please upload an image' });
    }

    if (!process.env.PLANT_API_KEY) {
      console.error('PLANT_API_KEY is not set');
      return res.status(500).json({ message: 'Plant identification service is not configured' });
    }

    // Convert image to base64
    const base64Image = req.file.buffer.toString('base64');
    console.log('Image converted to base64');

    // Call Plant.id API
    console.log('Calling Plant.id API...');
    const response = await axios.post('https://api.plant.id/v2/identify', {
      images: [base64Image],
      modifiers: ['crops_fast', 'similar_images'],
      plant_language: 'en',
      plant_details: [
        'common_names',
        'url',
        'description',
        'taxonomy',
        'rank',
        'gbif_id',
        'wiki_description',
        'wiki_image',
        'synonyms',
        'edible_parts',
        'propagation_methods',
        'watering',
        'sunlight',
        'soil',
        'growth_rate',
        'maintenance',
        'drought_tolerance',
        'salt_tolerance',
        'frost_tolerance',
        'ph_minimum',
        'ph_maximum',
        'plant_habit',
        'life_cycle',
        'attracts',
        'resistant_to',
        'pest_susceptibility',
        'poisonous_to_humans',
        'poisonous_to_pets',
        'invasive',
        'rare',
        'endangered',
        'conservation_status',
        'medicinal_uses',
        'culinary_uses',
        'industrial_uses',
        'cultural_significance',
        'native_range',
        'distribution',
        'habitat',
        'climate',
        'hardiness_zone',
        'bloom_time',
        'flower_color',
        'fruit_color',
        'leaf_color',
        'leaf_shape',
        'leaf_size',
        'stem_color',
        'stem_type',
        'root_type',
        'seed_type',
        'seed_dispersal',
        'pollination',
        'reproduction',
        'lifespan',
        'growth_habit',
        'growth_rate',
        'height',
        'spread',
        'diameter',
        'bark_color',
        'bark_texture',
        'wood_type',
        'wood_uses',
        'leaf_retention',
        'leaf_type',
        'leaf_arrangement',
        'leaf_margin',
        'leaf_venation',
        'leaf_surface',
        'leaf_attachment',
        'leaf_duration',
        'leaf_phyllotaxy',
        'leaf_composition',
        'leaf_division',
        'leaf_apex',
        'leaf_base',
        'leaf_orientation',
        'leaf_veins',
        'leaf_vein_type',
        'leaf_vein_pattern',
        'leaf_vein_color',
        'leaf_vein_prominence',
        'leaf_vein_density',
        'leaf_vein_angle',
        'leaf_vein_branching',
        'leaf_vein_termination',
        'leaf_vein_anastomosis',
        'leaf_vein_loops',
        'leaf_vein_areoles',
        'leaf_vein_areole_shape',
        'leaf_vein_areole_size',
        'leaf_vein_areole_density',
        'leaf_vein_areole_orientation',
        'leaf_vein_areole_pattern',
        'leaf_vein_areole_color',
        'leaf_vein_areole_prominence',
        'leaf_vein_areole_branching',
        'leaf_vein_areole_termination',
        'leaf_vein_areole_anastomosis',
        'leaf_vein_areole_loops',
        'leaf_vein_areole_areoles'
      ]
    }, {
      headers: {
        'Api-Key': process.env.PLANT_API_KEY
      }
    });

    console.log('Plant.id API response received:', JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.suggestions) {
      console.error('Invalid response from Plant.id API:', response.data);
      return res.status(500).json({ message: 'Invalid response from plant identification service' });
    }

    // Process and format the response data
    const processedData = {
      ...response.data,
      suggestions: response.data.suggestions.map(suggestion => ({
        ...suggestion,
        plant_details: suggestion.plant_details ? {
          ...suggestion.plant_details,
          // Ensure all fields are properly formatted
          description: suggestion.plant_details.description?.value || suggestion.plant_details.description,
          wiki_description: suggestion.plant_details.wiki_description?.value || suggestion.plant_details.wiki_description,
          common_names: Array.isArray(suggestion.plant_details.common_names) 
            ? suggestion.plant_details.common_names 
            : suggestion.plant_details.common_names?.value || suggestion.plant_details.common_names,
          taxonomy: Object.fromEntries(
            Object.entries(suggestion.plant_details.taxonomy || {}).map(([key, value]) => [
              key,
              typeof value === 'object' ? value.value : value
            ])
          )
        } : null
      }))
    };

    // Save to user's identification history
    if (processedData.suggestions && processedData.suggestions.length > 0) {
      const plantInfo = processedData.suggestions[0];
      req.user.identificationHistory.push({
        plantName: plantInfo.plant_name,
        scientificName: plantInfo.scientific_name,
        imageUrl: processedData.images[0].url,
        identifiedAt: new Date(),
        confidence: plantInfo.probability
      });
      await req.user.save();
      console.log('Saved to user history');
    }

    res.json(processedData);
  } catch (error) {
    console.error('Error in plant identification:', error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Plant.id API error response:', error.response.data);
      res.status(500).json({ 
        message: 'Plant identification failed', 
        error: error.response.data.message || error.message 
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from Plant.id API:', error.request);
      res.status(500).json({ 
        message: 'Plant identification service is not responding', 
        error: error.message 
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request to Plant.id API:', error.message);
      res.status(500).json({ 
        message: 'Failed to process plant identification request', 
        error: error.message 
      });
    }
  }
});

// Search plants
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const plants = await Plant.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10);

    res.json(plants);
  } catch (error) {
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// Get plant details
router.get('/:id', async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }
    res.json(plant);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plant details', error: error.message });
  }
});

// Add plant to favorites
router.post('/favorites/:plantId', auth, async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.plantId);
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found' });
    }

    // Check if already in favorites
    const alreadyFavorited = req.user.favorites.some(
      fav => fav.plantId.toString() === req.params.plantId
    );

    if (alreadyFavorited) {
      return res.status(400).json({ message: 'Plant already in favorites' });
    }

    req.user.favorites.push({
      plantId: plant._id,
      plantName: plant.commonName
    });

    await req.user.save();
    res.json({ message: 'Plant added to favorites', favorites: req.user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to favorites', error: error.message });
  }
});

// Remove plant from favorites
router.delete('/favorites/:plantId', auth, async (req, res) => {
  try {
    req.user.favorites = req.user.favorites.filter(
      fav => fav.plantId.toString() !== req.params.plantId
    );
    await req.user.save();
    res.json({ message: 'Plant removed from favorites', favorites: req.user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from favorites', error: error.message });
  }
});

// Route to handle Gemini API calls for comprehensive plant information
router.post('/gemini', async (req, res) => {
  try {
    const { scientificName } = req.body;
    console.log('Fetching comprehensive plant data from Gemini for:', scientificName);

    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key missing');
      return res.status(500).json({ message: 'API configuration error' });
    }

    const prompt = `You are a botanical expert. Provide detailed information about the plant "${scientificName}". 

IMPORTANT: Do NOT say "Information not available" unless you are absolutely certain the information doesn't exist. Instead, provide typical characteristics for plants in the same family or genus, or general botanical information.

Return your response in this exact JSON format:

{
  "commonName": "Provide common name(s) if known, or describe it as 'Species of [genus family]'",
  "scientificName": "${scientificName}",
  "taxonomy": {
    "kingdom": "Plantae",
    "phylum": "Determine the phylum/division",
    "class": "Determine the class",
    "order": "Determine the order", 
    "family": "Determine the family (very important for roses - should be Rosaceae)",
    "genus": "Extract genus from scientific name",
    "species": "Extract species from scientific name"
  },
  "nativeRange": "Provide geographic origin or likely native regions based on genus/family patterns",
  "conservationStatus": "Provide conservation status if known, or state 'Not evaluated' or 'Data deficient'",
  "facts": [
    "Provide at least 3 interesting facts about this plant or its genus",
    "Include information about discovery, naming, or botanical history",
    "Mention any unique characteristics or relationships to other plants"
  ],
  "morphologicalCharacteristics": {
    "height": "Provide typical height range for this species or genus",
    "spread": "Provide typical spread/width",
    "leaves": "Describe leaf characteristics typical for this genus",
    "flowers": "Describe flower characteristics (for roses: color, form, fragrance, etc.)",
    "fruits": "Describe fruit type (for roses: rose hips characteristics)",
    "bark": "Describe bark if relevant, or stem characteristics",
    "growthHabit": "Describe growth habit (shrub, climber, etc.)"
  },
  "cultivationRequirements": {
    "soilType": "Provide soil preferences typical for this genus",
    "sunlight": "Provide light requirements typical for this plant family",
    "waterNeeds": "Provide watering requirements",
    "temperature": "Provide temperature tolerance",
    "hardiness": "Provide hardiness zone information",
    "spacing": "Provide planting spacing recommendations"
  },
  "maintenanceGuidelines": {
    "pruning": "Provide pruning guidelines typical for this genus",
    "fertilization": "Provide fertilization recommendations",
    "pestManagement": "List common pests for this plant family and management",
    "diseaseManagement": "List common diseases and prevention methods",
    "seasonalCare": "Provide seasonal care instructions"
  },
  "practicalUses": [
    "List medicinal uses if any",
    "List ornamental/landscaping uses",
    "List any other practical applications",
    "Include wildlife value (pollinators, birds, etc.)",
    "Include cultural or historical significance"
  ],
  "additionalInformation": [
    "Provide propagation methods",
    "List companion plants",
    "Include any breeding or hybridization information",
    "Mention any special growing considerations",
    "Include any interesting botanical or historical notes"
  ]
}

Remember: Be specific and detailed. Draw from your knowledge of the genus, family, and related species to provide comprehensive information.`;

    console.log('Making request to Gemini API...');
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
    
    const plantData = JSON.parse(jsonMatch[0]);
    console.log('Parsed plant data keys:', Object.keys(plantData));
    res.json(plantData);
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
      message: 'Error fetching plant information from Gemini',
      details: error.message
    });
  }
});

// Route to handle Perplexity API calls
router.post('/perplexity', async (req, res) => {
  try {
    const { scientificName, prompt } = req.body;
    console.log('Fetching Perplexity data for:', scientificName);

    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('Perplexity API key missing');
      return res.status(500).json({ message: 'API configuration error' });
    }

    // Validate API key format
    if (!process.env.PERPLEXITY_API_KEY.startsWith('pplx-')) {
      console.error('Invalid Perplexity API key format');
      return res.status(500).json({ 
        message: 'Invalid API key format',
        details: 'Perplexity API key must start with "pplx-"'
      });
    }

    console.log('Making request to Perplexity API...');
    console.log('API Key format check:', {
      startsWithPplx: process.env.PERPLEXITY_API_KEY.startsWith('pplx-'),
      keyLength: process.env.PERPLEXITY_API_KEY.length
    });

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'mixtral-8x7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a botanical expert. Provide accurate and detailed information about plants.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Perplexity API');
    }

    console.log('Successfully received Perplexity response');
    const perplexityData = JSON.parse(response.data.choices[0].message.content);
    res.json(perplexityData);
  } catch (error) {
    console.error('Perplexity API error:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
      if (error.response.status === 401) {
        return res.status(401).json({
          message: 'Authentication failed with Perplexity API',
          details: 'Please check your API key format and validity'
        });
      }
      return res.status(error.response.status).json({
        message: 'Error from Perplexity API',
        error: error.response.data
      });
    }
    res.status(500).json({ 
      message: 'Error fetching plant information',
      details: error.message
    });
  }
});

module.exports = router;
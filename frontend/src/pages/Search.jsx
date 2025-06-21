import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import './Search.css';

// Debug utility functions
const debug = {
  log: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Search Debug] ${message}`, data);
    }
  },
  error: (message, error) => {
    console.error(`[Search Error] ${message}`, error);
  },
  warn: (message, data) => {
    console.warn(`[Search Warning] ${message}`, data);
  }
};

// API error handler
const handleApiError = (error, customMessage) => {
  const errorMessage = error.response?.data?.message || error.message;
  debug.error(customMessage, error);
  
  if (error.response?.status === 429) {
    return 'Too many requests. Please try again in a few moments.';
  }
  
  if (error.response?.status === 404) {
    return 'Plant information not found. Please try a different search term.';
  }
  
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  }
  
  return customMessage || 'An error occurred. Please try again.';
};

const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const TREFLE_API_KEY = import.meta.env.VITE_TREFLE_API_KEY;

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plantImages, setPlantImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    gbif: true
  });

  // Check API availability
  const checkApiStatus = useCallback(async () => {
    try {
      const gbifCheck = axios.get('https://api.gbif.org/v1/species/suggest?q=test');
      
      const [gbifResponse] = await Promise.allSettled([gbifCheck]);
      
      setApiStatus({
        gbif: gbifResponse.status === 'fulfilled'
      });

      if (gbifResponse.status === 'rejected') {
        debug.warn('GBIF API is not responding', gbifResponse.reason);
      }
    } catch (error) {
      debug.error('Error checking API status', error);
    }
  }, []);

  useEffect(() => {
    checkApiStatus();
    // Check API status every 5 minutes
    const interval = setInterval(checkApiStatus, 300000);
    return () => clearInterval(interval);
  }, [checkApiStatus]);

  // Fetch suggestions from GBIF API
  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      if (!apiStatus.gbif) {
        setError('GBIF API is currently unavailable. Please try again later.');
        return;
      }

      try {
        debug.log('Fetching suggestions for query', query);
        
        // Try both species suggest and name search for better results
        const [suggestResponse, searchResponse] = await Promise.allSettled([
          axios.get(`https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(query)}&rank=SPECIES&status=ACCEPTED&limit=8`),
          axios.get(`https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&rank=SPECIES&status=ACCEPTED&limit=8`)
        ]);
        
        let allResults = [];
        
        // Process suggest API results
        if (suggestResponse.status === 'fulfilled' && suggestResponse.value.data) {
          allResults = allResults.concat(suggestResponse.value.data);
        }
        
        // Process search API results
        if (searchResponse.status === 'fulfilled' && searchResponse.value.data?.results) {
          allResults = allResults.concat(searchResponse.value.data.results);
        }
        
        if (allResults.length === 0) {
          debug.log('No suggestions found for query', query);
          setSuggestions([]);
          return;
        }

        // Filter and process suggestions to ensure they are plants
        const plantSuggestions = allResults
          .filter(item => {
            // Check if it's a plant (kingdom: Plantae)
            return item.kingdom === 'Plantae' || 
                   (item.class && item.class.toLowerCase().includes('plant'));
          })
          .map(item => ({
            key: item.key || item.nubKey,
            scientificName: item.canonicalName || item.scientificName, // Use canonicalName first (without authors)
            commonNames: item.vernacularNames || [],
            family: item.family,
            genus: item.genus,
            species: item.species,
            // Add common name directly from the suggestion
            commonName: item.vernacularName || ''
          }))
          // Remove duplicates based on scientific name
          .filter((item, index, self) => 
            index === self.findIndex(s => s.scientificName === item.scientificName)
          )
          .slice(0, 10);

        debug.log('Processed plant suggestions', plantSuggestions);
        setSuggestions(plantSuggestions);
      } catch (error) {
        const errorMessage = handleApiError(error, 'Failed to fetch suggestions');
        setError(errorMessage);
        setSuggestions([]);
      }
    }, 300),
    [apiStatus.gbif]
  );

  // Function to fetch missing information from Perplexity through backend
  const fetchMissingInfoFromPerplexity = async (scientificName, missingInfo) => {
    try {
      debug.log('Fetching missing information from Perplexity for', scientificName);
      
      const response = await axios.post(
        `${BACKEND_URL}/api/plants/perplexity`,
        {
          scientificName,
          prompt: `Provide detailed information about the plant ${scientificName} in the following JSON format:
          {
            "commonNames": ["array of common names"],
            "taxonomy": {
              "kingdom": "string",
              "phylum": "string",
              "class": "string",
              "order": "string",
              "family": "string",
              "genus": "string",
              "species": "string"
            },
            "nativeRange": ["array of native regions"],
            "conservationStatus": ["array of statuses"],
            "facts": ["array of interesting facts"],
            "morphologicalCharacteristics": {
              "height": "string",
              "leaves": "string",
              "flowers": "string",
              "fruits": "string",
              "bark": "string",
              "roots": "string"
            },
            "cultivationRequirements": {
              "soil": "string",
              "sunlight": "string",
              "water": "string",
              "temperature": "string",
              "hardiness": "string"
            },
            "maintenanceGuidelines": {
              "pruning": "string",
              "fertilization": "string",
              "pestControl": "string",
              "diseasePrevention": "string"
            },
            "practicalUses": ["array of uses"],
            "additionalInfo": "string"
          }`
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const perplexityData = response.data;
      debug.log('Received data from Perplexity', perplexityData);
      return perplexityData;
    } catch (error) {
      debug.error('Error fetching from Perplexity', error);
      return null;
    }
  };

    // Fetch detailed plant information
  const fetchPlantDetails = async (scientificName) => {
    setLoading(true);
    setError(null);
    setSelectedPlant(null);
    setPlantImages([]);

    try {
      debug.log('Fetching plant details for', scientificName);
      
      // First try to get comprehensive data from Gemini and images in parallel
      let plantData = null;
      let images = [];
      
      try {
        const [geminiResponse, imageResults] = await Promise.all([
          axios.post(`${BACKEND_URL}/api/plants/gemini`, {
            scientificName: scientificName
          }, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          fetchPlantImages(scientificName, '')
        ]);

        if (geminiResponse.data) {
          plantData = geminiResponse.data;
          images = imageResults;
          debug.log('Received comprehensive data from Gemini', plantData);
          debug.log('Received plant images', images);
        }
      } catch (geminiError) {
        debug.error('Error fetching from Gemini API', geminiError);
        // Still try to fetch images even if Gemini fails
        images = await fetchPlantImages(scientificName, '');
      }

      // If we have comprehensive data from Gemini, use it
      if (plantData) {
        setSelectedPlant(plantData);
        setPlantImages(images);
      } else {
        // Fallback to GBIF and other APIs
        const gbifResponse = await axios.get(
          `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`
        );
        
        if (!gbifResponse.data || gbifResponse.data.matchType === 'NONE') {
          throw new Error('Plant not found in database');
        }

        const gbifData = gbifResponse.data;
        debug.log('GBIF match data', gbifData);

        // Fetch additional details from GBIF
        let detailedInfo = {};
        if (gbifData.usageKey) {
          try {
            const speciesResponse = await axios.get(
              `https://api.gbif.org/v1/species/${gbifData.usageKey}`
            );
            detailedInfo = speciesResponse.data;
          } catch (error) {
            debug.warn('Error fetching detailed species info', error);
          }
        }

        // Try to get more comprehensive data from Perplexity
        const perplexityData = await fetchMissingInfoFromPerplexity(scientificName);
        
        // Extract common name for better image search
        const commonName = gbifData.vernacularName || 
                          (perplexityData?.commonNames?.[0]) || 
                          '';
        
        // Fetch images with both scientific and common names
        if (images.length === 0) {
          images = await fetchPlantImages(scientificName, commonName);
        }

        // Combine all available data
        const combinedData = {
          scientificName: gbifData.canonicalName || gbifData.scientificName || scientificName,
          commonName: commonName || 'Not available',
          family: gbifData.family || detailedInfo.family || 'Not available',
          genus: gbifData.genus || detailedInfo.genus || 'Not available',
          species: gbifData.species || detailedInfo.species || 'Not available',
          kingdom: gbifData.kingdom || detailedInfo.kingdom || 'Not available',
          phylum: gbifData.phylum || detailedInfo.phylum || 'Not available',
          class: gbifData.class || detailedInfo.class || 'Not available',
          order: gbifData.order || detailedInfo.order || 'Not available',
          taxonomy: perplexityData?.taxonomy || {
            kingdom: gbifData.kingdom,
            phylum: gbifData.phylum,
            class: gbifData.class,
            order: gbifData.order,
            family: gbifData.family,
            genus: gbifData.genus,
            species: gbifData.species
          },
          nativeRange: perplexityData?.nativeRange || 'Not available',
          conservationStatus: perplexityData?.conservationStatus || 'Not evaluated',
          facts: perplexityData?.facts || [],
          morphologicalCharacteristics: perplexityData?.morphologicalCharacteristics || {},
          cultivationRequirements: perplexityData?.cultivationRequirements || {},
          maintenanceGuidelines: perplexityData?.maintenanceGuidelines || {},
          practicalUses: perplexityData?.practicalUses || [],
          additionalInfo: perplexityData?.additionalInfo || 'Not available'
        };

        setSelectedPlant(combinedData);
        setPlantImages(images);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = handleApiError(error, 'Error fetching plant details');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    debug.log('Suggestion selected', suggestion);
    setSearchTerm(suggestion.scientificName);
    setShowSuggestions(false);
    fetchPlantDetails(suggestion.scientificName);
  };

  const formatValue = (value) => {
    if (!value) return 'Not available';
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : 'Not available';
      } else if (value.value) {
        return value.value;
      } else {
        return Object.entries(value)
          .filter(([k, v]) => v)
          .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${v}`)
          .join(', ');
      }
    }
    return value;
  };

  // Function to clean scientific names by removing author citations and years
  const cleanScientificName = (scientificName) => {
    if (!scientificName) return '';
    
    // Remove everything after the first comma, parenthesis, or year pattern
    // This removes author citations like "Fisch. ex Sweet, 1830" or "(L.) Mill."
    return scientificName
      .split(',')[0]  // Remove everything after comma
      .split('(')[0]  // Remove everything after opening parenthesis
      .replace(/\s+\d{4}.*$/, '')  // Remove year and everything after
      .replace(/\s+[A-Z][a-z]*\..*$/, '')  // Remove author abbreviations like "L." or "Mill."
      .trim();
  };

  // Function to fetch plant images from multiple sources
  const fetchPlantImages = async (scientificName, commonName = '') => {
    // Clean the scientific name first
    const cleanName = cleanScientificName(scientificName);
    debug.log(`Cleaned name: "${scientificName}" -> "${cleanName}"`);
    
    let allImages = [];
    
    // Try Wikimedia Commons first (free, scientific images)
    try {
      const wikiImages = await fetchWikimediaImages(cleanName, 'plant');
      debug.log(`Found ${wikiImages.length} images from Wikimedia for ${cleanName}`);
      allImages = allImages.concat(wikiImages);
    } catch (error) {
      debug.warn('Wikimedia fetch failed', error);
    }
    
    // Try PlantNet API for additional scientific images
    if (allImages.length < 3) {
      try {
        const plantNetImages = await fetchPlantNetImages(cleanName);
        debug.log(`Found ${plantNetImages.length} images from PlantNet for ${cleanName}`);
        allImages = allImages.concat(plantNetImages);
      } catch (error) {
        debug.warn('PlantNet fetch failed', error);
      }
    }
    
    // If we have enough high-quality images, return them
    if (allImages.length >= 3) {
      return allImages.slice(0, 4);
    }
    
    // Otherwise, try Unsplash as fallback with strict filtering
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const unsplashImages = await fetchUnsplashImages(cleanName, commonName, 'plant');
        debug.log(`Found ${unsplashImages.length} relevant images from Unsplash for ${cleanName}`);
        allImages = allImages.concat(unsplashImages);
      } catch (error) {
        debug.warn('Unsplash fetch failed', error);
      }
    }

    // Remove duplicates and limit to 4 images for better quality control
    const uniqueImages = allImages.filter((image, index, self) => 
      index === self.findIndex(img => img.id === image.id || img.url === image.url)
    ).slice(0, 4);

    debug.log(`Total unique images found for ${cleanName}: ${uniqueImages.length}`);
    
    // Only show images if we have at least 1 relevant image
    // Don't show placeholder images unless specifically requested
    return uniqueImages;
  };

  // Function to fetch images from Wikimedia Commons
  const fetchWikimediaImages = async (searchTerm, type = 'plant') => {
    try {
      // Clean the search term
      const cleanTerm = searchTerm.replace(/[^\w\s]/g, '').trim();
      
      // Search Wikimedia Commons
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(cleanTerm + ' ' + type)}&srnamespace=6&srlimit=6&origin=*`;
      
      const searchResponse = await axios.get(searchUrl);
      
      if (!searchResponse.data?.query?.search) {
        return [];
      }
      
      const images = [];
      
      for (const result of searchResponse.data.query.search.slice(0, 6)) {
        try {
          // Get image info
          const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&titles=${encodeURIComponent(result.title)}&origin=*`;
          const infoResponse = await axios.get(imageInfoUrl);
          
          const pages = infoResponse.data?.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0];
            if (page?.imageinfo?.[0]?.url) {
              const imageInfo = page.imageinfo[0];
              images.push({
                id: `wiki_${result.pageid}`,
                url: imageInfo.url,
                urls: {
                  small: imageInfo.url,
                  regular: imageInfo.url
                },
                alt_description: result.title.replace('File:', '').replace(/\.[^/.]+$/, ''),
                source: 'wikimedia'
              });
            }
          }
        } catch (error) {
          debug.warn('Error fetching individual image info', error);
          continue;
        }
      }
      
      return images;
    } catch (error) {
      debug.error('Error fetching Wikimedia images', error);
      return [];
    }
  };

  // Function to fetch images from Unsplash with strict relevance filtering
  const fetchUnsplashImages = async (scientificName, commonName = '', type = 'plant') => {
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!unsplashKey) {
      return [];
    }
    
    try {
      // Create very specific search queries - only use the most targeted ones
      const genus = scientificName.split(' ')[0];
      const species = scientificName.split(' ')[1] || '';
      
      const searchQueries = [
        `"${scientificName}" botanical`,
        `${genus} ${species} plant`,
        commonName ? `"${commonName}" plant` : null
      ].filter(Boolean);

      let allImages = [];
      
      // Search with only the most specific queries
      for (const query of searchQueries.slice(0, 2)) {
        try {
          const response = await axios.get(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=all&client_id=${unsplashKey}`
          );
          if (response.data.results && response.data.results.length > 0) {
            // Apply very strict filtering for relevance
            const relevantImages = response.data.results.filter(img => {
              const description = (img.description || img.alt_description || '').toLowerCase();
              const tags = (img.tags || []).map(tag => tag.title?.toLowerCase() || '').join(' ');
              const searchText = `${description} ${tags}`;
              
              // Very strict plant-related terms
              const requiredTerms = ['plant', 'flower', 'botanical', 'flora', 'leaf', 'garden', 'nature'];
              const hasRequiredTerm = requiredTerms.some(term => searchText.includes(term));
              
              // Exclude non-plant images
              const excludeTerms = ['person', 'people', 'human', 'man', 'woman', 'child', 'building', 'city', 'car', 'food', 'animal', 'pet'];
              const hasExcludedTerm = excludeTerms.some(term => searchText.includes(term));
              
              // Check for scientific name or genus match
              const hasNameMatch = searchText.includes(genus.toLowerCase()) || 
                                 (species && searchText.includes(species.toLowerCase())) ||
                                 (commonName && searchText.includes(commonName.toLowerCase()));
              
              // Image must have required terms AND not have excluded terms
              // OR have a direct name match
              return (hasRequiredTerm && !hasExcludedTerm) || hasNameMatch;
            });
            
            allImages = allImages.concat(relevantImages);
            if (allImages.length >= 2) break; // Limit to 2 high-quality images
          }
        } catch (queryError) {
          debug.warn(`Error with Unsplash query "${query}"`, queryError);
          continue;
        }
      }

      return allImages.slice(0, 2); // Maximum 2 images from Unsplash
    } catch (error) {
      debug.error('Error fetching Unsplash images', error);
      return [];
    }
  };

  // Function to fetch images from PlantNet API (free botanical database)
  const fetchPlantNetImages = async (scientificName) => {
    try {
      // PlantNet API endpoint for species search (using demo key, might be limited)
      const apiUrl = `https://my-api.plantnet.org/v2/species/${encodeURIComponent(scientificName)}?api-key=2b10VVKgMGxHKgaLEgMqSjE0d&include-related-images=true`;
      
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.images) {
        return response.data.images.slice(0, 4).map((img, index) => ({
          id: `plantnet_${scientificName}_${index}`,
          url: img.url.m || img.url.s || img.url.o,
          urls: {
            small: img.url.s || img.url.m,
            regular: img.url.m || img.url.o
          },
          alt_description: `${scientificName} - ${img.organ || 'plant'}`,
          source: 'plantnet'
        }));
      }
      
      return [];
    } catch (error) {
      // PlantNet API might not be available or might require authentication
      debug.warn('PlantNet API not available', error);
      return [];
    }
  };

  // Function to generate placeholder images when no real images are found
  const generatePlaceholderImages = (name, type) => {
    const colors = ['4CAF50', '8BC34A', '2E7D32', '689F38', '43A047', '66BB6A'];
    const icons = type === 'plant' ? ['🌱', '🌿', '🍃', '🌾', '🌳', '🌸'] : ['🦠', '🔬', '⚠️', '🩹', '💊', '🧪'];
    
    return Array.from({ length: 3 }, (_, index) => ({
      id: `placeholder_${name}_${index}`,
      url: `https://via.placeholder.com/400x300/${colors[index % colors.length]}/ffffff?text=${encodeURIComponent(icons[index % icons.length] + ' ' + (type === 'plant' ? 'Plant' : 'Disease'))}`,
      urls: {
        small: `https://via.placeholder.com/200x150/${colors[index % colors.length]}/ffffff?text=${encodeURIComponent(icons[index % icons.length])}`,
        regular: `https://via.placeholder.com/400x300/${colors[index % colors.length]}/ffffff?text=${encodeURIComponent(icons[index % icons.length] + ' ' + (type === 'plant' ? 'Plant' : 'Disease'))}`
      },
      alt_description: `${name} - No image available`,
      source: 'placeholder'
    }));
  };

  const getPlantDataSections = (plantData) => {
    return [
      {
        title: 'Basic Information',
        icon: '🏷️',
        fields: [
          { key: 'commonName', label: 'Common Name', value: plantData.commonName },
          { key: 'scientificName', label: 'Scientific Name', value: plantData.scientificName },
          { key: 'family', label: 'Family', value: plantData.family },
          { key: 'genus', label: 'Genus', value: plantData.genus },
          { key: 'species', label: 'Species', value: plantData.species }
        ]
      },
      {
        title: 'Taxonomy',
        icon: '🔬',
        fields: [
          { key: 'kingdom', label: 'Kingdom', value: plantData.taxonomy?.kingdom || plantData.kingdom },
          { key: 'phylum', label: 'Phylum', value: plantData.taxonomy?.phylum || plantData.phylum },
          { key: 'class', label: 'Class', value: plantData.taxonomy?.class || plantData.class },
          { key: 'order', label: 'Order', value: plantData.taxonomy?.order || plantData.order },
          { key: 'family', label: 'Family', value: plantData.taxonomy?.family || plantData.family },
          { key: 'genus', label: 'Genus', value: plantData.taxonomy?.genus || plantData.genus },
          { key: 'species', label: 'Species', value: plantData.taxonomy?.species || plantData.species }
        ]
      },
      {
        title: 'Native Range & Distribution',
        icon: '🌍',
        fields: [
          { key: 'nativeRange', label: 'Native Range', value: plantData.nativeRange },
          { key: 'distribution', label: 'Current Distribution', value: plantData.distribution },
          { key: 'habitat', label: 'Natural Habitat', value: plantData.habitat }
        ]
      },
      {
        title: 'Conservation Status',
        icon: '🛡️',
        fields: [
          { key: 'conservationStatus', label: 'Conservation Status', value: plantData.conservationStatus }
        ]
      },
      {
        title: 'Morphological Characteristics',
        icon: '🔍',
        fields: [
          { key: 'height', label: 'Height', value: plantData.morphologicalCharacteristics?.height },
          { key: 'leaves', label: 'Leaves', value: plantData.morphologicalCharacteristics?.leaves },
          { key: 'flowers', label: 'Flowers', value: plantData.morphologicalCharacteristics?.flowers },
          { key: 'fruits', label: 'Fruits', value: plantData.morphologicalCharacteristics?.fruits },
          { key: 'bark', label: 'Bark', value: plantData.morphologicalCharacteristics?.bark },
          { key: 'roots', label: 'Roots', value: plantData.morphologicalCharacteristics?.roots }
        ]
      },
      {
        title: 'Cultivation Requirements',
        icon: '🌱',
        fields: [
          { key: 'soil', label: 'Soil Requirements', value: plantData.cultivationRequirements?.soil },
          { key: 'sunlight', label: 'Light Requirements', value: plantData.cultivationRequirements?.sunlight },
          { key: 'water', label: 'Water Requirements', value: plantData.cultivationRequirements?.water },
          { key: 'temperature', label: 'Temperature', value: plantData.cultivationRequirements?.temperature },
          { key: 'hardiness', label: 'Hardiness Zone', value: plantData.cultivationRequirements?.hardiness }
        ]
      },
      {
        title: 'Maintenance Guidelines',
        icon: '✂️',
        fields: [
          { key: 'pruning', label: 'Pruning', value: plantData.maintenanceGuidelines?.pruning },
          { key: 'fertilization', label: 'Fertilization', value: plantData.maintenanceGuidelines?.fertilization },
          { key: 'pestControl', label: 'Pest Control', value: plantData.maintenanceGuidelines?.pestControl },
          { key: 'diseasePrevention', label: 'Disease Prevention', value: plantData.maintenanceGuidelines?.diseasePrevention }
        ]
      },
      {
        title: 'Practical Uses',
        icon: '💡',
        fields: [
          { key: 'practicalUses', label: 'Uses', value: plantData.practicalUses }
        ]
      },
      {
        title: 'Interesting Facts',
        icon: '💭',
        fields: [
          { key: 'facts', label: 'Facts', value: plantData.facts }
        ]
      },
      {
        title: 'Additional Information',
        icon: '📚',
        fields: [
          { key: 'additionalInfo', label: 'Additional Information', value: plantData.additionalInfo }
        ]
      }
    ];
  };

  const renderPlantDetails = () => {
    if (!selectedPlant) return null;

    const sections = getPlantDataSections(selectedPlant);

    return (
      <motion.div 
        className="modern-plant-details"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="plant-header-card">
          <h2 className="plant-name">{selectedPlant.scientificName}</h2>
          <p className="common-name">{selectedPlant.commonName}</p>
        </div>

        {/* Images Section */}
        {plantImages.length > 0 && (
          <motion.div 
            className="detail-card images-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-header">
              <span className="card-icon">📷</span>
              <h3 className="card-title">Plant Images</h3>
            </div>
            <div className="card-content">
              <div className="images-grid">
                {plantImages.map((image, index) => (
                  <div key={index} className="image-item">
                    <img 
                      src={image.urls.small} 
                      alt={image.alt_description || selectedPlant.scientificName}
                      loading="lazy"
                    />
                    <div className="image-caption">
                      {image.alt_description || 'Plant specimen'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="details-grid">
          {sections.map((section) => {
            const sectionContent = section.fields
              .filter(field => field.value && field.value !== 'Not available' && field.value !== 'Unknown')
              .map((field) => (
                <div key={field.key} className="detail-row">
                  <span className="detail-label">{field.label}</span>
                  <span className="detail-value">{formatValue(field.value)}</span>
        </div>
              ));

            if (sectionContent.length === 0) return null;

            return (
              <motion.div 
                key={section.title} 
                className="detail-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-header">
                  <span className="card-icon">{section.icon}</span>
                  <h3 className="card-title">{section.title}</h3>
          </div>
                <div className="card-content">
                  {sectionContent}
          </div>
              </motion.div>
            );
          })}
                  </div>
      </motion.div>
    );
  };

  useEffect(() => {
    if (searchTerm) {
      fetchSuggestions(searchTerm);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, fetchSuggestions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      fetchPlantDetails(searchTerm.trim());
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="modern-search-container">
      <motion.div
        className="search-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="hero-section">
          <h1 className="main-title">Plant Encyclopedia</h1>
          <p className="subtitle">Explore the vast world of plants with comprehensive botanical information</p>
        </div>

        <div className="search-section">
          <form onSubmit={handleSearchSubmit} className="search-form">
    <div className="search-container">
          <input
            type="text"
            value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for plants by scientific or common name..."
            className="search-input"
                disabled={loading}
          />
              <motion.button
                type="submit"
                className="search-btn"
                disabled={!searchTerm.trim() || loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? (
                  <div className="btn-spinner"></div>
                ) : (
                  <span className="search-icon">🔍</span>
                )}
              </motion.button>
            </div>

            <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  className="suggestions-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.key}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                      <div className="suggestion-content">
                        <div className="scientific-name">{suggestion.scientificName}</div>
                        {suggestion.commonName && (
                          <div className="common-names">
                            {suggestion.commonName}
                          </div>
                        )}
                        {suggestion.family && (
                          <div className="family-name">Family: {suggestion.family}</div>
                        )}
                      </div>
                </div>
              ))}
                </motion.div>
          )}
            </AnimatePresence>
          </form>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="error-card"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
      {loading && (
            <motion.div
              className="loading-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
          <div className="loading-spinner"></div>
              <p>Searching botanical databases...</p>
            </motion.div>
      )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedPlant && !loading && (
            <motion.div
              className="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {renderPlantDetails()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Search;
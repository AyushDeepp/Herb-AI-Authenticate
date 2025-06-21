import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Diseases.css';

// Debug utility functions
const debug = {
  log: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Disease Search Debug] ${message}`, data);
    }
  },
  error: (message, error) => {
    console.error(`[Disease Search Error] ${message}`, error);
  },
  warn: (message, data) => {
    console.warn(`[Disease Search Warning] ${message}`, data);
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
    return 'Disease information not found. Please try a different search term.';
  }
  
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  }
  
  return customMessage || 'An error occurred. Please try again.';
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const Diseases = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [diseaseImages, setDiseaseImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common plant diseases for suggestions
  const commonDiseases = [
    'Powdery Mildew',
    'Black Spot',
    'Rust',
    'Blight',
    'Root Rot',
    'Leaf Spot',
    'Anthracnose',
    'Fusarium Wilt',
    'Verticillium Wilt',
    'Downy Mildew',
    'Fire Blight',
    'Canker',
    'Mosaic Virus',
    'Crown Rot',
    'Bacterial Wilt'
  ];

  // Generate suggestions based on search term
  const generateSuggestions = useCallback(
    debounce((query) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      const filteredSuggestions = commonDiseases
        .filter(disease => 
          disease.toLowerCase().includes(query.toLowerCase())
        )
        .map(disease => ({
          name: disease,
          type: 'disease'
        }));

      setSuggestions(filteredSuggestions);
      debug.log('Generated suggestions', filteredSuggestions);
    }, 300),
    []
  );

  // Fetch detailed disease information from backend API
  const fetchDiseaseDetails = async (diseaseName) => {
    setLoading(true);
    setError(null);
    setSelectedDisease(null);
    setDiseaseImages([]);

    try {
      debug.log('Fetching disease details for', diseaseName);
      
      // Get comprehensive disease data from Gemini and images in parallel
      const [diseaseResponse, images] = await Promise.all([
        axios.post(`${BACKEND_URL}/api/diseases/gemini`, { diseaseName }),
        fetchDiseaseImages(diseaseName)
      ]);

      if (diseaseResponse.data) {
        setSelectedDisease(diseaseResponse.data);
        setDiseaseImages(images);
        debug.log('Received disease data', diseaseResponse.data);
        debug.log('Received disease images', images);
      } else {
        throw new Error('No data received from API');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = handleApiError(error, 'Error fetching disease details');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      generateSuggestions(searchTerm);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, generateSuggestions]);

  const handleSuggestionClick = (suggestion) => {
    debug.log('Suggestion selected', suggestion);
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    fetchDiseaseDetails(suggestion.name);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      fetchDiseaseDetails(searchTerm.trim());
    }
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

  // Function to clean disease names by removing extra descriptors
  const cleanDiseaseName = (diseaseName) => {
    if (!diseaseName) return '';
    
    // Remove common suffixes and extra descriptors
    return diseaseName
      .replace(/\s+disease$/i, '')  // Remove "disease" suffix
      .replace(/\s+infection$/i, '') // Remove "infection" suffix
      .replace(/\s+\(.*?\)/g, '')   // Remove parenthetical information
      .trim();
  };

  // Function to fetch disease images from multiple sources
  const fetchDiseaseImages = async (diseaseName) => {
    // Clean the disease name first
    const cleanName = cleanDiseaseName(diseaseName);
    debug.log(`Cleaned disease name: "${diseaseName}" -> "${cleanName}"`);
    
    let allImages = [];
    
    // Try Wikimedia Commons first (free, scientific images)
    try {
      const wikiImages = await fetchWikimediaImages(cleanName, 'disease');
      debug.log(`Found ${wikiImages.length} disease images from Wikimedia for ${cleanName}`);
      allImages = allImages.concat(wikiImages);
    } catch (error) {
      debug.warn('Wikimedia fetch failed', error);
    }
    
    // If we have enough high-quality images, return them
    if (allImages.length >= 3) {
      return allImages.slice(0, 4);
    }
    
    // Otherwise, try Unsplash as fallback with strict filtering
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (unsplashKey) {
      try {
        const unsplashImages = await fetchUnsplashImages(cleanName, 'disease');
        debug.log(`Found ${unsplashImages.length} relevant disease images from Unsplash for ${cleanName}`);
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
    return uniqueImages;
  };

  // Function to fetch images from Wikimedia Commons
  const fetchWikimediaImages = async (searchTerm, type = 'disease') => {
    try {
      // Clean the search term and create disease-specific search
      const cleanTerm = searchTerm.replace(/[^\w\s]/g, '').trim();
      const searchTerms = [
        `${cleanTerm} plant disease`,
        `${cleanTerm} pathology`,
        `${cleanTerm} plant pathogen`,
        `${cleanTerm} symptoms`
      ];
      
      const images = [];
      
      for (const term of searchTerms.slice(0, 2)) {
        try {
          // Search Wikimedia Commons
          const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&srlimit=3&origin=*`;
          
          const searchResponse = await axios.get(searchUrl);
          
          if (!searchResponse.data?.query?.search) {
            continue;
          }
          
          for (const result of searchResponse.data.query.search) {
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
              debug.warn('Error fetching individual disease image info', error);
              continue;
            }
          }
          
          if (images.length >= 4) break;
        } catch (error) {
          debug.warn(`Error searching Wikimedia for "${term}"`, error);
          continue;
        }
      }
      
      return images;
    } catch (error) {
      debug.error('Error fetching Wikimedia disease images', error);
      return [];
    }
  };

  // Function to fetch disease images from Unsplash with strict relevance filtering
  const fetchUnsplashImages = async (diseaseName, type = 'disease') => {
    const unsplashKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!unsplashKey) {
      return [];
    }
    
    try {
      // Create very specific search queries for diseases - only the most targeted ones
      const searchQueries = [
        `"${diseaseName}" plant pathology`,
        `${diseaseName} leaf disease`,
        `plant disease ${diseaseName}`
      ];

      let allImages = [];
      
      // Search with only the most specific queries
      for (const query of searchQueries.slice(0, 2)) {
        try {
          const response = await axios.get(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=all&client_id=${unsplashKey}`
          );
          if (response.data.results && response.data.results.length > 0) {
            // Apply very strict filtering for disease relevance
            const relevantImages = response.data.results.filter(img => {
              const description = (img.description || img.alt_description || '').toLowerCase();
              const tags = (img.tags || []).map(tag => tag.title?.toLowerCase() || '').join(' ');
              const searchText = `${description} ${tags}`;
              
              // Very strict disease-related terms
              const requiredTerms = ['disease', 'pathology', 'infection', 'symptoms', 'plant', 'leaf', 'fungal', 'bacterial', 'blight', 'rot', 'spot', 'virus'];
              const hasRequiredTerm = requiredTerms.some(term => searchText.includes(term));
              
              // Exclude non-disease images
              const excludeTerms = ['person', 'people', 'human', 'man', 'woman', 'child', 'building', 'city', 'car', 'food', 'healthy', 'beautiful', 'green', 'fresh'];
              const hasExcludedTerm = excludeTerms.some(term => searchText.includes(term));
              
              // Check for disease name match
              const hasNameMatch = searchText.includes(diseaseName.toLowerCase());
              
              // Image must have required terms AND not have excluded terms
              // OR have a direct name match
              return (hasRequiredTerm && !hasExcludedTerm) || hasNameMatch;
            });
            
            allImages = allImages.concat(relevantImages);
            if (allImages.length >= 2) break; // Limit to 2 high-quality images
          }
        } catch (queryError) {
          debug.warn(`Error with Unsplash disease query "${query}"`, queryError);
          continue;
        }
      }

      return allImages.slice(0, 2); // Maximum 2 images from Unsplash
    } catch (error) {
      debug.error('Error fetching Unsplash disease images', error);
      return [];
    }
  };

  // Function to generate placeholder images when no real images are found
  const generatePlaceholderImages = (name, type) => {
    const colors = ['F44336', 'E91E63', 'D32F2F', 'C2185B', 'AD1457', 'B71C1C'];
    const icons = type === 'disease' ? ['🦠', '🔬', '⚠️', '🩹', '💊', '🧪'] : ['🌱', '🌿', '🍃', '🌾', '🌳', '🌸'];
    
    return Array.from({ length: 3 }, (_, index) => ({
      id: `placeholder_${name}_${index}`,
      url: `https://via.placeholder.com/400x300/${colors[index % colors.length]}/ffffff?text=${encodeURIComponent(icons[index % icons.length] + ' Disease')}`,
      urls: {
        small: `https://via.placeholder.com/200x150/${colors[index % colors.length]}/ffffff?text=${encodeURIComponent(icons[index % icons.length])}`,
        regular: `https://via.placeholder.com/400x300/${colors[index % colors.length]}/ffffff?text=${encodeURIComponent(icons[index % icons.length] + ' Disease')}`
      },
      alt_description: `${name} - No image available`,
      source: 'placeholder'
    }));
  };

  const getDiseaseDataSections = (diseaseData) => {
    return [
      {
        title: 'Overview',
        icon: '📋',
        fields: [
          { key: 'overview', label: 'Description', value: diseaseData.overview }
        ]
      },
      {
        title: 'Basic Information',
        icon: '🏷️',
        fields: [
          { key: 'scientificName', label: 'Scientific Name', value: diseaseData.scientificName },
          { key: 'commonNames', label: 'Also Known As', value: diseaseData.commonNames },
          { key: 'spreadMechanism', label: 'Spread Mechanism', value: diseaseData.spreadMechanism }
        ]
      },
      {
        title: 'Symptoms',
        icon: '🔍',
        fields: [
          { key: 'symptoms', label: 'Symptoms', value: diseaseData.symptoms }
        ]
      },
      {
        title: 'Causes & Conditions',
        icon: '⚡',
        fields: [
          { key: 'causes', label: 'Causes', value: diseaseData.causes },
          { key: 'environmentalConditions', label: 'Environmental Conditions', value: diseaseData.environmentalConditions }
        ]
      },
      {
        title: 'Affected Plants',
        icon: '🌿',
        fields: [
          { key: 'affectedPlants', label: 'Affected Plants', value: diseaseData.affectedPlants },
          { key: 'affectedParts', label: 'Affected Plant Parts', value: diseaseData.affectedParts }
        ]
      },
      {
        title: 'Treatment',
        icon: '💊',
        fields: [
          { key: 'treatment', label: 'Treatment Methods', value: diseaseData.treatment }
        ]
      },
      {
        title: 'Prevention',
        icon: '🛡️',
        fields: [
          { key: 'prevention', label: 'Prevention Methods', value: diseaseData.prevention }
        ]
      },
      {
        title: 'Additional Information',
        icon: '📚',
        fields: [
          { key: 'lifecycle', label: 'Disease Lifecycle', value: diseaseData.lifecycle },
          { key: 'economicImpact', label: 'Economic Impact', value: diseaseData.economicImpact },
          { key: 'diagnosticMethods', label: 'Diagnostic Methods', value: diseaseData.diagnosticMethods },
          { key: 'differentialDiagnosis', label: 'Differential Diagnosis', value: diseaseData.differentialDiagnosis },
          { key: 'additionalInformation', label: 'Additional Information', value: diseaseData.additionalInformation }
        ]
      }
    ];
  };

  const renderDiseaseDetails = () => {
    if (!selectedDisease) return null;

    const sections = getDiseaseDataSections(selectedDisease);

    return (
      <motion.div 
        className="modern-disease-details"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="disease-header-card">
          <h2 className="disease-name">{selectedDisease.diseaseName}</h2>
          {selectedDisease.scientificName && (
            <p className="scientific-name">{selectedDisease.scientificName}</p>
          )}
          {selectedDisease.commonNames && selectedDisease.commonNames.length > 0 && (
            <div className="common-names-container">
              <span className="also-known-label">Also known as:</span>
              <div className="name-tags">
                {selectedDisease.commonNames.map((name, index) => (
                  <span key={index} className="name-tag">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Images Section */}
        {diseaseImages.length > 0 && (
          <motion.div 
            className="detail-card images-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-header">
              <span className="card-icon">📷</span>
              <h3 className="card-title">Disease Images</h3>
            </div>
            <div className="card-content">
              <div className="images-grid">
                {diseaseImages.map((image, index) => (
                  <div key={index} className="image-item">
                    <img 
                      src={image.urls.small} 
                      alt={image.alt_description || selectedDisease.diseaseName}
                      loading="lazy"
                    />
                    <div className="image-caption">
                      {image.alt_description || 'Disease symptom'}
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
    <div className="modern-diseases-container">
      <motion.div
        className="diseases-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="hero-section">
          <h1 className="main-title">Plant Disease Database</h1>
          <p className="subtitle">Comprehensive information about plant diseases, their symptoms, treatments, and prevention methods</p>
        </div>

        <div className="search-section">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <div className="search-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for plant diseases..."
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
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="suggestion-content">
                        <div className="disease-name">{suggestion.name}</div>
                        <div className="suggestion-type">Plant Disease</div>
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
              <p>Searching disease database...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedDisease && !loading && (
            <motion.div
              className="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {renderDiseaseDetails()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Diseases;
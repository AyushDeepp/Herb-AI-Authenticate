import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
        const response = await axios.get(
          `https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(query)}&rank=SPECIES&status=ACCEPTED&limit=10`
        );
        
        if (!response.data || response.data.length === 0) {
          debug.log('No suggestions found for query', query);
          setSuggestions([]);
          return;
        }

        // Filter and process suggestions to ensure they are plants
        const plantSuggestions = response.data
          .filter(item => {
            // Check if it's a plant (kingdom: Plantae)
            return item.kingdom === 'Plantae' || 
                   (item.class && item.class.toLowerCase().includes('plant'));
          })
          .map(item => ({
            key: item.key,
            scientificName: item.scientificName,
            commonNames: item.vernacularNames || [],
            family: item.family,
            genus: item.genus,
            species: item.species
          }));

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

    try {
      // Get comprehensive plant data from Gemini
      const geminiResponse = await axios.post(
        `${BACKEND_URL}/api/plants/gemini`,
        { scientificName }
      );

      if (geminiResponse.data) {
        setSelectedPlant(geminiResponse.data);
      } else {
        throw new Error('No data received from Gemini');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.message || error.message || 'Error fetching plant details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm) {
      fetchSuggestions(searchTerm);
    }
  }, [searchTerm, fetchSuggestions]);

  const handleSuggestionClick = (suggestion) => {
    debug.log('Suggestion selected', suggestion);
    setSearchTerm(suggestion.scientificName);
    setShowSuggestions(false);
    fetchPlantDetails(suggestion.scientificName);
  };

  const renderPlantDetails = () => {
    if (!selectedPlant) return null;

    const {
      commonName = '',
      scientificName = '',
      taxonomy = {},
      nativeRange = '',
      conservationStatus = '',
      facts = [],
      morphologicalCharacteristics = {},
      cultivationRequirements = {},
      maintenanceGuidelines = {},
      practicalUses = [],
      additionalInformation = []
    } = selectedPlant;

    return (
      <div className="plant-details">
        <div className="plant-header">
          <h2>{scientificName}</h2>
          {commonName && (
            <p className="common-name">
              <strong>Common Name:</strong> {commonName}
            </p>
          )}
        </div>

        <div className="taxonomy-section">
          <h3>Taxonomy</h3>
          <ul className="taxonomy-list">
            {Object.entries(taxonomy).map(([key, value]) => (
              value && <li key={key}><strong>{key}:</strong> {value}</li>
            ))}
          </ul>
        </div>

        {nativeRange && (
          <div className="native-range-section">
            <h3>Native Range</h3>
            <p className="info-text">{nativeRange}</p>
          </div>
        )}

        {conservationStatus && (
          <div className="conservation-section">
            <h3>Conservation Status</h3>
            <p className="info-text">{conservationStatus}</p>
          </div>
        )}

        {facts.length > 0 && (
          <div className="facts-section">
            <h3>Interesting Facts</h3>
            <ul className="facts-list">
              {facts.map((fact, index) => (
                <li key={index}>{fact}</li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(morphologicalCharacteristics).length > 0 && (
          <div className="morphology-section">
            <h3>Morphological Characteristics</h3>
            <div className="info-grid">
              {Object.entries(morphologicalCharacteristics).map(([key, value]) => (
                value && value !== "Information not available" && (
                  <div key={key} className="info-item">
                    <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                    <span className="value">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {Object.keys(cultivationRequirements).length > 0 && (
          <div className="cultivation-section">
            <h3>Cultivation Requirements</h3>
            <div className="info-grid">
              {Object.entries(cultivationRequirements).map(([key, value]) => (
                value && value !== "Information not available" && (
                  <div key={key} className="info-item">
                    <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                    <span className="value">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {Object.keys(maintenanceGuidelines).length > 0 && (
          <div className="maintenance-section">
            <h3>Maintenance Guidelines</h3>
            <div className="info-grid">
              {Object.entries(maintenanceGuidelines).map(([key, value]) => (
                value && value !== "Information not available" && (
                  <div key={key} className="info-item">
                    <span className="label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                    <span className="value">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {practicalUses.length > 0 && (
          <div className="uses-section">
            <h3>Practical Uses</h3>
            <ul className="uses-list">
              {practicalUses.map((use, index) => (
                use && use !== "Information not available" && (
                  <li key={index}>{use}</li>
                )
              ))}
            </ul>
          </div>
        )}

        {additionalInformation.length > 0 && (
          <div className="additional-section">
            <h3>Additional Information</h3>
            <ul className="additional-list">
              {additionalInformation.map((info, index) => (
                info && info !== "Information not available" && (
                  <li key={index}>{info}</li>
                )
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h1>Plant Search</h1>
        <div className="search-input-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Search for a plant by name..."
            className="search-input"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-container">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.key}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="scientific-name">{suggestion.scientificName}</span>
                  {suggestion.commonNames.length > 0 && (
                    <span className="common-name">
                      {suggestion.commonNames[0].vernacularName}
                    </span>
                  )}
                  {suggestion.family && (
                    <span className="family-name">Family: {suggestion.family}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading plant information...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && renderPlantDetails()}
    </div>
  );
};

export default Search;
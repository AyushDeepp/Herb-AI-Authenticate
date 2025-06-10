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

    try {
      debug.log('Fetching disease details for', diseaseName);
      
      // Get comprehensive disease data from Gemini
      const response = await axios.post(
        `${BACKEND_URL}/api/diseases/gemini`,
        { diseaseName }
      );

      if (response.data) {
        setSelectedDisease(response.data);
        debug.log('Received disease data', response.data);
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

  const renderDiseaseDetails = () => {
    if (!selectedDisease) return null;

    const {
      diseaseName = '',
      scientificName = '',
      commonNames = [],
      overview = '',
      symptoms = [],
      causes = [],
      affectedPlants = [],
      affectedParts = [],
      environmentalConditions = {},
      spreadMechanism = '',
      treatment = {},
      prevention = [],
      lifecycle = '',
      economicImpact = '',
      diagnosticMethods = [],
      differentialDiagnosis = [],
      additionalInformation = []
    } = selectedDisease;

    return (
      <motion.div 
        className="disease-details"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="disease-header">
          <h2>{diseaseName}</h2>
          {scientificName && (
            <p className="scientific-name">
              <strong>Scientific Name:</strong> {scientificName}
            </p>
          )}
          {commonNames.length > 0 && (
            <div className="common-names">
              <strong>Also Known As:</strong>
              <div className="name-tags">
                {commonNames.map((name, index) => (
                  <span key={index} className="name-tag">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {overview && (
          <div className="detail-section">
            <h3>Overview</h3>
            <p className="info-text">{overview}</p>
          </div>
        )}

        {symptoms.length > 0 && (
          <div className="detail-section">
            <h3>Symptoms</h3>
            <ul className="symptoms-list">
              {symptoms.map((symptom, index) => (
                <li key={index}>{symptom}</li>
              ))}
            </ul>
          </div>
        )}

        {causes.length > 0 && (
          <div className="detail-section">
            <h3>Causes</h3>
            <ul className="causes-list">
              {causes.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ul>
          </div>
        )}

        {affectedPlants.length > 0 && (
          <div className="detail-section">
            <h3>Affected Plants</h3>
            <div className="affected-plants">
              {affectedPlants.map((plant, index) => (
                <span key={index} className="plant-tag">{plant}</span>
              ))}
            </div>
          </div>
        )}

        {affectedParts.length > 0 && (
          <div className="detail-section">
            <h3>Affected Plant Parts</h3>
            <div className="affected-parts">
              {affectedParts.map((part, index) => (
                <span key={index} className="part-tag">{part}</span>
              ))}
            </div>
          </div>
        )}

        {Object.keys(environmentalConditions).length > 0 && (
          <div className="detail-section">
            <h3>Environmental Conditions</h3>
            <div className="info-grid">
              {Object.entries(environmentalConditions).map(([key, value]) => (
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

        {spreadMechanism && (
          <div className="detail-section">
            <h3>Spread Mechanism</h3>
            <p className="info-text">{spreadMechanism}</p>
          </div>
        )}

        {Object.keys(treatment).length > 0 && (
          <div className="detail-section">
            <h3>Treatment Options</h3>
            {Object.entries(treatment).map(([method, treatments]) => (
              treatments && treatments.length > 0 && (
                <div key={method} className="treatment-method">
                  <h4>{method.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                  <ul>
                    {treatments.map((treatmentItem, index) => (
                      <li key={index}>{treatmentItem}</li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        )}

        {prevention.length > 0 && (
          <div className="detail-section">
            <h3>Prevention</h3>
            <ul className="prevention-list">
              {prevention.map((preventionItem, index) => (
                <li key={index}>{preventionItem}</li>
              ))}
            </ul>
          </div>
        )}

        {lifecycle && (
          <div className="detail-section">
            <h3>Disease Lifecycle</h3>
            <p className="info-text">{lifecycle}</p>
          </div>
        )}

        {economicImpact && (
          <div className="detail-section">
            <h3>Economic Impact</h3>
            <p className="info-text">{economicImpact}</p>
          </div>
        )}

        {diagnosticMethods.length > 0 && (
          <div className="detail-section">
            <h3>Diagnostic Methods</h3>
            <ul className="diagnostic-list">
              {diagnosticMethods.map((method, index) => (
                <li key={index}>{method}</li>
              ))}
            </ul>
          </div>
        )}

        {differentialDiagnosis.length > 0 && (
          <div className="detail-section">
            <h3>Differential Diagnosis</h3>
            <ul className="differential-list">
              {differentialDiagnosis.map((diagnosis, index) => (
                <li key={index}>{diagnosis}</li>
              ))}
            </ul>
          </div>
        )}

        {additionalInformation.length > 0 && (
          <div className="detail-section">
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
      </motion.div>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="diseases-container">
      <motion.div
        className="diseases-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="diseases-header">
          <h1>Plant Disease Search</h1>
          <p className="subtitle">Search for plant diseases and get comprehensive information about symptoms, treatments, and prevention</p>
          
          <form onSubmit={handleSearchSubmit} className="search-form">
            <div className="search-input-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Search for a plant disease..."
                className="search-input"
              />
              <motion.button
                type="submit"
                className="search-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? (
                  <div className="button-loader">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  '🔍'
                )}
              </motion.button>
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-container">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="disease-name">{suggestion.name}</span>
                    <span className="suggestion-type">Plant Disease</span>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading disease information...</p>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !error && renderDiseaseDetails()}
      </motion.div>
    </div>
  );
};

export default Diseases;
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Camera from '../components/Camera';
import PlantDistributionMap from '../components/PlantDistributionMap';
import '../styles/Identify.css';
import '../styles/PlantDistributionMap.css';

const Identify = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const [additionalDetails, setAdditionalDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [climateData, setClimateData] = useState(null);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const plantDataRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Get location for uploaded images
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            console.log('Location data from upload:', location);
            setLocationData(location);
            fetchClimateData(location.latitude, location.longitude);
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please drop an image file');
        return;
      }

      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const handleCameraCapture = (file, previewUrl, metadata) => {
    console.log('Camera capture metadata:', metadata);
    setSelectedImage(file);
    setPreviewUrl(previewUrl);
    setLocationData(metadata.location);
    if (metadata.location) {
      console.log('Location data from camera:', metadata.location);
      fetchClimateData(metadata.location.latitude, metadata.location.longitude);
    }
  };

  const openCamera = () => {
    setShowCamera(true);
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      console.log('Sending request to identify plant...');
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${BACKEND_URL}/api/plants/identify`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('Response received:', response.data);
      
      if (!response.data || !response.data.suggestions) {
        throw new Error('Invalid response format from server');
      }

      setResult(response.data);
    } catch (error) {
      console.error('Error identifying plant:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        setError(error.response.data.message || 'Failed to identify plant');
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        setError(error.message || 'Failed to identify plant');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdditionalDetails = async (scientificName, gbifId) => {
    try {
      setLoadingDetails(true);
      let details = {};

      // Primary: Fetch comprehensive data from our enhanced Gemini API
      try {
        console.log('Fetching comprehensive plant data from Gemini API...');
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const geminiResponse = await axios.post(`${BACKEND_URL}/api/plants/gemini`, {
          scientificName: scientificName
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (geminiResponse.data) {
          const geminiData = geminiResponse.data;
          
          // Map Gemini data to our frontend display format
          details = {
            // Basic Information
            common_names: geminiData.commonName,
            scientific_name: geminiData.scientificName,
            taxonomy: geminiData.taxonomy,
            
            // Geographic and Conservation
            native_range: geminiData.nativeRange,
            conservation_status: geminiData.conservationStatus,
            
            // Morphological Characteristics
            height: geminiData.morphologicalCharacteristics?.height,
            spread: geminiData.morphologicalCharacteristics?.spread,
            leaf_type: geminiData.morphologicalCharacteristics?.leaves,
            flower_color: geminiData.morphologicalCharacteristics?.flowers,
            fruit_color: geminiData.morphologicalCharacteristics?.fruits,
            bark_texture: geminiData.morphologicalCharacteristics?.bark,
            growth_habit: geminiData.morphologicalCharacteristics?.growthHabit,
            
            // Cultivation Requirements
            soil: geminiData.cultivationRequirements?.soilType,
            sunlight: geminiData.cultivationRequirements?.sunlight,
            watering: geminiData.cultivationRequirements?.waterNeeds,
            temperature_range: geminiData.cultivationRequirements?.temperature,
            hardiness_zone: geminiData.cultivationRequirements?.hardiness,
            planting_spacing: geminiData.cultivationRequirements?.spacing,
            
            // Maintenance Guidelines
            pruning: geminiData.maintenanceGuidelines?.pruning,
            fertilization: geminiData.maintenanceGuidelines?.fertilization,
            pest_management: geminiData.maintenanceGuidelines?.pestManagement,
            disease_management: geminiData.maintenanceGuidelines?.diseaseManagement,
            seasonal_care: geminiData.maintenanceGuidelines?.seasonalCare,
            
            // Uses and Benefits
            practical_uses: geminiData.practicalUses,
            medicinal_uses: Array.isArray(geminiData.practicalUses) ? 
              geminiData.practicalUses.filter(use => use.toLowerCase().includes('medicinal')).join(', ') : '',
            ornamental_uses: Array.isArray(geminiData.practicalUses) ? 
              geminiData.practicalUses.filter(use => use.toLowerCase().includes('ornamental') || use.toLowerCase().includes('landscape')).join(', ') : '',
            wildlife_value: Array.isArray(geminiData.practicalUses) ? 
              geminiData.practicalUses.filter(use => use.toLowerCase().includes('wildlife') || use.toLowerCase().includes('pollinator')).join(', ') : '',
            cultural_significance: Array.isArray(geminiData.practicalUses) ? 
              geminiData.practicalUses.filter(use => use.toLowerCase().includes('cultural') || use.toLowerCase().includes('historical')).join(', ') : '',
            
            // Additional Information
            interesting_facts: geminiData.facts,
            additional_information: geminiData.additionalInformation,
            propagation_methods: Array.isArray(geminiData.additionalInformation) ? 
              geminiData.additionalInformation.filter(info => info.toLowerCase().includes('propagation')).join(', ') : '',
            companion_plants: Array.isArray(geminiData.additionalInformation) ? 
              geminiData.additionalInformation.filter(info => info.toLowerCase().includes('companion')).join(', ') : ''
          };
          
          console.log('Successfully processed comprehensive plant data from Gemini');
        }
      } catch (geminiError) {
        console.error('Error fetching from Gemini API:', geminiError);
        // Continue with fallback data sources if Gemini fails
      }

      // Fallback: Fetch from GBIF if available
      if (gbifId) {
        try {
        const gbifResponse = await axios.get(`https://api.gbif.org/v1/species/${gbifId}`);
        const gbifData = gbifResponse.data;
        
          // Only update if we don't already have this data from Gemini
          if (!details.conservation_status) {
        details.conservation_status = gbifData.conservationStatus?.status || 'Not evaluated';
          }
          if (!details.native_range) {
        details.native_range = gbifData.distribution?.native || 'Unknown';
          }
          if (!details.habitat) {
        details.habitat = gbifData.habitat || 'Unknown';
          }
          if (!details.threats) {
        details.threats = gbifData.threats || [];
          }
        } catch (gbifError) {
          console.error('Error fetching from GBIF:', gbifError);
        }
      }

      // Enhanced fallback: Try external botanical APIs
      try {
        // Fetch from Plants of the World Online (if not already comprehensive from Gemini)
        if (!details.morphological_characteristics) {
      const powoResponse = await axios.get(
        `https://powo.science.kew.org/api/2/taxon/${encodeURIComponent(scientificName)}`
      );
      const powoData = powoResponse.data;

      if (powoData) {
        details.morphological_characteristics = powoData.description || 'Not available';
        details.cultivation_requirements = powoData.cultivation || 'Not available';
        details.uses = powoData.uses || 'Not available';
        details.distribution = powoData.distribution || 'Not available';
          }
        }
      } catch (powoError) {
        console.error('Error fetching from POWO:', powoError);
      }

      // Fetch from Tropicos for taxonomic verification
      try {
      const tropicosResponse = await axios.get(
        `https://services.tropicos.org/Name/Search?name=${encodeURIComponent(scientificName)}&type=exact&format=json`
      );
      const tropicosData = tropicosResponse.data;

      if (tropicosData && tropicosData.length > 0) {
          // Only update if we don't have comprehensive taxonomy from Gemini
          if (!details.taxonomy || !details.taxonomy.family) {
        details.family = tropicosData[0].Family || 'Unknown';
        details.genus = tropicosData[0].Genus || 'Unknown';
        details.species = tropicosData[0].Species || 'Unknown';
          }
        }
      } catch (tropicosError) {
        console.error('Error fetching from Tropicos:', tropicosError);
      }

      setAdditionalDetails(details);
    } catch (error) {
      console.error('Error fetching additional details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchClimateData = async (latitude, longitude) => {
    try {
      console.log('Fetching climate data for:', latitude, longitude);
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      
      if (!apiKey) {
        console.error('OpenWeatherMap API key is not set');
        return;
      }

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      );
      
      console.log('Climate data response:', response.data);
      
      const data = response.data;
      const climateInfo = {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        weather: data.weather[0].main,
        description: data.weather[0].description,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure,
        timestamp: new Date().toISOString()
      };
      
      console.log('Processed climate data:', climateInfo);
      setClimateData(climateInfo);
    } catch (error) {
      console.error('Error fetching climate data:', error.response?.data || error.message);
    }
  };

  // Share functions
  const handleCopyToClipboard = async () => {
    if (!result?.suggestions?.[0]) return;

    const plantData = result.suggestions[0];
    const mergedDetails = { ...plantData.plant_details, ...additionalDetails };

    // Add location and climate data
    if (locationData) {
      mergedDetails.location = `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
    }
    if (climateData) {
      mergedDetails.climate = climateData.weather;
      mergedDetails.temperature = `${climateData.temperature}°C`;
      mergedDetails.humidity = `${climateData.humidity}%`;
      mergedDetails.wind_speed = `${climateData.windSpeed} m/s`;
      mergedDetails.pressure = `${climateData.pressure} hPa`;
      mergedDetails.weather = climateData.description;
    }

    let textData = `🌿 PLANT IDENTIFICATION REPORT 🌿\n\n`;
    textData += `Plant Name: ${plantData.plant_name}\n`;
    textData += `Scientific Name: ${plantData.scientific_name}\n`;
    textData += `Confidence: ${Math.round(plantData.probability * 100)}%\n\n`;

    // Add all available data
    const sections = getPlantDataSections(mergedDetails);
    sections.forEach(section => {
      const sectionData = section.fields
        .filter(field => field.value && field.value !== 'Not available' && field.value !== 'Unknown')
        .map(field => `${field.label}: ${formatValue(field.value)}`)
        .join('\n');
      
      if (sectionData) {
        textData += `${section.title.toUpperCase()}\n`;
        textData += `${sectionData}\n\n`;
      }
    });

    textData += `Generated on: ${new Date().toLocaleString()}\n`;

    try {
      await navigator.clipboard.writeText(textData);
      alert('Plant data copied to clipboard!');
      setShareDropdownOpen(false);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!result?.suggestions?.[0]) return;

    // Temporarily disable PDF functionality to fix build issue
    alert('PDF download feature is temporarily disabled. Please use the copy text feature instead.');
    setShareDropdownOpen(false);
    return;

    /* Commented out until build issue is resolved
    try {
      // Dynamic import for html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const plantData = result.suggestions[0];
      const mergedDetails = { ...plantData.plant_details, ...additionalDetails };

    // Add location and climate data
    if (locationData) {
      mergedDetails.location = `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
    }
    if (climateData) {
      mergedDetails.climate = climateData.weather;
      mergedDetails.temperature = `${climateData.temperature}°C`;
      mergedDetails.humidity = `${climateData.humidity}%`;
      mergedDetails.wind_speed = `${climateData.windSpeed} m/s`;
      mergedDetails.pressure = `${climateData.pressure} hPa`;
      mergedDetails.weather = climateData.description;
    }

    // Create a temporary element for PDF content
    const pdfElement = document.createElement('div');
    pdfElement.style.padding = '20px';
    pdfElement.style.fontFamily = 'Arial, sans-serif';
    pdfElement.style.lineHeight = '1.6';
    pdfElement.style.color = '#333';
    pdfElement.style.backgroundColor = 'white';

    const sections = getPlantDataSections(mergedDetails);
    
    pdfElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2ecc71; padding-bottom: 20px;">
        <h1 style="color: #2ecc71; font-size: 28px; margin: 0; font-weight: bold;">🌿 Plant Identification Report</h1>
        <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">Generated on: ${new Date().toLocaleString()}</p>
      </div>

      <div style="margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 5px solid #2ecc71;">
        <h2 style="color: #2ecc71; font-size: 24px; margin: 0 0 10px 0;">${plantData.plant_name}</h2>
        <p style="font-style: italic; color: #666; font-size: 18px; margin: 0 0 15px 0;">${plantData.scientific_name}</p>
        <div style="background: #e3f2fd; padding: 10px 15px; border-radius: 20px; display: inline-block;">
          <strong style="color: #1976d2;">Confidence: ${Math.round(plantData.probability * 100)}%</strong>
        </div>
      </div>

      ${sections.map(section => {
        const sectionData = section.fields
          .filter(field => field.value && field.value !== 'Not available' && field.value !== 'Unknown')
          .map(field => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #555; width: 40%;">${field.label}</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #333;">${formatValue(field.value)}</td>
            </tr>
          `).join('');

        if (!sectionData) return '';

        return `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 15px 0; padding: 10px 0; border-bottom: 2px solid #ecf0f1;">
              <span style="margin-right: 8px;">${section.icon}</span>${section.title}
            </h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${sectionData}
            </table>
          </div>
        `;
      }).join('')}

      <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>This report was generated by Herb-AI Authenticate</p>
        <p>For more information, visit our website</p>
      </div>
    `;

    // Temporarily add to DOM
    document.body.appendChild(pdfElement);

    const options = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `plant-identification-${plantData.plant_name?.replace(/\s+/g, '-') || 'report'}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true
      }
    };

      html2pdf().set(options).from(pdfElement).save().then(() => {
        // Remove temporary element
        document.body.removeChild(pdfElement);
        setShareDropdownOpen(false);
      }).catch(error => {
        console.error('Error generating PDF:', error);
        document.body.removeChild(pdfElement);
        alert('Error generating PDF. Please try again.');
      });
    } catch (error) {
      console.error('Error loading html2pdf:', error);
      alert('Error loading PDF generator. Please try again.');
    }
    */
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

  const getPlantDataSections = (mergedDetails) => {
    return [
      {
        title: 'Basic Information',
        icon: '🏷️',
        fields: [
          { key: 'common_names', label: 'Common Names', value: mergedDetails.common_names },
          { key: 'scientific_name', label: 'Scientific Name', value: mergedDetails.scientific_name },
          { key: 'family', label: 'Family', value: mergedDetails.taxonomy?.family || mergedDetails.family },
          { key: 'genus', label: 'Genus', value: mergedDetails.taxonomy?.genus },
          { key: 'species', label: 'Species', value: mergedDetails.taxonomy?.species },
          { key: 'rank', label: 'Taxonomic Rank', value: mergedDetails.rank }
        ]
      },
      {
        title: 'Taxonomy',
        icon: '🔬',
        fields: [
          { key: 'kingdom', label: 'Kingdom', value: mergedDetails.taxonomy?.kingdom },
          { key: 'phylum', label: 'Phylum', value: mergedDetails.taxonomy?.phylum },
          { key: 'class', label: 'Class', value: mergedDetails.taxonomy?.class },
          { key: 'order', label: 'Order', value: mergedDetails.taxonomy?.order },
          { key: 'family', label: 'Family', value: mergedDetails.taxonomy?.family },
          { key: 'genus', label: 'Genus', value: mergedDetails.taxonomy?.genus },
          { key: 'species', label: 'Species', value: mergedDetails.taxonomy?.species }
        ]
      },
      {
        title: 'Native Range & Distribution',
        icon: '🌍',
        fields: [
          { key: 'native_range', label: 'Native Range', value: mergedDetails.native_range },
          { key: 'distribution', label: 'Current Distribution', value: mergedDetails.distribution },
          { key: 'habitat', label: 'Natural Habitat', value: mergedDetails.habitat },
          { key: 'climate', label: 'Climate Preference', value: mergedDetails.climate },
          { key: 'altitude_range', label: 'Altitude Range', value: mergedDetails.altitude_range },
          { key: 'hardiness_zone', label: 'Hardiness Zone', value: mergedDetails.hardiness_zone }
        ]
      },
      {
        title: 'Conservation Status',
        icon: '🛡️',
        fields: [
          { key: 'conservation_status', label: 'Conservation Status', value: mergedDetails.conservation_status },
          { key: 'threats', label: 'Threats', value: mergedDetails.threats },
          { key: 'invasive', label: 'Invasive Species', value: mergedDetails.invasive ? 'Yes' : mergedDetails.invasive === false ? 'No' : 'Unknown' },
          { key: 'rare', label: 'Rare Species', value: mergedDetails.rare ? 'Yes' : mergedDetails.rare === false ? 'No' : 'Unknown' },
          { key: 'endangered', label: 'Endangered', value: mergedDetails.endangered ? 'Yes' : mergedDetails.endangered === false ? 'No' : 'Unknown' },
          { key: 'population_trend', label: 'Population Trend', value: mergedDetails.population_trend },
          { key: 'protection_status', label: 'Protection Status', value: mergedDetails.protection_status }
        ]
      },
      {
        title: 'Morphological Characteristics',
        icon: '🔍',
        fields: [
          { key: 'plant_habit', label: 'Plant Habit', value: mergedDetails.plant_habit },
          { key: 'life_cycle', label: 'Life Cycle', value: mergedDetails.life_cycle },
          { key: 'growth_habit', label: 'Growth Habit', value: mergedDetails.growth_habit },
          { key: 'growth_rate', label: 'Growth Rate', value: mergedDetails.growth_rate },
          { key: 'height', label: 'Height', value: mergedDetails.height },
          { key: 'spread', label: 'Spread', value: mergedDetails.spread },
          { key: 'leaf_type', label: 'Leaf Type', value: mergedDetails.leaf_type },
          { key: 'leaf_shape', label: 'Leaf Shape', value: mergedDetails.leaf_shape },
          { key: 'leaf_color', label: 'Leaf Color', value: mergedDetails.leaf_color },
          { key: 'flower_color', label: 'Flower Color', value: mergedDetails.flower_color },
          { key: 'bloom_time', label: 'Bloom Time', value: mergedDetails.bloom_time },
          { key: 'fruit_color', label: 'Fruit Color', value: mergedDetails.fruit_color },
          { key: 'bark_color', label: 'Bark Color', value: mergedDetails.bark_color },
          { key: 'bark_texture', label: 'Bark Texture', value: mergedDetails.bark_texture }
        ]
      },
      {
        title: 'Cultivation Requirements',
        icon: '🌱',
        fields: [
          { key: 'sunlight', label: 'Light Requirements', value: mergedDetails.sunlight },
          { key: 'watering', label: 'Water Requirements', value: mergedDetails.watering },
          { key: 'soil', label: 'Soil Requirements', value: mergedDetails.soil },
          { key: 'ph_minimum', label: 'Minimum pH', value: mergedDetails.ph_minimum },
          { key: 'ph_maximum', label: 'Maximum pH', value: mergedDetails.ph_maximum },
          { key: 'temperature_range', label: 'Temperature Range', value: mergedDetails.temperature_range },
          { key: 'humidity', label: 'Humidity Requirements', value: mergedDetails.humidity },
          { key: 'fertilizer', label: 'Fertilizer Needs', value: mergedDetails.fertilizer },
          { key: 'propagation_methods', label: 'Propagation Methods', value: mergedDetails.propagation_methods },
          { key: 'planting_time', label: 'Best Planting Time', value: mergedDetails.planting_time },
          { key: 'companion_plants', label: 'Companion Plants', value: mergedDetails.companion_plants }
        ]
      },
      {
        title: 'Maintenance Guidelines',
        icon: '✂️',
        fields: [
          { key: 'maintenance', label: 'Maintenance Level', value: mergedDetails.maintenance },
          { key: 'pruning', label: 'Pruning Requirements', value: mergedDetails.pruning },
          { key: 'pruning_time', label: 'Best Pruning Time', value: mergedDetails.pruning_time },
          { key: 'fertilization', label: 'Fertilization Schedule', value: mergedDetails.fertilization },
          { key: 'pest_management', label: 'Common Pests', value: mergedDetails.pest_management },
          { key: 'disease_management', label: 'Common Diseases', value: mergedDetails.disease_management },
          { key: 'winter_care', label: 'Winter Care', value: mergedDetails.winter_care },
          { key: 'common_problems', label: 'Common Problems', value: mergedDetails.common_problems }
        ]
      },
      {
        title: 'Environmental Tolerance',
        icon: '🌡️',
        fields: [
          { key: 'drought_tolerance', label: 'Drought Tolerance', value: mergedDetails.drought_tolerance },
          { key: 'salt_tolerance', label: 'Salt Tolerance', value: mergedDetails.salt_tolerance },
          { key: 'frost_tolerance', label: 'Frost Tolerance', value: mergedDetails.frost_tolerance },
          { key: 'heat_tolerance', label: 'Heat Tolerance', value: mergedDetails.heat_tolerance },
          { key: 'wind_tolerance', label: 'Wind Tolerance', value: mergedDetails.wind_tolerance },
          { key: 'pollution_tolerance', label: 'Pollution Tolerance', value: mergedDetails.pollution_tolerance },
          { key: 'flood_tolerance', label: 'Flood Tolerance', value: mergedDetails.flood_tolerance }
        ]
      },
      {
        title: 'Practical Uses',
        icon: '💡',
        fields: [
          { key: 'medicinal_uses', label: 'Medicinal Uses', value: mergedDetails.medicinal_uses },
          { key: 'culinary_uses', label: 'Culinary Uses', value: mergedDetails.culinary_uses },
          { key: 'edible_parts', label: 'Edible Parts', value: mergedDetails.edible_parts },
          { key: 'industrial_uses', label: 'Industrial Uses', value: mergedDetails.industrial_uses },
          { key: 'ornamental_uses', label: 'Ornamental Uses', value: mergedDetails.ornamental_uses },
          { key: 'landscape_uses', label: 'Landscape Uses', value: mergedDetails.landscape_uses },
          { key: 'wood_uses', label: 'Wood Uses', value: mergedDetails.wood_uses },
          { key: 'fiber_uses', label: 'Fiber Uses', value: mergedDetails.fiber_uses }
        ]
      },
      {
        title: 'Ecological Benefits',
        icon: '🦋',
        fields: [
          { key: 'attracts', label: 'Attracts Wildlife', value: mergedDetails.attracts },
          { key: 'pollinator_support', label: 'Pollinator Support', value: mergedDetails.pollinator_support },
          { key: 'wildlife_value', label: 'Wildlife Value', value: mergedDetails.wildlife_value },
          { key: 'soil_benefits', label: 'Soil Benefits', value: mergedDetails.soil_benefits },
          { key: 'erosion_control', label: 'Erosion Control', value: mergedDetails.erosion_control ? 'Yes' : 'No' },
          { key: 'carbon_sequestration', label: 'Carbon Sequestration', value: mergedDetails.carbon_sequestration },
          { key: 'biodiversity_support', label: 'Biodiversity Support', value: mergedDetails.biodiversity_support }
        ]
      },
      {
        title: 'Cultural Significance',
        icon: '🏛️',
        fields: [
          { key: 'cultural_significance', label: 'Cultural Significance', value: mergedDetails.cultural_significance },
          { key: 'traditional_uses', label: 'Traditional Uses', value: mergedDetails.traditional_uses },
          { key: 'mythology', label: 'Mythology & Folklore', value: mergedDetails.mythology },
          { key: 'symbolism', label: 'Symbolism', value: mergedDetails.symbolism },
          { key: 'historical_importance', label: 'Historical Importance', value: mergedDetails.historical_importance },
          { key: 'ceremonial_uses', label: 'Ceremonial Uses', value: mergedDetails.ceremonial_uses }
        ]
      },
      {
        title: 'Safety Information',
        icon: '⚠️',
        fields: [
          { key: 'poisonous_to_humans', label: 'Toxic to Humans', value: mergedDetails.poisonous_to_humans ? 'Yes' : mergedDetails.poisonous_to_humans === false ? 'No' : 'Unknown' },
          { key: 'poisonous_to_pets', label: 'Toxic to Pets', value: mergedDetails.poisonous_to_pets ? 'Yes' : mergedDetails.poisonous_to_pets === false ? 'No' : 'Unknown' },
          { key: 'toxicity_level', label: 'Toxicity Level', value: mergedDetails.toxicity_level },
          { key: 'toxic_parts', label: 'Toxic Parts', value: mergedDetails.toxic_parts },
          { key: 'symptoms', label: 'Toxicity Symptoms', value: mergedDetails.symptoms },
          { key: 'skin_irritation', label: 'Skin Irritation', value: mergedDetails.skin_irritation ? 'Yes' : 'No' },
          { key: 'allergenic_potential', label: 'Allergenic Potential', value: mergedDetails.allergenic_potential },
          { key: 'handling_precautions', label: 'Handling Precautions', value: mergedDetails.handling_precautions }
        ]
      },
      {
        title: 'Interesting Facts',
        icon: '💭',
        fields: [
          { key: 'interesting_facts', label: 'Interesting Facts', value: mergedDetails.interesting_facts },
          { key: 'unique_features', label: 'Unique Features', value: mergedDetails.unique_features },
          { key: 'evolutionary_adaptations', label: 'Evolutionary Adaptations', value: mergedDetails.evolutionary_adaptations },
          { key: 'discovery_story', label: 'Discovery Story', value: mergedDetails.discovery_story },
          { key: 'nomenclature_origin', label: 'Name Origin', value: mergedDetails.nomenclature_origin },
          { key: 'world_records', label: 'World Records', value: mergedDetails.world_records }
        ]
      },
      {
        title: 'Related Species',
        icon: '🌿',
        fields: [
          { key: 'cultivars', label: 'Popular Cultivars', value: mergedDetails.cultivars },
          { key: 'varieties', label: 'Varieties', value: mergedDetails.varieties },
          { key: 'hybrids', label: 'Hybrids', value: mergedDetails.hybrids },
          { key: 'close_relatives', label: 'Close Relatives', value: mergedDetails.close_relatives },
          { key: 'similar_species', label: 'Similar Species', value: mergedDetails.similar_species }
        ]
      },
      {
        title: 'Current Environment',
        icon: '📍',
        fields: [
          { key: 'location', label: 'Capture Location', value: mergedDetails.location },
          { key: 'weather', label: 'Current Weather', value: mergedDetails.weather },
          { key: 'temperature', label: 'Temperature', value: mergedDetails.temperature },
          { key: 'humidity', label: 'Humidity', value: mergedDetails.humidity },
          { key: 'wind_speed', label: 'Wind Speed', value: mergedDetails.wind_speed },
          { key: 'pressure', label: 'Atmospheric Pressure', value: mergedDetails.pressure }
        ]
      }
    ];
  };

  const renderPlantDetails = (details) => {
    if (!details) return null;

    console.log('Current location data:', locationData);
    console.log('Current climate data:', climateData);

    const mergedDetails = {
      ...details,
      ...additionalDetails
    };

    // Add location and climate data to the details
    if (locationData) {
      mergedDetails.location = `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
    }

    if (climateData) {
      mergedDetails.climate = climateData.weather;
      mergedDetails.temperature = `${climateData.temperature}°C`;
      mergedDetails.humidity = `${climateData.humidity}%`;
      mergedDetails.wind_speed = `${climateData.windSpeed} m/s`;
      mergedDetails.pressure = `${climateData.pressure} hPa`;
      mergedDetails.weather = climateData.description;
    }

    const sections = getPlantDataSections(mergedDetails);

    return (
      <div className="modern-plant-details">
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
        {loadingDetails && (
          <motion.div 
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="loading-spinner"></div>
            <span>Loading additional botanical information...</span>
          </motion.div>
        )}
      </div>
    );
  };

  // Update the result handling to fetch additional details
  useEffect(() => {
    if (result?.suggestions?.[0]?.plant_details) {
      const { scientific_name, gbif_id } = result.suggestions[0].plant_details;
      fetchAdditionalDetails(scientific_name, gbif_id);
    }
  }, [result]);

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
    <div className="modern-identify-container">
      <motion.div
        className="identify-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="hero-section">
          <h1 className="main-title">Plant Identification</h1>
          <p className="subtitle">Discover nature's secrets with AI-powered plant recognition</p>
        </div>

        {!previewUrl ? (
          <div className="upload-section">
            <div className="upload-options">
              <motion.button
                className="option-card camera-option"
                onClick={openCamera}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="option-icon">📷</div>
                <h3>Take Photo</h3>
                <p>Use your camera to capture the plant</p>
              </motion.button>

              <motion.button
                className="option-card upload-option"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="option-icon">📁</div>
                <h3>Upload Image</h3>
                <p>Choose from your gallery</p>
              </motion.button>
            </div>

            <div className="divider-line">
              <span>or</span>
            </div>

            <motion.div
              className="drop-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01 }}
            >
              <div className="drop-content">
                <div className="drop-icon">📸</div>
                <h3>Drag & Drop</h3>
                <p>Drop your plant image here</p>
                <span className="file-info">Max 5MB • JPG, PNG, GIF</span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="preview-section">
            <motion.div 
              className="image-preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <img src={previewUrl} alt="Selected plant" className="preview-img" />
              <button
                className="remove-btn"
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedImage(null);
                  setResult(null);
                }}
              >
                ✕
              </button>
            </motion.div>
            
            <div className="change-options">
              <button className="change-btn" onClick={openCamera}>
                📷 Take New Photo
              </button>
              <button className="change-btn" onClick={() => fileInputRef.current?.click()}>
                📁 Choose Different Image
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="file-input"
          hidden
        />

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

        <motion.button
          className="identify-btn"
          onClick={handleSubmit}
          disabled={!selectedImage || isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <div className="btn-loading">
              <div className="btn-spinner"></div>
              <span>Identifying...</span>
            </div>
          ) : (
            <>
              <span className="btn-icon">🔍</span>
              <span>Identify Plant</span>
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {result && (
            <motion.div
              className="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              ref={plantDataRef}
            >
              <div className="results-header">
                <div className="header-content">
                  <h2>Identification Results</h2>
                  <div className="share-section">
                    <motion.button
                      className="share-btn"
                      onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="share-icon">📤</span>
                      <span>Share</span>
                    </motion.button>
                    
                    <AnimatePresence>
                      {shareDropdownOpen && (
                        <motion.div
                          className="share-dropdown"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <button className="share-option" onClick={handleCopyToClipboard}>
                            <span className="option-icon">📋</span>
                            <span>Copy to Clipboard</span>
                          </button>
                          <button className="share-option" onClick={handleDownloadPDF}>
                            <span className="option-icon">📄</span>
                            <span>Download PDF</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="plant-result-card">
                  <div className="result-header">
                    <div className="plant-info">
                      <h3 className="plant-name">{result.suggestions[0].plant_name}</h3>
                      <p className="scientific-name">{result.suggestions[0].scientific_name}</p>
                    </div>
                    <div className="confidence-badge">
                      <span className="confidence-label">Confidence</span>
                      <span className="confidence-value">{Math.round(result.suggestions[0].probability * 100)}%</span>
                    </div>
                  </div>
                  
                  {result.suggestions[0].plant_details && (
                    <div className="plant-details-wrapper">
                      {renderPlantDetails(result.suggestions[0].plant_details)}
                    </div>
                  )}
                </div>
              )}
              
              {result.suggestions && result.suggestions.length > 0 && result.suggestions[0].plant_details?.gbif_id && (
                <div className="map-section">
                  <PlantDistributionMap
                    plantName={result.suggestions[0].plant_name}
                    scientificName={result.suggestions[0].scientific_name}
                    gbifId={result.suggestions[0].plant_details.gbif_id}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showCamera && (
          <Camera 
            onCapture={handleCameraCapture}
            onClose={closeCamera}
          />
        )}
      </motion.div>
    </div>
  );
};

export default Identify;
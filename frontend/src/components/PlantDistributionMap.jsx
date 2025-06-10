import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PlantDistributionMap = ({ plantName, scientificName, gbifId }) => {
  const [distributionData, setDistributionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDistributionData = async () => {
      try {
        setLoading(true);
        if (!gbifId) {
          throw new Error('No GBIF ID available for this plant');
        }

        const response = await fetch(
          `https://api.gbif.org/v1/occurrence/search?taxonKey=${gbifId}&limit=300&hasCoordinate=true`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch distribution data');
        }

        const data = await response.json();
        
        // Process the data to get unique locations with descriptions
        const uniqueLocations = data.results.reduce((acc, occurrence) => {
          const key = `${occurrence.decimalLatitude},${occurrence.decimalLongitude}`;
          if (!acc[key]) {
            acc[key] = {
              location: occurrence.country || 'Unknown Location',
              latitude: occurrence.decimalLatitude,
              longitude: occurrence.decimalLongitude,
              description: `Found in ${occurrence.country || 'Unknown Location'}${occurrence.locality ? `, ${occurrence.locality}` : ''}`
            };
          }
          return acc;
        }, {});

        setDistributionData(Object.values(uniqueLocations));
      } catch (err) {
        setError(err.message || 'Failed to fetch distribution data');
        console.error('Error fetching distribution data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (gbifId) {
      fetchDistributionData();
    }
  }, [gbifId]);

  if (loading) {
    return <div className="map-loading">Loading distribution data...</div>;
  }

  if (error) {
    return <div className="map-error">{error}</div>;
  }

  if (distributionData.length === 0) {
    return <div className="map-no-data">No distribution data available for this plant</div>;
  }

  return (
    <div className="distribution-map-container">
      <h3>Geographical Distribution</h3>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {distributionData.map((location, index) => (
          <Marker
            key={index}
            position={[location.latitude, location.longitude]}
          >
            <Popup>
              <div>
                <h4>{location.location}</h4>
                <p>{location.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default PlantDistributionMap; 
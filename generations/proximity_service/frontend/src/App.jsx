/**
 * Main App Component
 * Proximity Service with Search and Business Management
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// Leaflet will be loaded from CDN, accessed via window.L
const API_BASE = 'http://localhost:3000/v1';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchParams, setSearchParams] = useState({
    location: '',
    preference: '',
    radius: '1'
  });
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchCoords, setSearchCoords] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 5;

  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Initialize map when search results are available
  useEffect(() => {
    if (hasSearched && searchCoords && window.L && mapRef.current && !mapInstance.current) {
      // Create map centered on search location
      const map = window.L.map(mapRef.current).setView([searchCoords.lat, searchCoords.lon], 14);

      // Add tile layer
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add marker for search location
      const searchMarker = window.L.marker([searchCoords.lat, searchCoords.lon])
        .addTo(map)
        .bindPopup(`<b>Search Location</b><br/>${searchParams.location}`)
        .openPopup();

      mapInstance.current = map;
    }

    // Update markers when results change
    if (mapInstance.current && searchResults.length > 0) {
      // Clear existing markers except search location
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof window.L.Marker && layer.getPopup()?.getContent()?.includes('Search Location') === false) {
          mapInstance.current.removeLayer(layer);
        }
      });

      // Add markers for each business
      searchResults.forEach((business, index) => {
        const marker = window.L.marker([business.latitude, business.longitude])
          .addTo(mapInstance.current);

        const popupContent = `
          <div class="p-2">
            <b>${business.name}</b><br/>
            ${business.description || ''}<br/>
            <small>${business.semantic_search_blob || ''}</small>
          </div>
        `;

        marker.bindPopup(popupContent);
      });
    }
  }, [hasSearched, searchCoords, searchResults]);

  // Handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setCurrentPage(1);

    try {
      // Simple geocoding: parse lat/lon from location or use default Singapore coords
      let lat = 1.2897;  // Default: Singapore CBD
      let lon = 103.8501;

      // Try to extract coordinates from location field (format: "lat,lon" or use default)
      const locationParts = searchParams.location.split(',');
      if (locationParts.length === 2) {
        const parsedLat = parseFloat(locationParts[0].trim());
        const parsedLon = parseFloat(locationParts[1].trim());
        if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
          lat = parsedLat;
          lon = parsedLon;
        }
      }

      setSearchCoords({ lat, lon });

      // Build API URL
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        radius: searchParams.radius,
        count: '20' // Get more results for pagination
      });

      if (searchParams.preference) {
        params.append('preference', searchParams.preference);
      }

      const response = await fetch(`${API_BASE}/search/nearby?${params}`);
      const data = await response.json();

      setSearchResults(data.results || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle business click to show details
  const handleBusinessClick = async (businessId) => {
    try {
      const response = await fetch(`${API_BASE}/business/${businessId}`);
      const business = await response.json();
      setSelectedBusiness(business);
    } catch (error) {
      console.error('Failed to load business details:', error);
    }
  };

  // Pagination
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = searchResults.slice(indexOfFirstResult, indexOfLastResult);
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);

  return (
    <Router>
      <div className="min-h-screen bg-white">
        {/* Header with Sign In/Out */}
        <header className="bg-violet-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-semibold">Proximity Service</h1>
            <div>
              {isAuthenticated ? (
                <button className="bg-white text-violet-600 px-4 py-2 rounded">
                  Avatar
                </button>
              ) : (
                <button className="bg-white text-violet-600 px-4 py-2 rounded">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Sticky Search Bar */}
        <div className="sticky top-0 bg-white border-b shadow-sm p-4 z-10">
          <div className="container mx-auto">
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                name="location"
                value={searchParams.location}
                onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                placeholder="where (e.g., 1.2897,103.8501 or location name)"
                className="flex-1 px-4 py-2 border rounded"
                id="location-input"
              />
              <input
                type="text"
                name="preference"
                value={searchParams.preference}
                onChange={(e) => setSearchParams({ ...searchParams, preference: e.target.value })}
                placeholder="what preference (e.g., cafe with good wifi)"
                className="flex-1 px-4 py-2 border rounded"
                id="preference-input"
              />
              <select
                name="radius"
                value={searchParams.radius}
                onChange={(e) => setSearchParams({ ...searchParams, radius: e.target.value })}
                className="px-4 py-2 border rounded"
                id="radius-select"
              >
                <option value="1">1 km</option>
                <option value="5">5 km</option>
              </select>
              <button
                type="submit"
                className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
                disabled={isLoading}
                id="search-button"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto p-4">
          {!hasSearched ? (
            <div className="text-center py-20">
              <h2 className="text-3xl font-semibold text-gray-800 mb-4">
                Welcome to Proximity Service
              </h2>
              <p className="text-gray-600 mb-8">
                Discover nearby places with semantic search powered by AI
              </p>
              <p className="text-gray-500">
                Enter a location (lat,lon) and preference to search
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Map */}
              <div className="order-1">
                <div
                  ref={mapRef}
                  className="w-full h-96 rounded-lg border shadow-sm"
                  id="search-map"
                ></div>
              </div>

              {/* Results */}
              <div className="order-2">
                <h2 className="text-2xl font-semibold mb-4">
                  Search Results ({searchResults.length})
                </h2>

                {currentResults.length === 0 ? (
                  <p className="text-gray-500">No results found</p>
                ) : (
                  <div className="space-y-4" id="search-results">
                    {currentResults.map((business, index) => (
                      <div
                        key={business.id}
                        onClick={() => handleBusinessClick(business.id)}
                        className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition-shadow business-card"
                        data-business-id={business.id}
                      >
                        <h3 className="text-xl font-semibold mb-2">{business.name}</h3>
                        <p className="text-gray-600 mb-2">{business.description}</p>
                        <p className="text-sm text-gray-500">{business.address}</p>
                        {business.distance && (
                          <p className="text-sm text-orange-600 mt-2">
                            Distance: {Math.round(business.distance)}m
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Business Details Modal */}
        {selectedBusiness && (
          <div
            className="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedBusiness(null)}
            id="business-details-modal"
          >
            <div
              className="modal-content bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-semibold">{selectedBusiness.name}</h2>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  id="close-modal"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-800">{selectedBusiness.address}</p>
                </div>

                {selectedBusiness.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-800">{selectedBusiness.description}</p>
                  </div>
                )}

                {selectedBusiness.semantic_search_blob && (
                  <div>
                    <p className="text-sm text-gray-500">Review Summary</p>
                    <p className="text-gray-800">{selectedBusiness.semantic_search_blob}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;

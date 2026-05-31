/**
 * Main App Component
 * Proximity Service with Search and Business Management
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

// Leaflet will be loaded from CDN, accessed via window.L
const API_BASE = 'http://localhost:3000/v1';

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // { userId, username, token }
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInForm, setSignInForm] = useState({ username: '', password: '' });

  // Tab state
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'business'

  // Search state
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

  // Business management state
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [businessForm, setBusinessForm] = useState({
    name: '',
    address: '',
    postal_code: '',
    description: '',
    latitude: '',
    longitude: '',
    semantic_search_blob: ''
  });
  const [showBusinessMap, setShowBusinessMap] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const businessMapRef = useRef(null);
  const businessMapInstance = useRef(null);

  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (token && username && userId) {
      setUser({ token, username, userId });
      setIsAuthenticated(true);
    }
  }, []);

  // Load user's businesses when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.token && activeTab === 'business') {
      loadMyBusinesses();
    }
  }, [isAuthenticated, user, activeTab]);

  // Initialize map when search results are available
  useEffect(() => {
    if (hasSearched && searchCoords && window.L && mapRef.current && !mapInstance.current) {
      const map = window.L.map(mapRef.current).setView([searchCoords.lat, searchCoords.lon], 14);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const searchMarker = window.L.marker([searchCoords.lat, searchCoords.lon])
        .addTo(map)
        .bindPopup(`<b>Search Location</b><br/>${searchParams.location}`)
        .openPopup();

      mapInstance.current = map;
    }

    if (mapInstance.current && searchResults.length > 0) {
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof window.L.Marker && layer.getPopup()?.getContent()?.includes('Search Location') === false) {
          mapInstance.current.removeLayer(layer);
        }
      });

      searchResults.forEach((business) => {
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

  // Sign in handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signInForm)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.userId);
        // Use assign to trigger proper navigation event
        window.location.assign('/');
      } else {
        alert('Sign in failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please try again.');
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('search');
  };

  // Load user's businesses
  const loadMyBusinesses = async () => {
    try {
      // For now, we'll fetch all businesses and filter by owner
      // In a real app, the backend would have a dedicated endpoint
      const response = await fetch(`${API_BASE}/search/nearby?lat=1.2897&lon=103.8501&radius=50&count=100`);
      const data = await response.json();

      // Filter businesses owned by current user
      // We'll fetch each business details to check ownership
      const allBusinesses = data.results || [];
      const ownedBusinesses = [];

      for (const biz of allBusinesses.slice(0, 10)) { // Limit to avoid too many requests
        try {
          const detailResponse = await fetch(`${API_BASE}/business/${biz.id}`);
          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            if (detail.owner_id === user.userId) {
              ownedBusinesses.push(detail);
            }
          }
        } catch (err) {
          // Skip if we can't fetch details
        }
      }

      setMyBusinesses(ownedBusinesses);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    }
  };

  // Handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setCurrentPage(1);

    try {
      let lat = 1.2897;
      let lon = 103.8501;

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

      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        radius: searchParams.radius,
        count: '20'
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

  // Handle add business button
  const handleAddBusinessClick = () => {
    setEditingBusiness(null);
    setBusinessForm({
      name: '',
      address: '',
      postal_code: '',
      description: '',
      latitude: '',
      longitude: '',
      semantic_search_blob: ''
    });
    setShowBusinessForm(true);
    setShowBusinessMap(false);
  };

  // Handle edit business
  const handleEditBusinessClick = (business) => {
    setEditingBusiness(business);
    setBusinessForm({
      name: business.name || '',
      address: business.address || '',
      postal_code: business.postal_code || '',
      description: business.description || '',
      latitude: business.latitude?.toString() || '',
      longitude: business.longitude?.toString() || '',
      semantic_search_blob: business.semantic_search_blob || ''
    });
    setShowBusinessForm(true);
    setShowBusinessMap(false);
  };

  // Handle delete business
  const handleDeleteBusiness = async (businessId) => {
    if (window.confirm('Are you sure you want to delete this business?')) {
      try {
        const response = await fetch(`${API_BASE}/business/${businessId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (response.ok) {
          loadMyBusinesses();
          alert('Business deleted successfully');
        } else {
          alert('Failed to delete business');
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete business');
      }
    }
  };

  // Handle show in map marker (postal code to lat/lon)
  const handleShowInMap = async () => {
    if (!businessForm.postal_code) {
      alert('Please enter a postal code first');
      return;
    }

    // Simple Singapore postal code to coordinates mapping
    // In production, use a real geocoding API
    const postalCode = businessForm.postal_code;
    let lat, lon;

    // Map first 2 digits of Singapore postal code to approximate coordinates
    const district = parseInt(postalCode.substring(0, 2));

    if (district >= 1 && district <= 6) {
      lat = 1.2897; lon = 103.8501; // CBD
    } else if (district >= 7 && district <= 8) {
      lat = 1.2905; lon = 103.8520; // Beach Road
    } else if (district >= 9 && district <= 10) {
      lat = 1.2966; lon = 103.8520; // Orchard
    } else if (district >= 14 && district <= 16) {
      lat = 1.3048; lon = 103.8318; // Geylang
    } else {
      lat = 1.3521; lon = 103.8198; // Default Singapore center
    }

    setBusinessForm({ ...businessForm, latitude: lat.toString(), longitude: lon.toString() });
    setShowBusinessMap(true);

    // Initialize map for business form
    setTimeout(() => {
      if (window.L && businessMapRef.current && !businessMapInstance.current) {
        const map = window.L.map(businessMapRef.current).setView([lat, lon], 15);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        window.L.marker([lat, lon])
          .addTo(map)
          .bindPopup(`<b>${businessForm.name || 'Business Location'}</b>`)
          .openPopup();

        businessMapInstance.current = map;
      } else if (businessMapInstance.current) {
        businessMapInstance.current.setView([lat, lon], 15);
        businessMapInstance.current.eachLayer((layer) => {
          if (layer instanceof window.L.Marker) {
            businessMapInstance.current.removeLayer(layer);
          }
        });
        window.L.marker([lat, lon])
          .addTo(businessMapInstance.current)
          .bindPopup(`<b>${businessForm.name || 'Business Location'}</b>`)
          .openPopup();
      }
    }, 100);
  };

  // Handle submit business form
  const handleSubmitBusiness = async (e) => {
    e.preventDefault();

    const businessData = {
      name: businessForm.name,
      address: businessForm.address,
      postal_code: businessForm.postal_code,
      description: businessForm.description,
      latitude: parseFloat(businessForm.latitude),
      longitude: parseFloat(businessForm.longitude),
      semantic_search_blob: businessForm.semantic_search_blob
    };

    try {
      const url = editingBusiness
        ? `${API_BASE}/business/${editingBusiness.id}`
        : `${API_BASE}/business`;

      const method = editingBusiness ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(businessData)
      });

      if (response.ok) {
        alert(editingBusiness ? 'Business updated successfully' : 'Business created successfully');
        setShowBusinessForm(false);
        setShowBusinessMap(false);
        if (businessMapInstance.current) {
          businessMapInstance.current.remove();
          businessMapInstance.current = null;
        }
        loadMyBusinesses();
      } else {
        alert('Failed to save business');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to save business');
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
            <div className="user-controls">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="avatar">{user.username}</span>
                  <button
                    onClick={handleSignOut}
                    className="bg-white text-violet-600 px-4 py-2 rounded"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSignInModal(true)}
                  className="bg-white text-violet-600 px-4 py-2 rounded"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tab Navigation (only show Business tab when authenticated) */}
        {isAuthenticated && (
          <div className="bg-gray-100 border-b">
            <div className="container mx-auto flex gap-4 px-4">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-3 ${activeTab === 'search' ? 'bg-white border-t-2 border-violet-600 font-semibold' : 'text-gray-600'}`}
                role="tab"
              >
                Search
              </button>
              <button
                onClick={() => setActiveTab('business')}
                className={`px-6 py-3 ${activeTab === 'business' ? 'bg-white border-t-2 border-violet-600 font-semibold' : 'text-gray-600'}`}
                role="tab"
              >
                Business
              </button>
            </div>
          </div>
        )}

        {/* Content - Show based on active tab */}
        {activeTab === 'search' ? (
          <>
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

            {/* Search Results */}
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
                  <div className="order-1">
                    <div
                      ref={mapRef}
                      className="w-full h-96 rounded-lg border shadow-sm"
                      id="search-map"
                    ></div>
                  </div>

                  <div className="order-2">
                    <h2 className="text-2xl font-semibold mb-4">
                      Search Results ({searchResults.length})
                    </h2>

                    {currentResults.length === 0 ? (
                      <p className="text-gray-500">No results found</p>
                    ) : (
                      <div className="space-y-4" id="search-results">
                        {currentResults.map((business) => (
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
          </>
        ) : (
          /* Business Management Tab */
          <main className="container mx-auto p-4">
            {!showBusinessForm ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">My Businesses</h2>
                  <button
                    onClick={handleAddBusinessClick}
                    className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
                  >
                    Add Business
                  </button>
                </div>

                {myBusinesses.length === 0 ? (
                  <p className="text-gray-500">You don't have any businesses yet. Click "Add Business" to create one.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myBusinesses.map((business) => (
                      <div key={business.id} className="business-card border rounded-lg p-4 shadow-sm">
                        <h3 className="text-xl font-semibold mb-2">{business.name}</h3>
                        <p className="text-gray-600 mb-2">{business.description}</p>
                        <p className="text-sm text-gray-500 mb-4">{business.address}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBusinessClick(business)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBusiness(business.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Add/Edit Business Form */
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">
                    {editingBusiness ? 'Edit Business' : 'Add Business'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowBusinessForm(false);
                      setShowBusinessMap(false);
                      if (businessMapInstance.current) {
                        businessMapInstance.current.remove();
                        businessMapInstance.current = null;
                      }
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleSubmitBusiness} className="max-w-2xl">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={businessForm.name}
                        onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Address *</label>
                      <input
                        type="text"
                        name="address"
                        value={businessForm.address}
                        onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Postal Code *</label>
                      <input
                        type="text"
                        name="postal_code"
                        value={businessForm.postal_code}
                        onChange={(e) => setBusinessForm({ ...businessForm, postal_code: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        name="description"
                        value={businessForm.description}
                        onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        rows="3"
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Latitude *</label>
                        <input
                          type="number"
                          name="latitude"
                          step="any"
                          value={businessForm.latitude}
                          onChange={(e) => setBusinessForm({ ...businessForm, latitude: e.target.value })}
                          className="w-full px-4 py-2 border rounded"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Longitude *</label>
                        <input
                          type="number"
                          name="longitude"
                          step="any"
                          value={businessForm.longitude}
                          onChange={(e) => setBusinessForm({ ...businessForm, longitude: e.target.value })}
                          className="w-full px-4 py-2 border rounded"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleShowInMap}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Show in Map Marker
                      </button>
                    </div>

                    {showBusinessMap && (
                      <div
                        ref={businessMapRef}
                        className="map w-full h-64 rounded-lg border shadow-sm"
                        id="business-map"
                      ></div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">Semantic Search Blob (Optional)</label>
                      <textarea
                        name="semantic_search_blob"
                        value={businessForm.semantic_search_blob}
                        onChange={(e) => setBusinessForm({ ...businessForm, semantic_search_blob: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        rows="3"
                        placeholder="Keywords and description for semantic search..."
                      ></textarea>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
                      >
                        {editingBusiness ? 'Update Business' : 'Create Business'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBusinessForm(false);
                          setShowBusinessMap(false);
                          if (businessMapInstance.current) {
                            businessMapInstance.current.remove();
                            businessMapInstance.current = null;
                          }
                        }}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </main>
        )}

        {/* Sign In Modal */}
        {showSignInModal && (
          <div
            className="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSignInModal(false)}
          >
            <div
              className="bg-white rounded-lg p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
              <form onSubmit={handleSignIn}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={signInForm.username}
                      onChange={(e) => setSignInForm({ ...signInForm, username: e.target.value })}
                      className="w-full px-4 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                      className="w-full px-4 py-2 border rounded"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-violet-600 text-white px-6 py-2 rounded hover:bg-violet-700"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

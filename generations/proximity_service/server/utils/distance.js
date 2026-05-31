/**
 * Distance Calculation Utilities
 * Haversine formula for calculating distance between GPS coordinates
 */

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  // Convert degrees to radians
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  // Haversine formula
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c; // Distance in meters
}

/**
 * Filter businesses by distance from a point
 * @param {Array} businesses - Array of business objects with latitude and longitude
 * @param {number} centerLat - Center point latitude
 * @param {number} centerLon - Center point longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Array} - Filtered businesses with distance property added
 */
export function filterByDistance(businesses, centerLat, centerLon, radiusKm) {
  const radiusMeters = radiusKm * 1000;

  return businesses
    .map(business => ({
      ...business,
      distance: calculateDistance(
        centerLat,
        centerLon,
        business.latitude,
        business.longitude
      )
    }))
    .filter(business => business.distance <= radiusMeters);
}

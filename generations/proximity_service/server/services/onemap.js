/**
 * OneMap Service
 * Geocodes Singapore postal codes to latitude/longitude using the
 * OneMap Search API (https://www.onemap.gov.sg/apidocs/).
 */

const ONEMAP_SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search';

/**
 * Geocode a Singapore postal code into coordinates.
 * @param {string} postalCode - Singapore postal code (e.g., "200640")
 * @returns {Promise<{latitude: number, longitude: number, address: string, postal: string}|null>}
 *          Coordinates and address details, or null if no match was found.
 */
export async function geocodePostalCode(postalCode) {
  // Read lazily so it is available after dotenv.config() runs in index.js
  const apiToken = process.env.ONEMAP_API_TOKEN;

  if (!apiToken) {
    throw new Error('OneMap API token not configured (ONEMAP_API_TOKEN)');
  }

  const url = `${ONEMAP_SEARCH_URL}?searchVal=${encodeURIComponent(postalCode)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: apiToken
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OneMap API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  const latitude = parseFloat(result.LATITUDE);
  const longitude = parseFloat(result.LONGITUDE);

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    address: result.ADDRESS,
    postal: result.POSTAL
  };
}

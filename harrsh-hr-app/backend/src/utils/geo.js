/**
 * Haversine formula to calculate distance between two GPS points.
 * Returns distance in meters.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if user coordinates are within radius of office.
 * @returns {boolean}
 */
const isWithinRadius = (userLat, userLon, officeLat, officeLon, radiusMeters) => {
  const distance = haversineDistance(userLat, userLon, officeLat, officeLon);
  return distance <= radiusMeters;
};

module.exports = { haversineDistance, isWithinRadius };

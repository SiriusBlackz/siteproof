/**
 * Ray-casting algorithm for point-in-polygon detection.
 * @param point [longitude, latitude]
 * @param polygon GeoJSON Polygon coordinates (array of rings, each ring is array of [lng, lat])
 */
export function pointInPolygon(
  point: [number, number],
  polygon: number[][][]
): boolean {
  const [x, y] = point;
  // Check against the outer ring (index 0)
  const ring = polygon[0];
  if (!ring || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Get bounding box for a polygon.
 * @returns { sw: [lng, lat], ne: [lng, lat] }
 */
export function getPolygonBounds(polygon: number[][][]): {
  sw: [number, number];
  ne: [number, number];
} {
  const ring = polygon[0];
  if (!ring || ring.length === 0) {
    return { sw: [0, 0], ne: [0, 0] };
  }

  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return {
    sw: [minLng, minLat],
    ne: [maxLng, maxLat],
  };
}

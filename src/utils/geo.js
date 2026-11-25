// Map math for Checkout and Track Order (no network calls — those live in
// services/geoService.js).

// Straight-line distance between two points on Earth, in kilometres.
export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// One-line address saved on the order (what the admin and rider see).
export function formatDeliveryAddress({ details, street, city, zip }) {
  const main = [street, [city, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return details?.trim() ? `${details.trim()}, ${main}` : main;
}

// The point a given fraction (0..1) of the way along a route.
export function pointAlong(coords, fraction) {
  if (coords.length === 0) return null;
  if (fraction <= 0 || coords.length === 1) return coords[0];
  if (fraction >= 1) return coords[coords.length - 1];
  const legs = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = distanceKm(
      { lat: coords[i - 1][0], lng: coords[i - 1][1] },
      { lat: coords[i][0], lng: coords[i][1] },
    );
    legs.push(d);
    total += d;
  }
  let target = total * fraction;
  for (let i = 0; i < legs.length; i++) {
    if (target <= legs[i]) {
      const t = legs[i] === 0 ? 0 : target / legs[i];
      const [aLat, aLng] = coords[i];
      const [bLat, bLng] = coords[i + 1];
      return [aLat + (bLat - aLat) * t, aLng + (bLng - aLng) * t];
    }
    target -= legs[i];
  }
  return coords[coords.length - 1];
}

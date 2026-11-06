// Map helpers for the checkout address picker.
// Geocoding uses OpenStreetMap's Nominatim service (free, no API key).
// Its usage policy allows about one request per second, so the picker only
// calls it on an explicit search or when the pin is dropped, never per keystroke.

const NOMINATIM = "https://nominatim.openstreetmap.org";

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

// Turns a Nominatim result into the street / city / zip pieces the app uses.
function toAddress(result) {
  const a = result.address ?? {};
  const streetParts = [
    [a.house_number, a.road].filter(Boolean).join(" "),
    a.neighbourhood || a.quarter || a.suburb || a.village,
  ].filter(Boolean);
  const city =
    a.city || a.town || a.municipality || a.city_district || a.county || "";
  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
    street: streetParts.join(", ") || result.name || "",
    city,
    zip: a.postcode ?? "",
    label: result.display_name ?? "",
  };
}

// One Nominatim search request.
async function searchOnce(query, near) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "ph",
    limit: "5",
    "accept-language": "en",
  });
  if (near) {
    // Prefer results around the store without excluding others.
    const d = 0.3;
    params.set("viewbox", [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(","));
  }
  const res = await fetch(`${NOMINATIM}/search?${params}`);
  if (!res.ok) throw new Error("Address search is unavailable right now.");
  const results = await res.json();
  return results.map(toAddress);
}

// Full addresses copied from Google Maps often start with a building name the
// map data doesn't know ("USJ-R Quadricentennial Campus, 22 A. Borromeo St,
// ..."). If the full text finds nothing, drop the first comma part and retry,
// up to 3 requests, spaced out to respect Nominatim's one-per-second limit.
const MAX_SEARCH_TRIES = 3;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Address text -> { results, matched } where `matched` is the text that found
// them (shorter than the input when a fallback was used).
export async function searchAddress(query, near) {
  let parts = query.split(",").map((s) => s.trim()).filter(Boolean);
  for (let attempt = 0; attempt < MAX_SEARCH_TRIES && parts.length > 0; attempt++) {
    if (attempt > 0) await pause(1100);
    const text = parts.join(", ");
    const results = await searchOnce(text, near);
    if (results.length > 0) return { results, matched: text };
    if (parts.length < 3) break; // don't shrink down to just a city
    parts = parts.slice(1);
  }
  return { results: [], matched: null };
}

// Map pin -> the nearest street address.
export async function reverseGeocode({ lat, lng }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    "accept-language": "en",
  });
  const res = await fetch(`${NOMINATIM}/reverse?${params}`);
  if (!res.ok) throw new Error("Could not look up this spot.");
  const result = await res.json();
  if (result.error) throw new Error("No address found at this spot.");
  return toAddress(result);
}

// One-line address saved on the order (what the admin and rider see).
export function formatDeliveryAddress({ details, street, city, zip }) {
  const main = [street, [city, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return details?.trim() ? `${details.trim()}, ${main}` : main;
}

// Road route between two points, for the delivery map on Track Order.
// Uses the public OSRM demo server (OpenStreetMap roads, no API key). If it
// is unreachable, falls back to a straight line at an assumed 25 km/h so the
// map still works.
// Returns { coords: [[lat, lng], ...], distanceKm, durationMin, byRoad }.
export async function fetchRoute(from, to) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("route unavailable");
    const data = await res.json();
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) throw new Error("no route");
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      byRoad: true,
    };
  } catch {
    const km = distanceKm(from, to);
    return {
      coords: [
        [from.lat, from.lng],
        [to.lat, to.lng],
      ],
      distanceKm: km,
      durationMin: (km / 25) * 60,
      byRoad: false,
    };
  }
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

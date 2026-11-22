// Point A of the delivery simulation: a pretend kitchen. DevFood has no real
// store, so this is set to USJ-R Quadricentennial Campus (A. Borromeo St,
// Cebu City). Keep it in sync with "Delivery" in DevFood.Api/appsettings.json.
export const STORE = {
  name: "DevFood Kitchen",
  lat: 10.2951,
  lng: 123.8973,
};

// Grab-style delivery zone: orders whose drop-off pin is farther than this
// (straight-line distance from STORE) cannot be placed.
export const MAX_DELIVERY_KM = 7;

// Delivery fee by distance: BASE covers the first BASE_KM, then PER_KM for
// each extra km or part of one (₱39 + ₱8/km → ₱79 at the 7 km limit).
// Keep in sync with "Delivery" in DevFood.Api/appsettings.json — the server
// charges the same amount when the order is placed.
export const DELIVERY_FEE = { BASE: 39, BASE_KM: 2, PER_KM: 8 };

// Distance is rounded to 0.1 km first, the same way the server does it.
export function deliveryFeeFor(km) {
  const rounded = Math.round(km * 10) / 10;
  const extraKm = Math.max(0, Math.ceil(Math.round((rounded - DELIVERY_FEE.BASE_KM) * 10) / 10));
  return DELIVERY_FEE.BASE + extraKm * DELIVERY_FEE.PER_KM;
}

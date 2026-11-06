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

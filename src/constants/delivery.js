// Where DevFood cooks from, and how far riders will go.
// TODO(team): replace STORE with the real kitchen location before the demo.
export const STORE = {
  name: "DevFood Kitchen",
  lat: 14.5896,
  lng: 120.9811,
};

// Grab-style delivery zone: orders whose drop-off pin is farther than this
// (straight-line distance from STORE) cannot be placed.
export const MAX_DELIVERY_KM = 7;

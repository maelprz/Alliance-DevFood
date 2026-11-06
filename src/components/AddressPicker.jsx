import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STORE, MAX_DELIVERY_KM } from "../constants/delivery";
import { distanceKm, reverseGeocode, searchAddress } from "../utils/geo";

// Pins are drawn with inline SVG (divIcon) so no marker image files are needed.
function pinIcon(color) {
  return L.divIcon({
    className: "",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    html: `<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
  });
}
const STORE_ICON = pinIcon("#111827");
const DROP_ICON = pinIcon("#FF5A36");

// AddressPicker — Grab-style delivery location.
// The customer drops a pin (search, tap the map, drag, or use GPS). The pin
// decides the distance check and the address text, so the typed address can't
// say one place while the pin says another. Only "unit / floor / landmark" is
// typed by hand.
//
// onChange receives null (no usable pin yet) or
// { lat, lng, street, city, zip, label, details, distanceKm, inZone }.
export default function AddressPicker({ initialQuery = "", onChange, error }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const pinRef = useRef(null);
  const lookupSeq = useRef(0);
  const placePinRef = useRef(null);
  const onChangeRef = useRef(onChange);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState(null);
  const [place, setPlace] = useState(null);
  const [details, setDetails] = useState("");

  // Report the current location to the parent whenever it changes.
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (!place) {
      onChangeRef.current?.(null);
      return;
    }
    onChangeRef.current?.({ ...place, details });
  }, [place, details]);

  // Moves the pin and looks up the address there. `known` skips the lookup
  // when the address is already known (it came from a search result).
  const placePin = async (lat, lng, known) => {
    const map = mapRef.current;
    if (!map) return;
    if (!pinRef.current) {
      pinRef.current = L.marker([lat, lng], { icon: DROP_ICON, draggable: true })
        .addTo(map)
        .on("dragend", (e) => {
          const p = e.target.getLatLng();
          placePinRef.current?.(p.lat, p.lng);
        });
    } else {
      pinRef.current.setLatLng([lat, lng]);
    }
    map.panTo([lat, lng]);

    const km = distanceKm(STORE, { lat, lng });
    const inZone = km <= MAX_DELIVERY_KM;
    setMessage(null);

    if (known) {
      setPlace({ ...known, lat, lng, distanceKm: km, inZone });
      return;
    }
    const seq = ++lookupSeq.current;
    setResolving(true);
    setPlace(null);
    try {
      const addr = await reverseGeocode({ lat, lng });
      if (seq !== lookupSeq.current) return; // a newer pin drop won
      setPlace({ ...addr, lat, lng, distanceKm: km, inZone });
    } catch (err) {
      if (seq !== lookupSeq.current) return;
      setMessage(`${err.message} Move the pin a little and try again.`);
    } finally {
      if (seq === lookupSeq.current) setResolving(false);
    }
  };
  useEffect(() => {
    placePinRef.current = placePin;
  });

  // Build the map once: store pin, delivery-zone circle, tap-to-drop.
  useEffect(() => {
    const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView(
      [STORE.lat, STORE.lng],
      12,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.marker([STORE.lat, STORE.lng], { icon: STORE_ICON, keyboard: false })
      .addTo(map)
      .bindTooltip(STORE.name);
    L.circle([STORE.lat, STORE.lng], {
      radius: MAX_DELIVERY_KM * 1000,
      color: "#FF5A36",
      weight: 1,
      fillOpacity: 0.05,
    }).addTo(map);
    map.on("click", (e) => placePinRef.current?.(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
  }, []);

  // Saved profile address: look it up once and drop the pin there to confirm.
  useEffect(() => {
    const q = initialQuery.trim();
    if (!q) return;
    let cancelled = false;
    searchAddress(q, STORE)
      .then((found) => {
        if (cancelled) return;
        if (found[0]) {
          mapRef.current?.setView([found[0].lat, found[0].lng], 16);
          placePinRef.current?.(found[0].lat, found[0].lng, found[0]);
        } else {
          setMessage("We couldn't find your saved address on the map. Search or drop the pin.");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialQuery]);

  const runSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setMessage("Type at least 3 characters to search.");
      return;
    }
    setSearching(true);
    setMessage(null);
    try {
      const found = await searchAddress(q, STORE);
      setResults(found);
      if (found.length === 0) setMessage("No matching places. Try a landmark or barangay name.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r) => {
    setResults([]);
    setQuery(r.street || r.label);
    mapRef.current?.setView([r.lat, r.lng], 17);
    placePin(r.lat, r.lng, r);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Your browser can't share its location. Search or drop the pin instead.");
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 17);
        placePin(latitude, longitude);
      },
      () => {
        setLocating(false);
        setMessage("Location access was blocked. Search or drop the pin instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const btn = {
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search + GPS */}
      <form onSubmit={runSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search street, building or landmark"
          aria-label="Search delivery address"
          className="checkout-input"
          style={{
            flex: "1 1 200px",
            minWidth: 0,
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 14,
            background: "#fdf6ef",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{ ...btn, border: "none", background: "#FF5A36", color: "#fff" }}
        >
          {searching ? "Searching…" : "Search"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          style={{ ...btn, border: "1px solid #e5e7eb", background: "#fff", color: "#374151" }}
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
      </form>

      {results.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {results.map((r) => {
            const km = distanceKm(STORE, r);
            return (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "#fff",
                    border: "none",
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  {r.label}
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      marginTop: 2,
                      color: km <= MAX_DELIVERY_KM ? "#15803d" : "#dc2626",
                    }}
                  >
                    {km.toFixed(1)} km away
                    {km > MAX_DELIVERY_KM ? " · outside delivery area" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Map */}
      <div
        ref={mapEl}
        role="application"
        aria-label="Delivery map. Tap to drop your pin, or drag the pin to adjust."
        style={{
          height: 280,
          borderRadius: 10,
          border: `1px solid ${error ? "#fca5a5" : "#e5e7eb"}`,
          overflow: "hidden",
          zIndex: 0,
        }}
      />
      <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
        Tap the map or drag the orange pin to your exact door. We deliver within{" "}
        {MAX_DELIVERY_KM} km of {STORE.name}.
      </p>

      {/* Resolved address + zone status */}
      <div aria-live="polite">
        {resolving && (
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Finding address…</p>
        )}
        {!resolving && place && (
          <div
            style={{
              background: place.inZone ? "#fdf6ef" : "#fef2f2",
              border: `1px solid ${place.inZone ? "#f3e8df" : "#fca5a5"}`,
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>
              {[place.street, place.city, place.zip].filter(Boolean).join(", ") || place.label}
            </p>
            <p
              style={{
                fontSize: 12,
                margin: "4px 0 0",
                color: place.inZone ? "#15803d" : "#dc2626",
                fontWeight: 500,
              }}
            >
              {place.distanceKm.toFixed(1)} km from {STORE.name} ·{" "}
              {place.inZone
                ? "Within delivery area"
                : `Outside our ${MAX_DELIVERY_KM} km delivery area`}
            </p>
          </div>
        )}
        {message && (
          <p style={{ fontSize: 12, color: "#b45309", margin: "6px 0 0" }}>{message}</p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>{error}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="delivery-details"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 6,
            color: "#374151",
          }}
        >
          Unit, floor or landmark <span style={{ color: "#9ca3af" }}>(optional)</span>
        </label>
        <input
          id="delivery-details"
          type="text"
          maxLength={120}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. Unit 4B, blue gate beside the sari-sari store"
          className="checkout-input"
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 14,
            background: "#fdf6ef",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

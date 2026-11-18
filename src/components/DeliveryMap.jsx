import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STORE } from "../constants/delivery";
import { fetchRoute, pointAlong } from "../utils/geo";

// DeliveryMap — Grab-style live view on Track Order (simulated rider).
// DevFood has no real riders, so the trip is simulated from point A (STORE)
// to the customer's pin along real roads:
//   Pending / Preparing -> rider waits at the kitchen
//   Ready               -> rider rides toward the customer, timed by the route
//   Delivered           -> rider is at the customer's pin
// The ride start time is kept in this browser (localStorage) so a refresh
// doesn't send the rider back to the kitchen.

function pin(color) {
  return L.divIcon({
    className: "",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    html: `<svg width="26" height="34" viewBox="0 0 30 40" aria-hidden="true">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
  });
}
const KITCHEN_ICON = pin("#111827");
const HOME_ICON = pin("#FF5A36");
// Rider: orange disc with a white scooter outline.
const RIDER_ICON = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#FF5A36;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/>
      <path d="M8 17.5h7l3-6h-4l-2-4H9"/><path d="M5.5 15l2-5h3"/></svg></div>`,
});

const MIN_RIDE_MIN = 3; // very short trips still take a few minutes
const MAX_EN_ROUTE = 0.97; // rider waits just short of the door until Delivered

function rideKey(orderId) {
  return `devfood.ride.${orderId}`;
}

// When this browser first saw the order as Ready (ms), saving it if new.
function rideStart(orderId) {
  try {
    const saved = Number(localStorage.getItem(rideKey(orderId)));
    if (saved > 0) return saved;
    const now = Date.now();
    localStorage.setItem(rideKey(orderId), String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export default function DeliveryMap({ orderId, status, dropoff }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const riderRef = useRef(null);
  const startRef = useRef(null);
  const [route, setRoute] = useState(null);
  const [rideFraction, setRideFraction] = useState(0);

  const { lat, lng } = dropoff;
  const fraction =
    status === "Delivered" ? 1 : status === "Ready" ? rideFraction : 0;
  const rideMin = route ? Math.max(route.durationMin, MIN_RIDE_MIN) : null;

  // Look up the road route once per order.
  useEffect(() => {
    let cancelled = false;
    fetchRoute(STORE, { lat, lng }).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  // Map with the kitchen and the customer's pin.
  useEffect(() => {
    const map = L.map(mapEl.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.marker([STORE.lat, STORE.lng], { icon: KITCHEN_ICON, keyboard: false })
      .addTo(map)
      .bindTooltip(STORE.name);
    L.marker([lat, lng], { icon: HOME_ICON, keyboard: false })
      .addTo(map)
      .bindTooltip("You");
    map.fitBounds(
      [
        [STORE.lat, STORE.lng],
        [lat, lng],
      ],
      { padding: [40, 40] },
    );
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      riderRef.current = null;
    };
  }, [lat, lng]);

  // Draw the route once it arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    const line = L.polyline(route.coords, {
      color: "#FF5A36",
      weight: 5,
      opacity: 0.8,
      dashArray: route.byRoad ? null : "8 8",
    }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [40, 40] });
    return () => {
      line.remove();
    };
  }, [route]);

  // While Ready, advance the rider every second based on when the ride began.
  useEffect(() => {
    if (status !== "Ready" || !rideMin) return;
    startRef.current = rideStart(orderId);
    const tick = () => {
      const elapsedMin = (Date.now() - startRef.current) / 60000;
      setRideFraction(Math.min(elapsedMin / rideMin, MAX_EN_ROUTE));
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [status, rideMin, orderId]);

  // Clean up the saved start time once the trip is over.
  useEffect(() => {
    if (status !== "Delivered" && status !== "Cancelled") return;
    try {
      localStorage.removeItem(rideKey(orderId));
    } catch {
      // Storage blocked — nothing to clean.
    }
  }, [status, orderId]);

  // Place the rider marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    const pos = pointAlong(route.coords, fraction);
    if (!riderRef.current) {
      riderRef.current = L.marker(pos, {
        icon: RIDER_ICON,
        keyboard: false,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindTooltip("Your rider");
    } else {
      riderRef.current.setLatLng(pos);
    }
  }, [route, fraction]);

  let headline;
  let detail = null;
  if (!route) {
    headline = "Loading the delivery route…";
  } else if (status === "Delivered") {
    headline = "Your rider has arrived";
  } else if (status === "Ready") {
    const left = Math.ceil(rideMin * (1 - fraction));
    headline =
      fraction >= MAX_EN_ROUTE ? "Your rider is arriving now" : "Your rider is on the way";
    detail =
      fraction >= MAX_EN_ROUTE
        ? "Please get ready to receive your order."
        : `Arriving in about ${left} min`;
  } else {
    headline = "Your rider will head out once your food is ready";
    detail = `About a ${Math.round(rideMin)} min ride`;
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 24,
      }}
    >
      <div
        ref={mapEl}
        role="img"
        aria-label="Delivery map showing the kitchen, your location and your rider"
        style={{ height: 260, zIndex: 0 }}
      />
      <div aria-live="polite" style={{ padding: "14px 18px" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>
          {headline}
        </p>
        {detail && (
          <p style={{ fontSize: 13, color: "#c2410c", fontWeight: 500, margin: "4px 0 0" }}>
            {detail}
          </p>
        )}
        {route && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>
            {route.distanceKm.toFixed(1)} km {route.byRoad ? "by road" : "(straight line)"} from{" "}
            {STORE.name}
          </p>
        )}
      </div>
    </div>
  );
}

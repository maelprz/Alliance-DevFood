import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STORE } from "../constants/delivery";
import { pointAlong } from "../utils/geo";

// DeliveryMap — the live map on Track Order (simulated rider).
// Only draws: the kitchen, the customer's pin, the road route and the rider.
// Where the rider is comes in as `fraction` from hooks/useRiderProgress.js.
// It fills its parent, so the parent decides the size.
// `padRight` keeps the route clear of anything laid over the map's right side
// (the status panel).

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

export default function DeliveryMap({ dropoff, route, fraction, padRight = 40 }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const riderRef = useRef(null);
  const { lat, lng } = dropoff;
  const fitOptions = { paddingTopLeft: [40, 40], paddingBottomRight: [padRight, 40] };

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
      .bindTooltip(STORE.name, { permanent: true, direction: "bottom", offset: [0, 4] });
    L.marker([lat, lng], { icon: HOME_ICON, keyboard: false })
      .addTo(map)
      .bindTooltip("You", { permanent: true, direction: "top", offset: [0, -34] });
    map.fitBounds(
      [
        [STORE.lat, STORE.lng],
        [lat, lng],
      ],
      fitOptions,
    );
    mapRef.current = map;
    // The map fills its parent, whose size can settle after the first paint
    // (fonts, a page reload). Re-measure so the tiles cover the whole box.
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(mapEl.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      riderRef.current = null;
    };
    // fitOptions only matters for the first fit; padRight never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    map.fitBounds(line.getBounds(), fitOptions);
    return () => {
      line.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

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

  return (
    <div
      ref={mapEl}
      role="img"
      aria-label="Delivery map showing the kitchen, your location and your rider"
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    />
  );
}

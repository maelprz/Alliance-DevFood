import { useEffect, useRef, useState } from "react";
import { STORE } from "../constants/delivery";
import { fetchRoute } from "../utils/geo";

// Simulated rider for Track Order. DevFood has no real riders, so the trip
// runs from point A (STORE) to the customer's pin along the OSRM road route:
//   Pending / Preparing -> rider waits at the kitchen
//   Ready               -> rider rides toward the customer, timed by the route
//   Delivered           -> rider is at the customer's pin
// The ride start time is kept in this browser (localStorage) so a refresh
// doesn't send the rider back to the kitchen.

export const MIN_RIDE_MIN = 3; // very short trips still take a few minutes
export const MAX_EN_ROUTE = 0.97; // rider waits just short of the door until Delivered

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

// Returns the road route, how far along it the rider is (0..1), and the
// text shown under the map.
export function useRiderProgress({ orderId, status, dropoff }) {
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

  return { route, fraction, headline, detail };
}

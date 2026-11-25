import { useEffect, useRef, useState } from "react";
import { STORE } from "../constants/delivery";
import { fetchRoute } from "../services/geoService";
import { ORDER_STATUS, rideStartKey, isOrderFinished } from "../constants/orderStatus";

// Simulated rider for Track Order. DevFood has no real riders, so the trip
// runs from point A (STORE) to the customer's pin along the OSRM road route:
//   Pending / Preparing -> rider waits at the kitchen
//   Ready               -> rider rides toward the customer, timed by the route
//   Delivered           -> rider is at the customer's pin
// The ride start time is kept in this browser (localStorage) so a refresh
// doesn't send the rider back to the kitchen.

export const MIN_RIDE_MIN = 3; // very short trips still take a few minutes
export const MAX_EN_ROUTE = 0.97; // rider waits just short of the door until Delivered

// One route lookup per drop-off pin for this browser tab, so the floating
// order card and Track Order don't ask OSRM again on every page change.
const routeCache = new Map();

function loadRoute(lat, lng) {
  const key = `${lat},${lng}`;
  if (!routeCache.has(key)) routeCache.set(key, fetchRoute(STORE, { lat, lng }));
  return routeCache.get(key);
}

// When this browser first saw the order as Ready (ms), saving it if new.
function rideStart(orderId) {
  try {
    const saved = Number(localStorage.getItem(rideStartKey(orderId)));
    if (saved > 0) return saved;
    const now = Date.now();
    localStorage.setItem(rideStartKey(orderId), String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function clock(ms) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// The rider's trip for one order. `dropoff` may be null (old orders placed
// before the map pin existed) — then there is no route or rider.
export function useRiderProgress({ orderId, status, dropoff }) {
  const [route, setRoute] = useState(null);
  const [rideFraction, setRideFraction] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const startRef = useRef(null);

  const lat = dropoff?.lat ?? null;
  const lng = dropoff?.lng ?? null;
  const fraction =
    status === ORDER_STATUS.DELIVERED ? 1 : status === ORDER_STATUS.READY ? rideFraction : 0;
  const rideMin = route ? Math.max(route.durationMin, MIN_RIDE_MIN) : null;

  // Look up the road route once per pin.
  useEffect(() => {
    if (lat == null || lng == null) return;
    let cancelled = false;
    loadRoute(lat, lng).then((r) => {
      if (!cancelled) setRoute(r);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  // While Ready, advance the rider every second based on when the ride began.
  useEffect(() => {
    if (status !== ORDER_STATUS.READY || !rideMin) return;
    startRef.current = rideStart(orderId);
    const tick = () => {
      const elapsedMin = (Date.now() - startRef.current) / 60000;
      setStartedAt(startRef.current);
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
    if (!isOrderFinished(status)) return;
    try {
      localStorage.removeItem(rideStartKey(orderId));
    } catch {
      // Storage blocked — nothing to clean.
    }
  }, [status, orderId]);

  const arrivingNow = status === ORDER_STATUS.READY && fraction >= MAX_EN_ROUTE;
  const minutesLeft =
    status === ORDER_STATUS.READY && rideMin ? Math.max(1, Math.ceil(rideMin * (1 - fraction))) : null;
  const kmLeft = route && status === ORDER_STATUS.READY ? route.distanceKm * (1 - fraction) : null;
  const arriveAt =
    status === ORDER_STATUS.READY && startedAt && rideMin ? startedAt + rideMin * 60000 : null;

  return { route, fraction, rideMin, minutesLeft, kmLeft, arriveAt, arrivingNow };
}

// How far the whole order is, 0..1, for progress bars.
export function overallProgress(status, fraction) {
  switch (status) {
    case ORDER_STATUS.PENDING:
      return 0.1;
    case ORDER_STATUS.PREPARING:
      return 0.35;
    case ORDER_STATUS.READY:
      return 0.5 + 0.5 * fraction;
    case ORDER_STATUS.DELIVERED:
      return 1;
    default:
      return 0;
  }
}

// The Grab-style sentences for the status panel and the floating order card:
// title = what is happening, short = the same for the small card,
// subtitle = when, hint = one live detail.
export function describeTrip(status, trip) {
  const { route, rideMin, minutesLeft, kmLeft, arriveAt, arrivingNow } = trip;
  const ride = rideMin ? `about a ${Math.round(rideMin)} min ride` : null;
  switch (status) {
    case ORDER_STATUS.PENDING:
      return {
        title: "Waiting for the kitchen to confirm",
        short: "Order placed",
        subtitle: ride ? `Your rider will leave once the food is ready · ${ride}` : "Order received",
        hint: null,
      };
    case ORDER_STATUS.PREPARING:
      return {
        title: "The kitchen is preparing your food",
        short: "Preparing your food",
        subtitle: ride ? `Your rider will leave once it's ready · ${ride}` : "Your food is being freshly prepared",
        hint: null,
      };
    case ORDER_STATUS.READY:
      if (arrivingNow) {
        return {
          title: "Your rider is arriving now",
          short: "Rider arriving now",
          subtitle: "Please get ready to receive your order",
          hint: "Your rider is almost at your door.",
        };
      }
      return {
        title: "Your rider is on the way",
        short: "Rider on the way",
        subtitle: arriveAt
          ? `Arriving around ${clock(arriveAt)} · about ${minutesLeft} min`
          : "Working out the arrival time…",
        hint:
          kmLeft != null
            ? `Food is packed. Rider is ${kmLeft.toFixed(1)} km away${route?.byRoad ? "" : " (straight line)"}.`
            : null,
      };
    case ORDER_STATUS.DELIVERED:
      return {
        title: "Your order has arrived",
        short: "Order arrived",
        subtitle: "Enjoy your meal!",
        hint: null,
      };
    default:
      return { title: status, short: status, subtitle: "", hint: null };
  }
}

import { useEffect, useRef, useState } from "react";
import { ORDER_STATUS } from "../constants/orderStatus";

// The cancel window after placing an order. The server sends how many seconds
// are left (cancel_seconds_left) and how long the window is
// (cancel_window_seconds) with every order; this counts down smoothly between
// the 1-second polls. When it reaches 0 the server accepts the order on its own.
export function useCancelWindow(order) {
  const serverLeft =
    order?.status === ORDER_STATUS.PENDING ? order?.cancel_seconds_left ?? 0 : 0;
  const windowSeconds = order?.cancel_window_seconds || 1;
  const deadlineRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(serverLeft);

  useEffect(() => {
    deadlineRef.current = Date.now() + serverLeft * 1000;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [serverLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  return {
    secondsLeft,
    canCancel: secondsLeft > 0,
    progress: Math.min(1, secondsLeft / windowSeconds),
    label: `${minutes}:${seconds}`,
  };
}

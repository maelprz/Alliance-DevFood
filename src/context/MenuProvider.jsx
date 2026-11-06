
import { useState, useEffect } from "react";
import { MenuContext } from "./MenuContext";

export function MenuProvider({ children }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    fetch("/api/menu", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Server error: HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((items) => {
        if (!Array.isArray(items)) {
          throw new Error("Invalid menu response.");
        }

        if (!cancelled) {
          setMenuItems(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.name === "AbortError") {
            setError("Request timed out. Please check your connection.");
          } else {
            setError(err.message || "Unable to load menu.");
          }
        }
      })
      .finally(() => {
        clearTimeout(timeout);

        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [retryCount]);

  const retry = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <MenuContext.Provider
      value={{ menuItems, setMenuItems, loading, error, retry }}
    >
      {children}
    </MenuContext.Provider>
  );
}

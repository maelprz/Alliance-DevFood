import { useState } from "react";
import { useMenu } from "../hooks/useMenu";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useApp } from "../context/useApp";
import { useNav } from "../context/useNav";

// Browse Menu page — Feature 2
export default function BrowseMenu() {
  const { menuItems } = useMenu();
  const { addToCart } = useCart();
  const { user } = useApp();
  const { navigate } = useNav();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [addedItems, setAddedItems] = useState(new Set());

  const categories = [
    "All",
    ...Array.from(new Set(menuItems.map((item) => item.category))),
  ];

  const CATEGORY_ORDER = [
  "Burger",
  "Sandwich",
  "Chicken",
  "Pizzas",
  "Spaghetti",
  "Rice Meals",
  "Snacks",
  "Dessert",
  "Drinks",
  ];

  const filtered = menuItems
  .filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      item.category === selectedCategory;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  })

  .sort((a, b) => {
    const categoryCompare =
      CATEGORY_ORDER.indexOf(a.category) -
      CATEGORY_ORDER.indexOf(b.category);

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return a.name.localeCompare(b.name);
  });

  // FIXED: now actually updates CART CONTEXT
  // Check if user is logged in before adding to cart
  const handleAddToCart = (item) => {
    if (!user) {
      navigate("login");
      return;
    }

    addToCart(item);

    setAddedItems((prev) => new Set(prev).add(item.food_id));

    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(item.food_id);
        return next;
      });
    }, 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent" }}>
      <Navbar />

      {/* Hero band — Unsplash food photo with warm coral overlay.
          Coral overlay keeps brand color dominant; photo adds appetite appeal. */}
      <div
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255, 90, 54, 0.82) 0%, rgba(251, 146, 60, 0.74) 55%, rgba(251, 191, 36, 0.66) 100%), url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#fff",
          padding: "44px 32px 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -80,
            left: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            position: "relative",
          }}
        >
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              margin: "0 0 6px",
              fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
              letterSpacing: "-0.02em",
            }}
          >
            What are you craving today?
          </h1>
          <p style={{ fontSize: 15, opacity: 0.95, margin: 0 }}>
            Hot meals delivered fresh to your door.
          </p>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: 64,
          zIndex: 40,
          background: "#ffffff",
          borderBottom: "1px solid #f3e8df",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "8px 32px 16px",
          }}
        >
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          />
        </div>

        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "12px 32px",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
            Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty-search state — shown when filters yield zero matches. */}
      {filtered.length === 0 && (
        <div
          style={{
            maxWidth: 600,
            margin: "64px auto",
            padding: "40px 32px",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #f3e8df",
            borderRadius: 16,
          }}
          role="status"
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF5A36"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ margin: "0 auto 12px", display: "block" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 6px",
              color: "#1f2937",
            }}
          >
            Not available
          </h3>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            {searchTerm
              ? `No dishes match "${searchTerm}"${selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}.`
              : `Nothing in ${selectedCategory} right now.`}
          </p>
        </div>
      )}

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px",
          display: filtered.length === 0 ? "none" : "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 24,
        }}
      >
        {filtered.map((item) => {
          const isAdded = addedItems.has(item.food_id);

          return (
            <div
              key={item.food_id}
              style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              <div style={{ aspectRatio: "4/3", background: "#f3f4f6" }}>
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{item.name}</h3>

                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  {item.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>₱{item.price.toFixed(2)}</span>

                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.availability}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: "none",
                      background: isAdded
                        ? "#16a34a"
                        : item.availability
                          ? "#FF5A36"
                          : "#e5e7eb",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {isAdded ? "✓" : "+"}
                  </button>
                </div>

                {!item.availability && (
                  <p style={{ fontSize: 12, color: "#ef4444" }}>Out of Stock</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { authHeaders } from "../services/authService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function Statistics() {
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStatistics() {
      try {
        const response = await fetch("/api/admin/statistics", {
          headers: authHeaders("admin"),
        });
        if (response.ok === false) {
          setError("Could not load statistics. Please log in again and try again.");
          return;
        }
        const data = await response.json();
        setStatistics(data);
      } catch {
        setError("Could not connect to the server.");
      }
    }
    loadStatistics();
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (statistics === null) return <p>Loading statistics...</p>;

  const { totalOrders, totalRevenue, deliveredOrders, pendingOrders, revenueData, foodData } = statistics;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        Statistics Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 20,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Total Orders
          </h3>

          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {totalOrders}
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Total Revenue
          </h3>

          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#16a34a",
            }}
          >
            ₱{totalRevenue.toFixed(2)}
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Delivered Orders
          </h3>

          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#16a34a",
            }}
          >
            {deliveredOrders}
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            Pending Orders
          </h3>

          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#FF5A36",
            }}
          >
            {pendingOrders}
          </p>
        </div>
      </div>

      <div style={{
        width: "100%", boxSizing: "border-box", background: "#fff",
        border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 24,
      }}>
        <h3 style={{ margin: "0 0 8px" }}>Revenue Tracking - Last 7 Days</h3>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 20px" }}>
          Delivered and paid orders by Philippine delivery date. Older orders without a delivery date use their order date.
        </p>

        {revenueData.length === 0 && (
          <div style={{
            minHeight: 180, display: "flex", alignItems: "center",
            justifyContent: "center", textAlign: "center", color: "#6b7280",
          }}>
            No revenue yet. Delivered and paid orders will appear here.
          </div>
        )}

        {revenueData.length > 0 && (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={32} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#FF5A36" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{
        width: "100%", boxSizing: "border-box", background: "#fff",
        border: "1px solid #e5e7eb", borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ margin: "0 0 8px" }}>Best-Selling Items</h3>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 20px" }}>
          Top 5 items from delivered and paid orders.
        </p>

        {foodData.length === 0 && (
          <div style={{
            minHeight: 180, display: "flex", alignItems: "center",
            justifyContent: "center", textAlign: "center", color: "#6b7280",
          }}>
            No best-selling items yet. Items from delivered and paid orders will appear here.
          </div>
        )}

        {foodData.length > 0 && (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={foodData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#FF5A36" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

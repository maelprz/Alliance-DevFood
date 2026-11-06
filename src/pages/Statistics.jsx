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

      {/* Order totals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 40,
        }}
      >
        {/* Total orders */}
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

        {/* Total revenue */}
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

        {/* Delivered orders */}
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

        {/* Pending orders */}
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

      {/* Revenue */}
      <div
        style={{
          width: "100%",
          height: 350,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 40,
        }}
      >
        <h3 style={{ marginBottom: 20 }}>Revenue Tracking</h3>

        <ResponsiveContainer>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#FF5A36"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Most ordered items */}
      <div
        style={{
          width: "100%",
          height: 350,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3 style={{ marginBottom: 20 }}>Most Ordered Food Items</h3>

        <ResponsiveContainer>
          <BarChart data={foodData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />

            <Bar dataKey="quantity" fill="#FF5A36" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

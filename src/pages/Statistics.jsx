import { useMemo } from "react";
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

export default function Statistics({ orders = [], contextMenuItems = [] }) {
  // SUMMARY CARDS
  const totalOrders = orders.length;

  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.total_amount || 0),
    0,
  );

  const deliveredOrders = orders.filter(
    (o) => o.status === "Delivered",
  ).length;

  const pendingOrders = orders.filter(
    (o) => o.status === "Pending",
  ).length;

  // REVENUE TRACKING DATA
  const revenueData = useMemo(() => {
    const map = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at).toLocaleDateString();

      map[date] = (map[date] || 0) + (order.total_amount || 0);
    });

    return Object.keys(map).map((key) => ({
      date: key,
      revenue: map[key],
    }));
  }, [orders]);

  // FOOD DATA
  const foodData = useMemo(() => {
    const map = {};

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.name || "Food";
        map[name] = (map[name] || 0) + item.quantity;
      });
    });

    return Object.keys(map)
      .map((key) => ({
        name: key,
        quantity: map[key],
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        Statistics Dashboard
      </h1>

      {/* SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 40,
        }}
      >
        {/* TOTAL ORDERS */}
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

        {/* TOTAL REVENUE */}
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

        {/* DELIVERED */}
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

        {/* PENDING */}
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

      {/* REVENUE TRACKING */}
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

      {/* MOST ORDERED FOOD ITEMS */}
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

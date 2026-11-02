import { useState, useEffect } from "react";
import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useMenu } from "../hooks/useMenu";
import { useOrder } from "../context/useOrder";
import Statistics from "./Statistics";
import CouponManager from "../components/CouponManager";
import NotificationManager from "../components/NotificationManager";

const STATUS_COLORS = {
  Pending: "#ca8a04",
  Preparing: "#2563eb",
  Ready: "#9333ea",
  Delivered: "#16a34a",
  Cancelled: "#dc2626",
};

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

export default function Admin() {
  const { navigate } = useNav();
  const { setAdminUser, adminUser } = useApp();
  const { menuItems: contextMenuItems, setMenuItems: setContextMenuItems } =
    useMenu();
  const [activeView, setActiveView] = useState("orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const { orders, setOrders, orderItems } = useOrder();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "Burger",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("All");

  // Map of user_id → current name. Lets the orders table show the up-to-date
  // customer name instead of the one snapshotted at order time.
  const [customerNames, setCustomerNames] = useState({});

  useEffect (() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/orders");
        const data = await res.json();

        setOrders(data);
      } catch (err) {
        console.error("Error updating orders: ", err);
      }
      };
      fetchOrders();

      const interval = setInterval(fetchOrders, 1000);

      return () => clearInterval(interval);
  }, [setOrders]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users");
        const users = await res.json();
        const map = {};
        for (const u of users) map[u.id] = u.name;
        setCustomerNames(map);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (order_id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${order_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus })
      }
    );
      const updatedOrder = await res.json();

      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === order_id ? updatedOrder : o
        )
      );
    } catch (err) {
      console.error("Error updating order status:", err);
    }

  };

  const handleDeleteOrders = async () => {
    try {
      for (const orderId of selectedOrders) {
        await fetch(`http://localhost:5000/api/orders/${orderId}`, {
          method: "DELETE",
        });
      }

      setOrders((prev) => prev.filter((order) => !selectedOrders.includes(order.order_id)));

      setSelectedOrders([]);
    } catch (err) {
      alert("Failed to delete orders. Please try again.");
    }
  };

  const handleToggleStock = async (food_id) => {
    const item = contextMenuItems.find((i) => i.food_id === food_id);

    if (!item) return;

    const updatedItem = {
      ...item,
      availability: !item.availability,
    };
    
    try {
      const res = await fetch(`http://localhost:5000/api/menu/${food_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body:  JSON.stringify(updatedItem),});

        const savedItem = await res.json();

        setContextMenuItems((prev) => prev.map((i) => i.food_id === food_id ? savedItem : i));
      } catch (err) {
        alert("Failed to update stock status. Please try again.");
        console.error(err);

    }


  };

  const handleDeleteItem = async (food_id) => {
    try {
      await fetch(`http://localhost:5000/api/menu/${food_id}`, {
        method: "DELETE",
      });
      setContextMenuItems((prev) => prev.filter((i) => i.food_id !== food_id));
    } catch (err) {
      alert("Failed to delete menu item. Please try again.");
      console.error(err);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description,
    });
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setImage(null);
    setPreview(null);
    setFormData({ name: "", price: "", category: "Burger", description: "" });
  };

  const handleSubmitItem = (e) => {
    e.preventDefault();
    if (editingItem) {
      const updatedItem = {
        ...editingItem,
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        image: preview || editingItem.image,

      };

      fetch(`http://localhost:5000/api/menu/${editingItem.food_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem)
      })

        .then((res) => res.json())
        .then((savedItem) => {
          setContextMenuItems((prev) =>
            prev.map((i) =>
              i.food_id === editingItem.food_id ? savedItem : i
            )
          );
        });

    } else {
      const newItem = {
        food_id: Date.now(),
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        description: formData.description,
        availability: true,
        image: preview,
        deleted: false,
      };
      fetch("http://localhost:5000/api/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newItem),
      })
        .then((res) => res.json())
        .then((savedItem) => {
          setContextMenuItems((prev) => [...prev, savedItem].sort((a,b) => {
            const categoryCompare = 
            CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
            
            if (categoryCompare !== 0) {return categoryCompare;}
            return a.name.localeCompare(b.name);
          })); 
        });
    }
    cancelForm();
  };

  const handleLogout = () => {
    setAdminUser(null);
    navigate("admin-login");
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fdf6ef",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const navBtnStyle = (active) => ({
    width: "100%",
    textAlign: "left",
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: active ? "#FF5A36" : "transparent",
    color: active ? "#ffffff" : "#374151",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: 4,
  });

  const filteredMenuItems = (
    selectedCategory === "All"
      ? contextMenuItems
      : contextMenuItems.filter((item) => item.category === selectedCategory)
  ).sort((a,b) => {
    const categoryCompare = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

    if (categoryCompare !== 0) {return categoryCompare;}
    
    return a.name.localeCompare(b.name);
  });
  
  
  return (
    <div style={{ display: "flex", minHeight: "100dvh", width: "100%", background: "transparent" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 256,
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          padding: 24,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 24px",
          }}
        >
          Admin Panel
        </h2>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <button
            style={navBtnStyle(activeView === "orders")} onClick={() => setActiveView("orders")}>
            Active Orders
          </button>
          <button
            style={navBtnStyle(activeView === "menu")} onClick={() => setActiveView("menu")}>
            Menu Editor
          </button>
          <button style={navBtnStyle(activeView === "stats")} onClick={() => setActiveView("stats")}>
            Statistics
          </button>
          <button style={navBtnStyle(activeView === "coupons")} onClick={() => setActiveView("coupons")}>
            Coupons
          </button>
          <button style={navBtnStyle(activeView === "notifications")} onClick={() => setActiveView("notifications")}>
            Notifications
          </button>
        </nav>

        {/* Footer actions */}
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>
            Logged in as {adminUser?.name ?? "Admin"}
          </p>
          <button
            onClick={handleLogout}
            style={{ ...navBtnStyle(false), color: "#6b7280", fontSize: 13 }}
          >
            Logout
          </button>
          <button
            onClick={() => navigate("menu")}
            style={{ ...navBtnStyle(false), color: "#6b7280", fontSize: 13 }}
          >
            Customer Site
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
          {/* ── Orders view ─────────────────────────────────────────────── */}
          {activeView === "orders" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  Active Orders
                </h1>

                  <input type="text" placeholder="Search by Order ID or Customer" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    width: 300,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginBottom: 20,
                    fontSize: 14,
                  }}
                  />

                <select value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  marginBottom: 20,
                  marginLeft: 10,
                  fontSize: 14,

                }}

                >

                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready">Ready</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {selectedOrders.length > 0 && (
                  <button
                    onClick={handleDeleteOrders}
                    style={{
                      padding: "10px 18px",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delete Selected
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: "64px 32px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No orders yet.
                </div>
              ) : (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          background: "#fdf6ef",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {[
                          "",
                          "Order ID",
                          "Customer",
                          "Address",
                          "Items Ordered",
                          "Total Amount",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px 20px",
                              textAlign: "left",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#6b7280",
                              fontFamily: "inherit",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(orders || []).filter((order) => {
                      const query = search.toLowerCase();
                      const liveName = customerNames[order.user_id];
                      const customer = (liveName || order.customerName || order.customer || "").toLowerCase();
                      const matchesStatus = statusFilter === "All" || order.status === statusFilter;

                      return (
                        matchesStatus && (
                          String(order.order_id).includes(query) || customer.includes(query))
                      );
                      }).map((order) => (


                        <tr
                          key={order.order_id}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "14px 20px" }}>
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.order_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrders((prev) => [...prev, order.order_id]);
                                } else {
                                  setSelectedOrders((prev) =>
                                    prev.filter((id) => id !== order.order_id)
                                  );
                                }
                              }}
                              />
                              </td>

                          <td
                            style={{
                              padding: "14px 20px",
                              fontSize: 14,
                              fontFamily: "monospace",
                              color: "#374151",
                            }}
                          >
                            #{order.order_id}
                          </td>
                          <td
                            style={{
                              padding: "14px 20px",
                              fontSize: 14,
                              color: "#111827",
                            }}
                          >
                            {customerNames[order.user_id] || order.customerName || "Customer"}
                          </td>
                          <td
                            style={{
                              padding: "14px 20px",
                              fontSize: 13,
                              color: order.delivery_address ? "#374151" : "#9ca3af",
                              maxWidth: 220,
                              lineHeight: 1.4,
                            }}
                          >
                            {order.delivery_address || "—"}
                          </td>
                          <td
                            style={{
                              padding: "14px 20px",
                              fontSize: 13,
                              color: "#6b7280",
                            }}
                          >
                            {(order.items && order.items.length > 0
                              ? order.items
                              : orderItems || []
                            )
                              .filter(
                                (i) =>
                                  i.order_id === order.order_id || !i.order_id
                              )
                              .map((i) => {
                                const food = contextMenuItems.find(
                                  (f) => f.food_id === i.food_id
                                );
                                return `${i.quantity}× ${
                                  food?.name || "Unknown Items"
                                }`;
                              })
                              .join(", ") || "No item Details"}
                          </td>
                          <td
                            style={{
                              padding: "14px 20px",
                              fontSize: 14,
                              fontWeight: 600,
                            }}
                          >
                            ₱{order.total_amount.toFixed(2)}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  order.order_id,
                                  e.target.value
                                )
                              }
                              style={{
                                padding: "6px 10px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 6,
                                fontSize: 13,
                                color: STATUS_COLORS[order.status],
                                fontWeight: 600,
                                cursor: "pointer",
                                background: "#fff",
                                fontFamily: "inherit",
                                outline: "none",
                              }}
                            >
                              {[
                                "Pending",
                                "Preparing",
                                "Ready",
                                "Delivered",
                                "Cancelled",
                              ].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Menu Editor view ─────────────────────────────────────────── */}
          {activeView === "menu" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
              
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  
                  Menu Management
                </h1>
                  <select value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    outline: "none",
                    boxShadow: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "inherit",
                    background: "#FF5A36",
                    cursor:"pointer",
                  }}
                  >
                    <option value="All">All Categories</option>
                    <option value="Burger">Burger</option>
                    <option value="Sandwich">Sandwich</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Rice Meals">Rice Meals</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Spaghetti">Spaghetti</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Drinks">Drinks</option>
                  </select>

                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    background: "#FF5A36",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Add New Item
                </button>
              </div>

              {/* Add / Edit form */}
              {showAddForm && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: 24,
                    marginBottom: 20,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      margin: "0 0 20px",
                    }}
                  >
                    {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                  </h2>
                  <form onSubmit={handleSubmitItem}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 500,
                            marginBottom: 6,
                            color: "#374151",
                          }}
                        >
                          Item Name
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Adobo Rice Bowl"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            fontWeight: 500,
                            marginBottom: 6,
                            color: "#374151",
                          }}
                        >
                          Price (₱)
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          placeholder="185.00"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 6,
                          color: "#374151",
                        }}
                      >
                        Description
                      </label>
                      <input
                        type="text"
                        placeholder="Brief description..."
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 6,
                          color: "#374151",
                        }}
                      >
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        style={inputStyle}
                      >
                        {[
                          "Burger",
                          "Sandwich",
                          "Chicken",
                          "Pizzas",
                          "Rice Meals",
                          "Snacks",
                          "Spaghetti",
                          "Dessert",
                          "Drinks",
                        ].map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 6,
                          color: "#374151",
                        }}
                      >
                        Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if(!file) return;
                          
                          setImage(file);

                          setPreview(URL.createObjectURL(file));
                        }}
                        
                      />
                      {preview && (
                        <img
                          src={preview}
                          alt="preview"
                          style={{
                            width: 120,
                            height: 120,
                            objectFit: "cover",
                            marginTop: 10,
                            borderRadius: 8,
                          }}
                        />
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="submit"
                        style={{
                          padding: "10px 24px",
                          background: "#FF5A36",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {editingItem ? "Save Changes" : "Add Item"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelForm}
                        style={{
                          padding: "10px 24px",
                          background: "#fff",
                          color: "#374151",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          fontSize: 14,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Menu items table */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        background: "#fdf6ef",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {[
                        "image",
                        "Item Name",
                        "Category",
                        "Price",
                        "Stock",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 20px",
                            textAlign: "left",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#6b7280",
                            fontFamily: "inherit",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMenuItems
                    .map((item) => (
                      <tr
                        key={item.food_id}
                        style={{ borderBottom: "1px solid #f3f4f6" }}
                      >
                        <td style={{ padding: "14px 20px" }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: "cover",
                                marginTop: 8,
                              }}
                            />
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>
                              No image
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "14px 20px" }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#111827",
                              margin: "0 0 2px",
                            }}
                          >
                            {item.name}
                          </p>
                          <p
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              margin: 0,
                            }}
                          >
                            {item.description}
                          </p>
                        </td>
                        <td
                          style={{
                            padding: "14px 20px",
                            fontSize: 14,
                            color: "#374151",
                          }}
                        >
                          {item.category}
                        </td>
                        <td
                          style={{
                            padding: "14px 20px",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          ₱{item.price.toFixed(2)}
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!item.availability}
                              onChange={() => handleToggleStock(item.food_id)}
                              style={{
                                accentColor: "#ef4444",
                                width: 16,
                                height: 16,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                color: item.availability
                                  ? "#16a34a"
                                  : "#ef4444",
                                fontWeight: 500,
                              }}
                            >
                              {item.availability ? "In Stock" : "Out of Stock"}
                            </span>
                          </label>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => startEdit(item)}
                              aria-label="Edit item"
                              title="Edit"
                              style={{
                                padding: "6px 10px",
                                border: "1px solid #e5e7eb",
                                borderRadius: 6,
                                background: "#fff",
                                cursor: "pointer",
                                color: "#374151",
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: "inherit",
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(item);
                                setShowDeleteModal(true);
                                  }
                                }
                              aria-label="Delete item"
                              title="Delete"
                              style={{
                                padding: "6px 10px",
                                border: "1px solid #fecaca",
                                borderRadius: 6,
                                background: "#fef2f2",
                                cursor: "pointer",
                                color: "#dc2626",
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: "inherit",
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Statistics view ─────────────────────────────────────────── */}
          {activeView === "stats" && ( <Statistics orders={orders} contextMenuItems={contextMenuItems} /> )}

          {/* ── Coupons view ─────────────────────────────────────────── */}
          {activeView === "coupons" && ( <CouponManager/> )}

          {/* ── Notifications view ──────────────────────────────────── */}
          {activeView === "notifications" && ( <NotificationManager/> )}

  
          {showDeleteModal && (
            <div style={{
              position: "fixed",
              inset:0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            >
              <div style={{
                background: "#fff",
                padding: 24,
                borderRadius: 14,
                width: 360,
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                textAlign: "center",
              }}
              >
                <p>Are you sure you want to delete this item?</p>
                <div style={{ marginTop: 20 }}>
                  <button
                    onClick={() => {
                      handleDeleteItem(itemToDelete.food_id);
                      setShowDeleteModal(false);
                      setItemToDelete(null);
                    }}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #dc2626",
                      borderRadius: 6,
                      background: "#fef2f2",
                      cursor: "pointer",
                      color: "#dc2626",
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setItemToDelete(null);
                    }}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      background: "#fff",
                      cursor: "pointer",
                      color: "#374151",
                      marginLeft: 10,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}



        </div>
      </main>
    </div>
  );
}

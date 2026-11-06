import { useState, useEffect } from "react";
import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useMenu } from "../hooks/useMenu";
import { useOrder } from "../context/useOrder";
import Statistics from "./Statistics";
import CouponManager from "../components/CouponManager";
import NotificationManager from "../components/NotificationManager";
import UserManager from "../components/UserManager";
import { authHeaders } from "../services/authService";

const STATUS_COLORS = {
  Pending: "#ca8a04",
  Preparing: "#2563eb",
  Ready: "#9333ea",
  Delivered: "#16a34a",
  Cancelled: "#dc2626",
};



export default function Admin() {
  const { navigate } = useNav();
  const { setAdminUser, adminUser } = useApp();
  const { menuItems: contextMenuItems, setMenuItems: setContextMenuItems } =
    useMenu();
  const [activeView, setActiveView] = useState("orders");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orderPage, setOrderPage] = useState(1);
  const { orderItems } = useOrder();
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalOrderPages, setTotalOrderPages] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [menuNotice, setMenuNotice] = useState(null);
  const [menuSaving, setMenuSaving] = useState(false);
  useEffect(() => {
    if (menuNotice === null) return;
    if (menuNotice.text !== "Item availability updated.") return;
    const timer = setTimeout(() => setMenuNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [menuNotice]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "Burger",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [orderError, setOrderError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [menuPage, setMenuPage] = useState(1);
  const [totalMenuPages, setTotalMenuPages] = useState(1);

  useEffect(() => {
    let active = true;
    async function loadAdminMenu() {
      try {
        const params = new URLSearchParams({ category: selectedCategory, page: String(menuPage) });
        const response = await fetch("/api/menu/admin?" + params, {
          headers: authHeaders("admin"),
        });
        if (response.ok === false) {
          if (active) setMenuNotice({ type: "error", text: "Could not load the admin menu." });
          return;
        }
        const data = await response.json();
        if (Array.isArray(data.items) === false) {
          if (active) setMenuNotice({ type: "error", text: "Please restart the backend and refresh this page." });
          return;
        }
        if (active) {
          setFilteredMenuItems(data.items);
          setTotalMenuPages(data.totalPages);
          if (data.page !== menuPage) setMenuPage(data.page);
        }
      } catch {
        if (active) setMenuNotice({ type: "error", text: "Could not connect to the server." });
      }
    }
    loadAdminMenu();
    return () => { active = false; };
  }, [selectedCategory, menuPage, contextMenuItems]);

  // Show current customer names in the order list.
  const [customerNames, setCustomerNames] = useState({});

  useEffect(() => {
    let active = true;
    async function fetchOrders() {
      try {
        const params = new URLSearchParams({
          page: String(orderPage),
          search,
          status: statusFilter,
        });
        const response = await fetch(`/api/admin/orders?${params}`, {
          headers: authHeaders("admin"),
        });
        if (response.ok === false) {
          if (active) setOrderError("Could not load orders. Please check your admin login.");
          return;
        }
        const data = await response.json();
        if (active) {
          setOrders(data.orders);
          setTotalOrders(data.total);
          setTotalOrderPages(data.totalPages);
          if (data.page !== orderPage) setOrderPage(data.page);
        }
      } catch {
        if (active) setOrderError("Could not load orders. Please check the server.");
      }
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderPage, search, statusFilter]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users", { headers: authHeaders("admin") });
        if (!res.ok) return;
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

  const handleStatusChange = async (orderId, newStatus) => {
    setOrderError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders("admin") },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok === false) {
        setOrderError(data.message || "Could not update the order status.");
        return;
      }
      setOrders((previousOrders) =>
        previousOrders.map((order) => {
          if (order.order_id === orderId) return data;
          return order;
        })
      );
    } catch {
      setOrderError("Could not connect to the server. Please try again.");
    }
  };

  const menuErrorText = (error) => {
    if (error instanceof TypeError) {
      return "Could not connect to the server. Please try again.";
    }

    if (error.message) {
      return error.message;
    }

    return "Something went wrong. Please try again.";
  };

  const handleToggleStock = async (foodId) => {
    const item = contextMenuItems.find((food) => food.food_id === foodId);
    if (item == null) return;

    let availability = true;
    if (item.availability === true) {
      availability = false;
    }

    setMenuNotice(null);

    try {
      const response = await fetch(`/api/menu/${foodId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify({ availability }),
      });
      const savedItem = await readMenuResponse(response);
      setContextMenuItems((currentItems) => currentItems.map((food) => {
        if (food.food_id === foodId) return savedItem;
        return food;
      }));
      setMenuNotice({ type: "success", text: "Item availability updated." });
    } catch (error) {
      setMenuNotice({ type: "error", text: menuErrorText(error) });
    }
  };

  const handleDeleteItem = async (foodId) => {
    setMenuNotice(null);

    try {
      const response = await fetch(`/api/menu/${foodId}`, {
        method: "DELETE",
        headers: authHeaders("admin"),
      });
      await readMenuResponse(response);
      setContextMenuItems((currentItems) =>
        currentItems.filter((food) => food.food_id !== foodId)
      );
      setMenuNotice({ type: "success", text: "Menu item deleted." });
    } catch (error) {
      setMenuNotice({ type: "error", text: menuErrorText(error) });
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

  const readMenuResponse = async (response) => {
    let data = {};

    try {
      data = await response.json();
    } catch {
      if (response.ok === false) {
        throw new Error("The server could not complete your request. Please try again.");
      }
    }

    if (response.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("Only an admin can change menu items.");
    }

    if (response.ok === false) {
      if (data.message) {
        throw new Error(data.message);
      }
      throw new Error("The menu request failed. Please try again.");
    }

    return data;
  };

  const handleSubmitItem = async (event) => {
    event.preventDefault();
    setMenuNotice(null);

    if (formData.name.trim().length === 0) {
      setMenuNotice({ type: "error", text: "Please enter an item name." });
      return;
    }

    const price = Number(formData.price);
    if (Number.isFinite(price) === false || price < 0 || price > 99999999.99) {
      setMenuNotice({ type: "error", text: "Please enter a valid price between 0 and 99,999,999.99." });
      return;
    }

    if (image !== null) {
      setMenuNotice({ type: "error", text: "Photo uploads are not available yet. Please save without selecting a photo." });
      return;
    }

    const item = {
      name: formData.name.trim(),
      price,
      category: formData.category,
      description: formData.description.trim(),
    };

    setMenuSaving(true);

    try {
      let url = "/api/menu";
      let method = "POST";
      let message = "Menu item added.";

      if (editingItem !== null) {
        url = `/api/menu/${editingItem.food_id}`;
        method = "PATCH";
        message = "Menu item updated.";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders("admin"),
        },
        body: JSON.stringify(item),
      });
      const savedItem = await readMenuResponse(response);

      if (editingItem !== null) {
        setContextMenuItems((currentItems) => currentItems.map((food) => {
          if (food.food_id === editingItem.food_id) return savedItem;
          return food;
        }));
      } else {
        setContextMenuItems((currentItems) => [savedItem, ...currentItems]);
        setMenuPage(1);
      }

      cancelForm();
      setMenuNotice({ type: "success", text: message });
    } catch (error) {
      setMenuNotice({ type: "error", text: menuErrorText(error) });
    } finally {
      setMenuSaving(false);
    }
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

  const currentOrderPage = orderPage;
  const pageOrders = orders;


  return (
    <div style={{ display: "flex", minHeight: "100dvh", width: "100%", background: "transparent" }}>
      {/* Sidebar */}
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
          <button style={navBtnStyle(activeView === "users")} onClick={() => setActiveView("users")}>
            Users
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

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
          {/* Orders */}
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
                  onChange={(e) => { setSearch(e.target.value); setOrderPage(1); }}
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
                onChange={(e) => { setStatusFilter(e.target.value); setOrderPage(1); }}
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


              </div>

              {orderError && (
                <div role="alert" style={{ color: "#991b1b", background: "#fef2f2", padding: 12, marginBottom: 16, borderRadius: 8 }}>
                  {orderError}
                </div>
              )}

              {totalOrders === 0 ? (
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
                  No orders match your search or status filter.
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
                      {pageOrders.map((order) => (


                        <tr
                          key={order.order_id}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >

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
                                  i.name || food?.name || "Unknown Items"
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
                              disabled={order.status === "Cancelled" || order.status === "Delivered"}
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
                              {order.status === "Cancelled" && <option value="Cancelled">Cancelled</option>}
                              {[
                                "Pending",
                                "Preparing",
                                "Ready",
                                "Delivered",
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
                  {totalOrders > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}>
                      <button
                        type="button"
                        onClick={() => setOrderPage(currentOrderPage - 1)}
                        disabled={currentOrderPage === 1}
                      >
                        Previous
                      </button>
                      <span>Page {currentOrderPage} of {totalOrderPages}</span>
                      <button
                        type="button"
                        onClick={() => setOrderPage(currentOrderPage + 1)}
                        disabled={currentOrderPage === totalOrderPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Menu */}
          {activeView === "menu" && (
            <div style={{ maxWidth: 1050 }}>
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
                  onChange={(e) => { setSelectedCategory(e.target.value); setMenuPage(1); }}
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

              {menuNotice && menuNotice.type === "error" && (
                <div role="alert" style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                  {menuNotice.text}
                </div>
              )}
              {menuNotice && menuNotice.type === "success" && (
                <div role="status" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                  {menuNotice.text}
                </div>
              )}

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
                          min="0"
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
                        disabled={menuSaving}
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
                        {menuSaving && "Saving..."}
                        {menuSaving === false && editingItem !== null && "Save Changes"}
                        {menuSaving === false && editingItem === null && "Add Item"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelForm}
                        disabled={menuSaving}
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
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 84 }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: 112 }} />
                  </colgroup>
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
                            padding: "10px 12px",
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
                        <td style={{ padding: "8px 12px" }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{
                                width: 52,
                                height: 52,
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>
                              No image
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "8px 12px" }}>
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
                            padding: "8px 12px",
                            fontSize: 14,
                            color: "#374151",
                          }}
                        >
                          {item.category}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          ₱{item.price.toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
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
                        <td style={{ padding: "8px 12px" }}>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}>
                  <button type="button" onClick={() => setMenuPage(menuPage - 1)} disabled={menuPage === 1}>
                    Previous
                  </button>
                  <span>Page {menuPage} of {totalMenuPages}</span>
                  <button type="button" onClick={() => setMenuPage(menuPage + 1)} disabled={menuPage >= totalMenuPages}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          {activeView === "stats" && ( <Statistics /> )}

          {/* Coupons */}
          {activeView === "coupons" && ( <CouponManager/> )}

          {/* Notifications */}
          {activeView === "notifications" && ( <NotificationManager/> )}

          {/* Users */}
          {activeView === "users" && ( <UserManager/> )}

  
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
                <p>Are you sure you want to delete {itemToDelete && <strong>{itemToDelete.name}</strong>}?</p>
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

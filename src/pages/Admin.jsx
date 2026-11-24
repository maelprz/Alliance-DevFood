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
import { formatOrderId } from "../constants/orderStatus";

const STATUS_COLORS = {
  Pending: "#ca8a04",
  Preparing: "#2563eb",
  Ready: "#9333ea",
  Delivered: "#16a34a",
  Cancelled: "#dc2626",
};



export default function Admin() {
  const { view, navigate } = useNav();
  const { setAdminUser, adminUser } = useApp();
  const { menuItems: contextMenuItems, setMenuItems: setContextMenuItems } =
    useMenu();
  let activeView = "orders";
  if (view === "admin-menu") activeView = "menu";
  if (view === "admin-statistics") activeView = "stats";
  if (view === "admin-coupons") activeView = "coupons";
  if (view === "admin-notifications") activeView = "notifications";
  if (view === "admin-users") activeView = "users";
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
    if (menuNotice.type !== "success") return;
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

  useEffect(() => {
    return () => {
      if (preview !== null && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const [orderError, setOrderError] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showOrderDeleteConfirm, setShowOrderDeleteConfirm] = useState(false);
  const [orderDeleting, setOrderDeleting] = useState(false);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
  }, [orderPage, search, statusFilter, ordersRefresh]);

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

  const handleDeleteSelected = async () => {
    setOrderError("");
    setOrderDeleting(true);
    try {
      const response = await fetch("/api/admin/orders/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders("admin") },
        body: JSON.stringify(selectedOrders),
      });
      const data = await response.json();
      if (response.ok === false) {
        setOrderError(data.message || "Could not remove the selected orders.");
        setShowOrderDeleteConfirm(false);
        return;
      }
      setSelectedOrders([]);
      setShowOrderDeleteConfirm(false);
      setOrdersRefresh((value) => value + 1);
    } catch {
      setOrderError("Could not connect to the server.");
      setShowOrderDeleteConfirm(false);
    } finally {
      setOrderDeleting(false);
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

  const handleToggleStock = async (item, selectedValue) => {
    const foodId = item.food_id;
    const availability = selectedValue === "true";

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
      setFilteredMenuItems((currentItems) => currentItems.map((food) => {
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
    setImage(null);
    setPreview(item.image || null);
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
      if (data.detail) {
        throw new Error(data.detail);
      }
      if (data.title) {
        throw new Error(data.title);
      }
      if (data.errors) {
        const validationMessages = Object.values(data.errors).flat();
        if (validationMessages.length > 0) {
          throw new Error(validationMessages.join(" "));
        }
      }
      if (response.status) {
        let statusText = "";
        if (response.statusText) {
          statusText = " " + response.statusText;
        }
        throw new Error(`Menu request failed (${response.status}${statusText}).`);
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

    if (formData.name.trim().length > 100) {
      setMenuNotice({ type: "error", text: "Name cannot exceed 100 characters." });
      return;
    }

    if (formData.description.trim().length === 0) {
      setMenuNotice({ type: "error", text: "Please enter a description." });
      return;
    }

    const price = Number(formData.price);
    if (formData.price === "" || Number.isFinite(price) === false || price < 0 || price > 9999) {
      setMenuNotice({ type: "error", text: "Please enter a price between 0 and 9,999." });
      return;
    }

    if (Number(price.toFixed(2)) !== price) {
      setMenuNotice({ type: "error", text: "Price can have at most two decimal places." });
      return;
    }

    if (image && image.size > 5 * 1024 * 1024) {
      setMenuNotice({ type: "error", text: "Please choose an image smaller than 5 MB." });
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
      if (image !== null) {
        const imageData = new FormData();
        imageData.append("imageFile", image);
        const uploadResponse = await fetch("/api/menu/image", {
          method: "POST",
          headers: authHeaders("admin"),
          body: imageData,
        });
        const uploadedImage = await readMenuResponse(uploadResponse);
        item.image = uploadedImage.image;
      }

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
        setSelectedCategory("All");
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

  const navBtnStyle = (active) => {
    let background = "transparent";
    let color = "#374151";
    let fontWeight = 400;
    if (active) {
      background = "#FF5A36";
      color = "#ffffff";
      fontWeight = 600;
    }
    return {
    width: "100%",
    textAlign: "left",
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background,
    color,
    fontSize: 14,
    fontWeight,
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: 4,
    };
  };

  const currentOrderPage = orderPage;
  const pageOrders = orders;
  let adminName = "Admin";
  if (adminUser && adminUser.name !== null && adminUser.name !== undefined) {
    adminName = adminUser.name;
  }

  const addressColor = (order) => {
    if (order.delivery_address) return "#374151";
    return "#9ca3af";
  };

  const orderItemText = (order) => {
    let items = orderItems || [];
    if (order.items && order.items.length > 0) items = order.items;

    const names = items
      .filter((item) => item.order_id === order.order_id || Boolean(item.order_id) === false)
      .map((item) => {
        const food = contextMenuItems.find((menuItem) => menuItem.food_id === item.food_id);
        let name = item.name;
        if (Boolean(name) === false && food) name = food.name;
        if (Boolean(name) === false) name = "Unknown Items";
        return `${item.quantity}× ${name}`;
      })
      .join(", ");

    return names || "No item Details";
  };


  return (
    <div style={{ display: "flex", minHeight: "100dvh", width: "100%", background: "transparent" }}>
      <aside
        style={{
          width: 256,
          height: "100dvh",
          position: "fixed",
          top: 0,
          left: 0,
          overflowY: "auto",
          boxSizing: "border-box",
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

        <nav style={{ flex: 1 }}>
          <a href="/admin/orders/" style={{ ...navBtnStyle(activeView === "orders"), display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Active Orders
          </a>
          <a href="/admin/menu/" style={{ ...navBtnStyle(activeView === "menu"), display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Menu Editor
          </a>
          <a href="/admin/statistics/" style={{ ...navBtnStyle(activeView === "stats"), display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Statistics
          </a>
          <a href="/admin/coupons/" style={{ ...navBtnStyle(activeView === "coupons"), display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Coupons
          </a>
          <a href="/admin/notifications/" style={{ ...navBtnStyle(activeView === "notifications"), display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Notifications
          </a>
          <a href="/admin/users/" style={{ ...navBtnStyle(activeView === "users"), display: "block", textDecoration: "none", boxSizing: "border-box" }}>
            Users
          </a>
        </nav>

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
            Logged in as {adminName}
          </p>
          <button
            onClick={() => setShowLogoutConfirm(true)}
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

      <main style={{ flex: 1, overflow: "auto", minWidth: 0, marginLeft: 256 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
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

                {selectedOrders.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button type="button" onClick={() => setSelectedOrders([])} style={{
                      padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: 8,
                      background: "#fff", color: "#374151", fontWeight: 600,
                      fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      Clear Selected
                    </button>
                    <button type="button" onClick={() => setShowOrderDeleteConfirm(true)} style={{
                      padding: "10px 16px", border: "1px solid #fecaca", borderRadius: 8,
                      background: "#fef2f2", color: "#b91c1c", fontWeight: 600,
                      fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      Delete Selected ({selectedOrders.length})
                    </button>
                  </div>
                )}


              </div>

              {orderError && (
                <div role="alert" style={{ color: "#991b1b", background: "#fef2f2", padding: 12, marginBottom: 16, borderRadius: 8 }}>
                  {orderError}
                </div>
              )}

              {totalOrders === 0 && (
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
              )}
              {totalOrders !== 0 && (
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
                          "Select",
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
                          <td style={{ padding: "14px 20px" }}>
                            <input
                              type="checkbox"
                              aria-label={"Select order " + formatOrderId(order.order_id)}
                              disabled={order.status !== "Cancelled"}
                              checked={selectedOrders.includes(order.order_id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedOrders((previous) => [...previous, order.order_id]);
                                } else {
                                  setSelectedOrders((previous) => previous.filter((id) => id !== order.order_id));
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
                            {formatOrderId(order.order_id)}
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
                              color: addressColor(order),
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
                            {orderItemText(order)}
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
                                setPendingStatus({
                                  orderId: order.order_id,
                                  oldStatus: order.status,
                                  newStatus: e.target.value,
                                })
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
                              <option value={order.status}>{order.status}</option>
                              {order.status === "Pending" && <option value="Preparing">Preparing</option>}
                              {order.status === "Preparing" && <option value="Ready">Ready</option>}
                              {order.status === "Ready" && <option value="Delivered">Delivered</option>}
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

              {showAddForm && (
                <div role="dialog" aria-modal="true" aria-label="Menu item form" style={{
                  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
                }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: 24,
                    width: "min(600px, 90vw)",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                >
                  <h2
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      margin: "0 0 20px",
                    }}
                  >
                    {editingItem && "Edit Menu Item"}
                    {editingItem === null && "Add New Menu Item"}
                  </h2>
                  {menuNotice && menuNotice.type === "error" && (
                    <p role="alert" style={{ color: "#991b1b" }}>{menuNotice.text}</p>
                  )}
                  <form noValidate onSubmit={handleSubmitItem}>
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
                          maxLength={100}
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
                          max="9999"
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
                        required
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
                      {editingItem !== null && (
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>
                          Choose a new image only if you want to replace the current one.
                        </p>
                      )}
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
                          alt="Menu item image preview"
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
                </div>
              )}

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
                          {item.image && (
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
                          )}
                          {Boolean(item.image) === false && (
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
                          <select
                            aria-label={"Availability for " + item.name}
                            value={String(Boolean(item.availability))}
                            onChange={(event) => handleToggleStock(item, event.target.value)}
                            style={{
                              padding: "8px 10px",
                              border: "1px solid #d1d5db",
                              borderRadius: 8,
                              background: "#fff",
                              color: "#374151",
                              fontSize: 13,
                              fontFamily: "inherit",
                              cursor: "pointer",
                            }}
                          >
                            <option value="true">In Stock</option>
                            <option value="false">Out of Stock</option>
                          </select>
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

          {activeView === "stats" && ( <Statistics /> )}

          {activeView === "coupons" && ( <CouponManager/> )}

          {activeView === "notifications" && ( <NotificationManager/> )}

          {activeView === "users" && ( <UserManager/> )}

  
          {showOrderDeleteConfirm && (
            <div role="dialog" aria-modal="true" aria-label="Confirm order deletion" style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
            }}>
              <div style={{ background: "#fff", padding: 24, borderRadius: 14, width: "min(400px, 90vw)" }}>
                <p>Remove {selectedOrders.length} selected order(s) from the admin list?</p>
                <p>Only cancelled orders can be removed. They remain in the database and customer history.</p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowOrderDeleteConfirm(false)} disabled={orderDeleting} style={{
                    padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8,
                    background: "#fff", color: "#374151", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleDeleteSelected} disabled={orderDeleting} style={{
                    padding: "10px 18px", border: "1px solid #dc2626", borderRadius: 8,
                    background: "#dc2626", color: "#fff", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {orderDeleting && "Removing..."}
                    {orderDeleting === false && "Remove orders"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {pendingStatus !== null && (
            <div role="dialog" aria-modal="true" aria-label="Confirm order status" style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
            }}>
              <div style={{ background: "#fff", padding: 24, borderRadius: 14, width: "min(400px, 90vw)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
                <h2 style={{ fontSize: 18, margin: "0 0 12px", color: "#111827" }}>Update order status?</h2>
                <p style={{ color: "#374151", lineHeight: 1.5 }}>
                  Change order <strong>{formatOrderId(pendingStatus.orderId)}</strong> from <strong>{pendingStatus.oldStatus}</strong> to <strong>{pendingStatus.newStatus}</strong>?
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setPendingStatus(null)} style={{
                    padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8,
                    background: "#fff", color: "#374151", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => {
                    handleStatusChange(pendingStatus.orderId, pendingStatus.newStatus);
                    setPendingStatus(null);
                  }} style={{
                    padding: "10px 18px", border: "1px solid #FF5A36", borderRadius: 8,
                    background: "#FF5A36", color: "#fff", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Update status
                  </button>
                </div>
              </div>
            </div>
          )}

          {showLogoutConfirm && (
            <div role="dialog" aria-modal="true" aria-label="Confirm logout" style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
            }}>
              <div style={{ background: "#fff", padding: 24, borderRadius: 14, width: "min(400px, 90vw)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
                <h2 style={{ fontSize: 18, margin: "0 0 12px", color: "#111827" }}>Log out?</h2>
                <p style={{ color: "#374151", lineHeight: 1.5 }}>Are you sure you want to log out of the admin panel?</p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowLogoutConfirm(false)} style={{
                    padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8,
                    background: "#fff", color: "#374151", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleLogout} style={{
                    padding: "10px 18px", border: "1px solid #FF5A36", borderRadius: 8,
                    background: "#FF5A36", color: "#fff", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    Log out
                  </button>
                </div>
              </div>
            </div>
          )}

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

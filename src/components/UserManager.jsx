import { useState, useEffect } from "react";
import { useApp } from "../context/useApp";
import { useNav } from "../context/useNav";
import { authHeaders } from "../services/authService";

const PAGE_SIZE = 10;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Admin: list of registered users (paginated + search) with soft-delete
// deactivate / reactivate behind a confirmation dialog.
// Exports only UserManager component — React Compiler rule
export default function UserManager() {
  const { setAdminUser } = useApp();
  const { navigate } = useNav();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { text, error }
  const [confirming, setConfirming] = useState(null); // user awaiting confirmation
  const [saving, setSaving] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Admin token expired or revoked — send them back to the admin login.
  useEffect(() => {
    if (!sessionExpired) return;
    setAdminUser(null);
    navigate("admin-login");
  }, [sessionExpired, setAdminUser, navigate]);

  // `loading` is switched on by whatever changes page/query (initial state, pager,
  // search debounce); state is only set in promise callbacks, per the React Compiler rules.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page, pageSize: PAGE_SIZE });
    if (query) params.set("search", query);
    fetch(`/api/users?${params}`, { headers: authHeaders("admin") })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        if (cancelled) return;
        setUsers(list);
        setTotal(Number(res.headers.get("X-Total-Count") || 0));
      })
      .catch(() => {
        if (!cancelled) setMessage({ text: "Failed to load users. Is the API running?", error: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query]);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const next = search.trim();
    if (next === query) return undefined; // nothing changed — no refetch, so don't show "Loading…"
    const t = setTimeout(() => {
      setLoading(true);
      setPage(1);
      setQuery(next);
    }, 300);
    return () => clearTimeout(t);
  }, [search, query]);

  async function confirmToggle() {
    if (!confirming) return;
    const action = confirming.isActive ? "deactivate" : "reactivate";
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${confirming.id}/${action}`, {
        method: "PATCH",
        headers: authHeaders("admin"),
      });
      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.message || `Failed to ${action} user.`, error: true });
      } else {
        setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
        setMessage({ text: `${data.name} was ${action}d.`, error: false });
      }
    } catch {
      setMessage({ text: "Network error. Try again.", error: true });
    } finally {
      setSaving(false);
      setConfirming(null);
      setTimeout(() => setMessage(null), 2500);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cell = { padding: "14px 20px", fontSize: 14, color: "#111827" };
  const pagerBtn = (disabled) => ({
    padding: "8px 14px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: disabled ? "#f9fafb" : "#fff",
    color: disabled ? "#9ca3af" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: "#111827" }}>Registered Users</h1>

      {message && (
        <div
          role={message.error ? "alert" : "status"}
          style={{
            background: message.error ? "#fef2f2" : "#ecfdf5",
            color: message.error ? "#dc2626" : "#065f46",
            padding: "12px 16px",
            border: `1px solid ${message.error ? "#fecaca" : "#a7f3d0"}`,
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {message.text}
        </div>
      )}

      <input
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search users"
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          fontSize: 14,
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          marginBottom: 16,
        }}
      />

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fdf6ef", borderBottom: "1px solid #e5e7eb" }}>
              {["Name", "Email", "Role", "Joined", "Status", "Action"].map((head) => (
                <th
                  key={head}
                  style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#6b7280" }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ ...cell, color: "#6b7280" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...cell, color: "#6b7280" }}>
                  No users found.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ ...cell, fontWeight: 600 }}>{u.name}</td>
                  <td style={cell}>{u.email}</td>
                  <td style={{ ...cell, textTransform: "capitalize" }}>{u.role}</td>
                  <td style={cell}>{formatDate(u.createdAt)}</td>
                  <td style={cell}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        background: u.isActive ? "#dcfce7" : "#fee2e2",
                        color: u.isActive ? "#15803d" : "#b91c1c",
                      }}
                    >
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td style={cell}>
                    {u.role !== "admin" && (
                      <button
                        onClick={() => setConfirming(u)}
                        style={{
                          padding: "8px 14px",
                          border: `1px solid ${u.isActive ? "#fecaca" : "#bbf7d0"}`,
                          borderRadius: 6,
                          background: u.isActive ? "#fef2f2" : "#f0fdf4",
                          color: u.isActive ? "#dc2626" : "#15803d",
                          cursor: "pointer",
                          fontWeight: 500,
                          fontFamily: "inherit",
                        }}
                      >
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => { setLoading(true); setPage((p) => p - 1); }} style={pagerBtn(page <= 1)}>
          ‹ Previous
        </button>
        <span style={{ fontSize: 14, color: "#6b7280" }}>
          Page {page} of {pageCount} · {total} user{total === 1 ? "" : "s"}
        </span>
        <button
          disabled={page >= pageCount}
          onClick={() => { setLoading(true); setPage((p) => p + 1); }}
          style={pagerBtn(page >= pageCount)}
        >
          Next ›
        </button>
      </div>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-user-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h2 id="confirm-user-title" style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>
              {confirming.isActive ? "Deactivate" : "Reactivate"} {confirming.name}?
            </h2>
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 20px" }}>
              {confirming.isActive
                ? "They will be logged out and won't be able to log in until reactivated. Their order history is kept."
                : "They will be able to log in again."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setConfirming(null)}
                disabled={saving}
                style={{ ...pagerBtn(false), padding: "9px 16px" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                disabled={saving}
                style={{
                  padding: "9px 16px",
                  border: "none",
                  borderRadius: 6,
                  background: confirming.isActive ? "#dc2626" : "#16a34a",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving…" : confirming.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

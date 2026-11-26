import { useState, useEffect } from "react";
import { useApp } from "../context/useApp";
import { useNav } from "../context/useNav";
import { listUsers, setUserActive } from "../services/userService";
import { PERMISSIONS, ROLES, SORT_DIR, USER_SORT } from "../constants/auth";
import { hasPermission } from "../utils/rbac";
import { VIEW } from "../constants/views";
import FormAlert from "./FormAlert";

const PAGE_SIZE = 10;

const COLUMNS = [
  { label: "Name", sort: USER_SORT.NAME },
  { label: "Email", sort: USER_SORT.EMAIL },
  { label: "Role", sort: USER_SORT.ROLE },
  { label: "Joined", sort: USER_SORT.JOINED },
  { label: "Status", sort: USER_SORT.STATUS },
  { label: "Action" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}




export default function UserManager() {
  const { adminUser, setAdminUser } = useApp();
  const canDeactivate = hasPermission(adminUser, PERMISSIONS.USERS_DEACTIVATE);
  const { navigate } = useNav();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ field: USER_SORT.JOINED, dir: SORT_DIR.ASC });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); 
  const [confirming, setConfirming] = useState(null); 
  const [saving, setSaving] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  
  useEffect(() => {
    if (!sessionExpired) return;
    setAdminUser(null);
    navigate(VIEW.LOGIN);
  }, [sessionExpired, setAdminUser, navigate]);

  
  
  useEffect(() => {
    let cancelled = false;
    listUsers({ page, pageSize: PAGE_SIZE, search: query, sort: sort.field, dir: sort.dir })
      .then((result) => {
        if (cancelled) return;
        if (result.expired) {
          setSessionExpired(true);
          return;
        }
        setUsers(result.users);
        setTotal(result.total);
      })
      .catch(() => {
        if (!cancelled) setMessage({ text: "Couldn't load users. Please try again.", error: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, query, sort]);

  
  useEffect(() => {
    const next = search.trim();
    if (next === query) return undefined; 
    const t = setTimeout(() => {
      setLoading(true);
      setPage(1);
      setQuery(next);
    }, 300);
    return () => clearTimeout(t);
  }, [search, query]);

  function changeSort(field) {
    setLoading(true);
    setPage(1);
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === SORT_DIR.ASC ? SORT_DIR.DESC : SORT_DIR.ASC,
    }));
  }

  async function confirmToggle() {
    if (!confirming) return;
    const action = confirming.isActive ? "deactivate" : "reactivate";
    setSaving(true);
    try {
      const { expired, ok, data } = await setUserActive(confirming.id, !confirming.isActive);
      if (expired) {
        setSessionExpired(true);
        return;
      }
      if (!ok) {
        setMessage({ text: data.message || `Couldn't ${action} this user.`, error: true });
      } else {
        setUsers((prev) => prev.map((u) => (u.id === data.id ? data : u)));
        setMessage({ text: `${data.name} was ${action}d.`, error: false });
      }
    } catch {
      setMessage({ text: "Couldn't reach the server. Please try again.", error: true });
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
        <FormAlert tone={message.error ? "error" : "success"} style={{ marginBottom: 20, maxWidth: 560 }}>
          {message.text}
        </FormAlert>
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
              {COLUMNS.map((col) => {
                const active = col.sort && sort.field === col.sort;
                const arrow = !active ? "↕" : sort.dir === SORT_DIR.ASC ? "↑" : "↓";
                return (
                  <th
                    key={col.label}
                    aria-sort={active ? (sort.dir === SORT_DIR.ASC ? "ascending" : "descending") : undefined}
                    style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#6b7280" }}
                  >
                    {col.sort ? (
                      <button
                        type="button"
                        onClick={() => changeSort(col.sort)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: 0,
                          border: "none",
                          background: "none",
                          font: "inherit",
                          color: active ? "#111827" : "inherit",
                          cursor: "pointer",
                        }}
                      >
                        {col.label}
                        <span aria-hidden="true" style={{ opacity: active ? 1 : 0.4 }}>{arrow}</span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
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
                    {canDeactivate && u.role !== ROLES.ADMIN && (
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
                ? "They'll be logged out and can't log in until you reactivate them. Their orders are kept."
                : "They'll be able to log in again."}
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

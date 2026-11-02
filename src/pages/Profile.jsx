import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useApp } from "../context/useApp";
import { useNav } from "../context/useNav";
import { getUserProfile, updateUserProfile } from "../services/authService";

const STATUS_COLORS = {
  Pending: { color: "#b45309", bg: "#fef3c7" },
  Preparing: { color: "#1d4ed8", bg: "#dbeafe" },
  Ready: { color: "#7c3aed", bg: "#ede9fe" },
  Delivered: { color: "#15803d", bg: "#dcfce7" },
  Cancelled: { color: "#b91c1c", bg: "#fee2e2" },
};

const PAYMENT_LABEL = {
  "credit-card": "Credit Card",
  gcash: "GCash",
  cod: "Cash on Delivery",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function Profile() {
  const { user, setUser } = useApp();
  const { navigate } = useNav();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [tab, setTab] = useState("info"); // 'info' | 'orders' | 'security'
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressZip: "",
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showNameConfirm, setShowNameConfirm] = useState(false);

  // Redirect guests to the login screen — profile requires auth
  useEffect(() => {
    if (!user) navigate("login");
  }, [user, navigate]);

  // Wrapped in useCallback so the effects below contain no direct setState
  // calls — mirrors the hydrateActiveOrder pattern in OrderProvider.
  const hydrateProfile = useCallback((userId) => {
    setLoadingProfile(true);
    let cancelled = false;
    getUserProfile(userId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setProfile(result.user);
          setForm({
            name: result.user.name ?? "",
            email: result.user.email ?? "",
            phone: result.user.phone ?? "",
            // Legacy users have only `address` — pre-fill street so it isn't lost
            addressStreet: result.user.addressStreet ?? result.user.address ?? "",
            addressCity: result.user.addressCity ?? "",
            addressZip: result.user.addressZip ?? "",
          });
        } else {
          setError(result.message);
        }
      })
      .finally(() => !cancelled && setLoadingProfile(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateOrders = useCallback((userId) => {
    setLoadingOrders(true);
    let cancelled = false;
    fetch(`/api/orders?user_id=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (cancelled) return;
        // Newest first
        const sorted = [...list].sort((a, b) => {
          const ta = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
          const tb = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
          return tb - ta;
        });
        setOrders(sorted);
      })
      .catch(() => !cancelled && setOrders([]))
      .finally(() => !cancelled && setLoadingOrders(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // React Compiler dev-mode warns "setState in effect" — same documented
  // exception as OrderProvider.hydrateActiveOrder. Build is clean.
  useEffect(() => {
    if (!user?.id) return undefined;
    return hydrateProfile(user.id);
  }, [user?.id, hydrateProfile]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return hydrateOrders(user.id);
  }, [user?.id, hydrateOrders]);

  const nameChanged =
    form.name.trim() !== (profile?.name ?? "").trim();

  // 30-day cooldown is enforced server-side; the UI mirrors it so users see
  // the lock state before they try to save.
  const NAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
  const nameUnlockAt = profile?.nameChangedAt
    ? new Date(profile.nameChangedAt).getTime() + NAME_COOLDOWN_MS
    : 0;
  const nameLocked = nameUnlockAt > Date.now();
  const nameDaysLeft = nameLocked
    ? Math.ceil((nameUnlockAt - Date.now()) / (24 * 60 * 60 * 1000))
    : 0;

  const performSave = async () => {
    setError(null);
    setSaving(true);
    const result = await updateUserProfile(user.id, {
      name: form.name,
      email: form.email,
      phone: form.phone,
      addressStreet: form.addressStreet,
      addressCity: form.addressCity,
      addressZip: form.addressZip,
    });
    setSaving(false);
    setShowNameConfirm(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setProfile(result.user);
    setUser(result.user);
    setEditing(false);
    setSuccess("Profile updated successfully.");
  };

  const handleSaveInfo = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    // Name changes are one-shot per 30 days, so confirm before committing
    if (nameChanged) {
      setShowNameConfirm(true);
      return;
    }
    performSave();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (pwForm.newPassword !== pwForm.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    const result = await updateUserProfile(user.id, {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    setSuccess("Password changed successfully.");
  };

  const totalSpent = orders
    .filter((o) => o.status === "Delivered")
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const orderCount = orders.length;

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#fdf6ef" }}>
      <Navbar />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        {/* ── Profile header card ──────────────────────────────────────────── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #f3e8df",
            overflow: "hidden",
            marginBottom: 24,
            boxShadow: "0 4px 20px rgba(31, 41, 55, 0.04)",
          }}
        >
          <div
            style={{
              height: 80,
              background:
                "linear-gradient(135deg, #FF5A36 0%, #FB923C 50%, #FBBF24 100%)",
            }}
          />
          <div
            style={{
              padding: "0 32px 24px",
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              marginTop: -40,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "#fff",
                border: "4px solid #fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 700,
                color: "#FF5A36",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {(profile?.name ?? user.name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, paddingTop: 40, minWidth: 200 }}>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#111827",
                  margin: "0 0 4px",
                }}
              >
                {profile?.name ?? user.name}
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                {profile?.email ?? user.email}
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
                Member since {formatDate(profile?.createdAt)}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                paddingTop: 40,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "#fdf6ef",
                  border: "1px solid #f3e8df",
                  borderRadius: 10,
                  padding: "10px 16px",
                  minWidth: 100,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Orders
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "2px 0 0" }}>
                  {orderCount}
                </p>
              </div>
              <div
                style={{
                  background: "#fdf6ef",
                  border: "1px solid #f3e8df",
                  borderRadius: 10,
                  padding: "10px 16px",
                  minWidth: 100,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Total Spent
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#FF5A36", margin: "2px 0 0" }}>
                  ₱{totalSpent.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#ffffff",
            border: "1px solid #f3e8df",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}
        >
          {[
            { key: "info", label: "Personal Info" },
            { key: "orders", label: "Order History" },
            { key: "security", label: "Security" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setError(null);
                setSuccess(null);
              }}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: tab === t.key ? "#FF5A36" : "transparent",
                color: tab === t.key ? "#fff" : "#6b7280",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            style={{
              background: "#d1fae5",
              border: "1px solid #6ee7b7",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#065f46",
            }}
          >
            {success}
          </div>
        )}

        {/* ── Personal Info tab ────────────────────────────────────────────── */}
        {tab === "info" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #f3e8df",
              padding: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                Personal Information
              </h2>
              {!editing && !loadingProfile && (
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    padding: "8px 18px",
                    background: "#FF5A36",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            {loadingProfile ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Loading profile…</p>
            ) : editing ? (
              <form
                onSubmit={handleSaveInfo}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
              >
                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  disabled={nameLocked}
                  hint={
                    nameLocked
                      ? `Locked — you can change your name again in ${nameDaysLeft} day${nameDaysLeft === 1 ? "" : "s"}.`
                      : "You can change your name once every 30 days."
                  }
                />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="09xx xxx xxxx" />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field
                    label="Street Address"
                    value={form.addressStreet}
                    onChange={(v) => setForm({ ...form, addressStreet: v })}
                    placeholder="123 Rizal Avenue"
                  />
                </div>
                <Field
                  label="City"
                  value={form.addressCity}
                  onChange={(v) => setForm({ ...form, addressCity: v })}
                  placeholder="Manila"
                />
                <Field
                  label="ZIP Code"
                  value={form.addressZip}
                  onChange={(v) =>
                    setForm({ ...form, addressZip: v.replace(/\D/g, "").slice(0, 4) })
                  }
                  placeholder="1000"
                />
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        name: profile?.name ?? "",
                        email: profile?.email ?? "",
                        phone: profile?.phone ?? "",
                        addressStreet: profile?.addressStreet ?? profile?.address ?? "",
                        addressCity: profile?.addressCity ?? "",
                        addressZip: profile?.addressZip ?? "",
                      });
                      setError(null);
                    }}
                    style={{
                      padding: "10px 20px",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      color: "#374151",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: "10px 20px",
                      background: saving ? "#fdba74" : "#FF5A36",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: saving ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <ReadField label="Full Name" value={profile?.name} />
                <ReadField label="Email" value={profile?.email} />
                <ReadField label="Phone" value={profile?.phone} placeholder="Not set" />
                <ReadField label="Member Since" value={formatDate(profile?.createdAt)} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <ReadField
                    label="Street Address"
                    value={profile?.addressStreet ?? profile?.address}
                    placeholder="Not set"
                  />
                </div>
                <ReadField label="City" value={profile?.addressCity} placeholder="Not set" />
                <ReadField label="ZIP Code" value={profile?.addressZip} placeholder="Not set" />
              </div>
            )}
          </div>
        )}

        {/* ── Order history tab ────────────────────────────────────────────── */}
        {tab === "orders" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #f3e8df",
              padding: 28,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
              Past Orders
            </h2>

            {loadingOrders ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>Loading orders…</p>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>
                  You haven't placed any orders yet.
                </p>
                <button
                  onClick={() => navigate("menu")}
                  style={{
                    padding: "10px 20px",
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
                  Browse Menu
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {orders.map((o) => {
                  const meta = STATUS_COLORS[o.status] ?? STATUS_COLORS.Pending;
                  const items = o.items ?? [];
                  const itemCount = items.reduce((s, it) => s + (it.quantity ?? 0), 0);
                  return (
                    <div
                      key={o.order_id}
                      style={{
                        border: "1px solid #f3e8df",
                        borderRadius: 10,
                        padding: 16,
                        background: "#fdf6ef",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 12, color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Order
                          </p>
                          <p
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#111827",
                              margin: "2px 0 0",
                              fontFamily: "monospace",
                            }}
                          >
                            #{o.order_id}
                          </p>
                          <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                            {formatDate(o.created_at ?? o.createdAt)}
                          </p>
                        </div>
                        <span
                          style={{
                            background: meta.bg,
                            color: meta.color,
                            padding: "4px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {o.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
                        {items.slice(0, 3).map((it) => (
                          <div key={it.order_item_id} style={{ padding: "2px 0" }}>
                            {it.quantity}× {it.name ?? "Item"}
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div style={{ color: "#6b7280", fontSize: 12 }}>
                            +{items.length - 3} more item{items.length - 3 !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 10,
                          borderTop: "1px solid #f3e8df",
                          fontSize: 13,
                          color: "#6b7280",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
                          {PAYMENT_LABEL[o.payment?.payment_method] ?? "—"}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#FF5A36" }}>
                          ₱{(o.total_amount ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Name change confirmation modal ───────────────────────────────── */}
        {showNameConfirm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-confirm-title"
            onClick={() => !saving && setShowNameConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(17, 24, 39, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#ffffff",
                borderRadius: 14,
                maxWidth: 440,
                width: "100%",
                padding: 24,
                boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              }}
            >
              <h3
                id="name-confirm-title"
                style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}
              >
                Confirm your name
              </h3>
              <p style={{ fontSize: 14, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 }}>
                You're about to change your name to:
              </p>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#FF5A36",
                  background: "#fdf6ef",
                  border: "1px solid #f3e8df",
                  borderRadius: 8,
                  padding: "10px 14px",
                  margin: "0 0 12px",
                }}
              >
                {form.name.trim() || "(empty)"}
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>
                Once saved, you won't be able to change your name again for 30 days.
                Make sure this is the final proper name you want to use.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowNameConfirm(false)}
                  disabled={saving}
                  style={{
                    padding: "10px 18px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    color: "#374151",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={performSave}
                  disabled={saving}
                  style={{
                    padding: "10px 18px",
                    background: saving ? "#fdba74" : "#FF5A36",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {saving ? "Saving…" : "Yes, save name"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Security tab ─────────────────────────────────────────────────── */}
        {tab === "security" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #f3e8df",
              padding: 28,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
              Change Password
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              Must be 8+ characters with uppercase, number, and special character.
            </p>
            <form
              onSubmit={handleChangePassword}
              style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}
            >
              <Field
                label="Current Password"
                type="password"
                value={pwForm.currentPassword}
                onChange={(v) => setPwForm({ ...pwForm, currentPassword: v })}
                autoComplete="current-password"
              />
              <Field
                label="New Password"
                type="password"
                value={pwForm.newPassword}
                onChange={(v) => setPwForm({ ...pwForm, newPassword: v })}
                autoComplete="new-password"
              />
              <Field
                label="Confirm New Password"
                type="password"
                value={pwForm.confirm}
                onChange={(v) => setPwForm({ ...pwForm, confirm: v })}
                autoComplete="new-password"
              />
              <button
                type="submit"
                disabled={saving || !pwForm.currentPassword || !pwForm.newPassword}
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 20px",
                  background:
                    saving || !pwForm.currentPassword || !pwForm.newPassword
                      ? "#fdba74"
                      : "#FF5A36",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    saving || !pwForm.currentPassword || !pwForm.newPassword
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// Editable input — reused across the info form and password form
function Field({ label, value, onChange, type = "text", placeholder, autoComplete, disabled = false, hint }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: "#374151",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "10px 14px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          fontSize: 14,
          outline: "none",
          background: disabled ? "#f3f4f6" : "#fdf6ef",
          color: disabled ? "#9ca3af" : "inherit",
          cursor: disabled ? "not-allowed" : "text",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      {hint && (
        <span
          style={{
            display: "block",
            marginTop: 6,
            fontSize: 12,
            color: disabled ? "#b45309" : "#6b7280",
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

// Read-only field — shown when not in edit mode
function ReadField({ label, value, placeholder = "—" }) {
  return (
    <div>
      <p
        style={{
          fontSize: 12,
          color: "#6b7280",
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 15,
          color: value ? "#111827" : "#9ca3af",
          margin: "4px 0 0",
          fontWeight: value ? 500 : 400,
        }}
      >
        {value || placeholder}
      </p>
    </div>
  );
}

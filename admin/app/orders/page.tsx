"use client";
import { useEffect, useState, useMemo } from "react";
import Shell from "../../components/Shell";
import { api, fmtMoney, fmtDate } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import { TableSkeleton } from "../../components/Skeleton";

const STATUSES = ["PENDING", "PAID", "IN_PRODUCTION", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"];
const PAGE_SIZE = 25;

type SortKey = "id" | "createdAt" | "totalCents" | "status";
type SortDir = "asc" | "desc";

export default function OrdersAdmin() {
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [trackingModal, setTrackingModal] = useState<any>(null);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination state
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState(STATUSES[0]);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    try {
      const list = await api("/orders");
      setOrders(Array.isArray(list) ? list : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Filter by status tab
  const statusFiltered = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  // Filter by search (order ID or email)
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return statusFiltered;
    return statusFiltered.filter(
      (o) =>
        o.id?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q)
    );
  }, [statusFiltered, search]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...searchFiltered];
    arr.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "totalCents") {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else if (sortKey === "createdAt") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else {
        av = String(av ?? "").toLowerCase();
        bv = String(bv ?? "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [searchFiltered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginated = sorted.slice(pageStart, pageEnd);

  // Reset to page 1 when filter/search/sort changes
  useEffect(() => { setPage(1); }, [filter, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="sort-icon">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  function thClass(key: SortKey) {
    if (sortKey !== key) return "sortable";
    return `sortable sort-${sortDir === "asc" ? "asc" : "desc"}`;
  }

  // Select-all for current page
  const allPageSelected =
    paginated.length > 0 && paginated.every((o) => selected.has(o.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((o) => next.delete(o.id));
      } else {
        paginated.forEach((o) => next.add(o.id));
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkStatus() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = await confirm({
      title: "Update selected orders",
      message: `Set ${ids.length} order${ids.length > 1 ? "s" : ""} to status "${bulkStatus}"?`,
      confirmLabel: "Apply",
      variant: "danger",
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        ids.map((id) =>
          api(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ status: bulkStatus }) })
        )
      );
      success(`Updated ${ids.length} order${ids.length > 1 ? "s" : ""} to ${bulkStatus}`);
      setSelected(new Set());
      load();
    } catch (e: any) {
      error("Bulk update failed: " + e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
    if (viewing?.id === id) setViewing({ ...viewing, status });
  }

  async function generateInvoice(orderId: string) {
    setBusy(true);
    try {
      const inv = await api(`/invoices/order/${orderId}`, { method: "POST" });
      success(`Invoice ${inv.number} created`);
      load();
    } catch (e: any) {
      error("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function emailInvoice(orderId: string) {
    setBusy(true);
    try {
      const order = await api(`/orders/${orderId}`);
      let invoice;
      try {
        const all = await api("/invoices");
        invoice = all.find((i: any) => i.orderId === orderId);
      } catch {}
      if (!invoice) {
        invoice = await api(`/invoices/order/${orderId}`, { method: "POST" });
      }
      await api(`/invoices/${invoice.id}/email`, { method: "POST" });
      success("Invoice emailed to " + order.email);
    } catch (e: any) {
      error("Failed: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadInvoice(orderId: string) {
    try {
      const all: any[] = await api("/invoices");
      const inv = all.find((i: any) => i.orderId === orderId);
      if (!inv) {
        const ok = await confirm({
          title: "No invoice found",
          message: "No invoice yet for this order. Create one now?",
          confirmLabel: "Create",
          variant: "danger",
        });
        if (ok) generateInvoice(orderId);
        return;
      }
      window.open(`/api/invoices/${inv.id}/pdf`, "_blank");
    } catch (e: any) {
      error("Failed: " + e.message);
    }
  }

  function downloadPackingSlip(orderId: string) {
    window.open(`/api/invoices/order/${orderId}/packing-slip`, "_blank");
  }

  async function delOrder(id: string) {
    const ok = await confirm({
      title: "Delete order",
      message: `Permanently delete order #${id.slice(-8)}? Linked invoice and print job will remain.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api(`/orders/${id}`, { method: "DELETE" });
      if (viewing?.id === id) setViewing(null);
      load();
    } catch (e: any) {
      error("Failed: " + e.message);
    }
  }

  return (
    <Shell title="Orders" subtitle="Manage customer orders">
      <div className="panel">
        <div className="panel-head">
          <h3>Orders ({sorted.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="table-toolbar">
          <input
            type="search"
            placeholder="Search by order ID or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar">
            <span>{selected.size} order{selected.size > 1 ? "s" : ""} selected</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              style={{ width: "auto" }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn btn-sm" disabled={bulkBusy} onClick={applyBulkStatus}>
              {bulkBusy ? <><div className="btn-spinner" /> Applying…</> : "Apply"}
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              Clear
            </button>
          </div>
        )}

        {sorted.length === 0 && !loading ? (
          <div className="empty">
            <div className="icon">▦</div>
            <p>No orders found.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    style={{ width: "auto", margin: 0 }}
                    title="Select all on this page"
                  />
                </th>
                <th className={thClass("id")} onClick={() => handleSort("id")}>
                  ID {sortIcon("id")}
                </th>
                <th>Customer</th>
                <th className={thClass("totalCents")} onClick={() => handleSort("totalCents")}>
                  Total {sortIcon("totalCents")}
                </th>
                <th className={thClass("status")} onClick={() => handleSort("status")}>
                  Status {sortIcon("status")}
                </th>
                <th className={thClass("createdAt")} onClick={() => handleSort("createdAt")}>
                  Date {sortIcon("createdAt")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={8} cols={7} />
              ) : (
                paginated.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable-row"
                    onClick={() => setViewing(o)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        style={{ width: "auto", margin: 0 }}
                      />
                    </td>
                    <td>#{o.id.slice(-8)}</td>
                    <td>{o.email}</td>
                    <td>{fmtMoney(o.totalCents)}</td>
                    <td>
                      <span className={`badge ${badge(o.status)}`}>{o.status}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setViewing(o)}
                      >
                        View
                      </button>{" "}
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setTrackingModal(o)}
                      >
                        📦
                      </button>{" "}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => delOrder(o.id)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {!loading && sorted.length > PAGE_SIZE && (
          <div className="pagination">
            <button
              className="btn btn-sm btn-outline"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <span>
              {pageStart + 1}–{Math.min(pageEnd, sorted.length)} of {sorted.length}
            </span>
            <button
              className="btn btn-sm btn-outline"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {viewing && (
        <div className="modal-bg" onClick={() => setViewing(null)}>
          <div
            className="modal"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Order #{viewing.id.slice(-8)}</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              {viewing.email} · {fmtDate(viewing.createdAt)}
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <strong>Items</strong>
              <table style={{ marginTop: "0.5rem" }}>
                <tbody>
                  {(viewing.items || []).map((it: any) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>×{it.qty}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(it.priceCents * it.qty)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}><strong>Subtotal</strong></td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(viewing.subtotalCents || 0)}</td>
                  </tr>
                  {viewing.shippingCents > 0 && (
                    <tr>
                      <td colSpan={2}>Shipping ({viewing.shippingMethod})</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(viewing.shippingCents)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td style={{ textAlign: "right" }}><strong>{fmtMoney(viewing.totalCents)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {viewing.shippingAddr && (
              <div style={{ marginBottom: "1.5rem" }}>
                <strong>Shipping To</strong>
                <div
                  style={{
                    marginTop: "0.5rem",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    whiteSpace: "pre-line",
                  }}
                >
                  {viewing.shippingName}{"\n"}
                  {viewing.shippingAddr.line1}
                  {viewing.shippingAddr.line2 ? "\n" + viewing.shippingAddr.line2 : ""}
                  {"\n"}
                  {viewing.shippingAddr.postalCode} {viewing.shippingAddr.city}{"\n"}
                  {viewing.shippingAddr.country}
                </div>
              </div>
            )}

            {viewing.trackingNumber && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "0.85rem 1rem",
                  background: "var(--bg-elev-2)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                  }}
                >
                  Tracking
                </div>
                <div style={{ fontSize: "0.9rem" }}>
                  <strong>{viewing.trackingCarrier}</strong>:{" "}
                  <code>{viewing.trackingNumber}</code>
                  {viewing.shippedAt && (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Shipped {fmtDate(viewing.shippedAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <label>Status</label>
              <select
                value={viewing.status}
                onChange={(e) => setStatus(viewing.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {viewing.stlUploadId && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "0.85rem 1rem",
                  background: "var(--bg-elev-2)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                  }}
                >
                  Attached STL File
                </div>
                <a
                  href={`/api/stl/${viewing.stlUploadId}/download`}
                  className="btn btn-sm btn-outline"
                  target="_blank"
                  rel="noopener"
                >
                  ↓ Download STL
                </a>
              </div>
            )}

            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "1rem",
                marginBottom: "1rem",
              }}
            >
              <strong style={{ display: "block", marginBottom: "0.75rem" }}>Documents</strong>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-sm"
                  disabled={busy}
                  onClick={() => downloadInvoice(viewing.id)}
                >
                  {busy ? <><div className="btn-spinner" /> Working…</> : "📄 Invoice PDF"}
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={busy}
                  onClick={() => downloadPackingSlip(viewing.id)}
                >
                  📦 Packing Slip
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={busy}
                  onClick={() => emailInvoice(viewing.id)}
                >
                  {busy ? <><div className="btn-spinner" /> Working…</> : "✉ Email Invoice"}
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={busy}
                  onClick={() => generateInvoice(viewing.id)}
                >
                  {busy ? <><div className="btn-spinner" /> Working…</> : "+ Generate Invoice"}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingModal && (
        <TrackingModal
          order={trackingModal}
          onClose={() => setTrackingModal(null)}
          onSaved={() => {
            setTrackingModal(null);
            load();
          }}
        />
      )}
    </Shell>
  );
}

function TrackingModal({ order, onClose, onSaved }: any) {
  const [carrier, setCarrier] = useState(order.trackingCarrier || "PostNL");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!trackingNumber.trim()) {
      setErr("Tracking number required");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api(`/orders/${order.id}/tracking`, {
        method: "POST",
        body: JSON.stringify({ carrier, trackingNumber: trackingNumber.trim(), sendEmail }),
      });
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>Add Tracking — Order #{order.id.slice(-8)}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Save a tracking number. Status will move to SHIPPED automatically.
        </p>
        <div className="form">
          <div>
            <label>Carrier</label>
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
              <option value="PostNL">PostNL</option>
              <option value="DHL">DHL</option>
              <option value="DPD">DPD</option>
              <option value="UPS">UPS</option>
              <option value="GLS">GLS</option>
            </select>
          </div>
          <div>
            <label>Tracking Number</label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="3SKABA123456789"
              autoFocus
            />
          </div>
          <div>
            <label
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              <span>Email customer with tracking link</span>
            </label>
          </div>
          {err && <div className="error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button className="btn" disabled={busy} onClick={save}>
              {busy ? <><div className="btn-spinner" /> Saving…</> : "Save Tracking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function badge(s: string) {
  if (["PAID", "COMPLETED", "SHIPPED"].includes(s)) return "badge-success";
  if (["PENDING", "IN_PRODUCTION"].includes(s)) return "badge-warning";
  if (["CANCELLED", "REFUNDED"].includes(s)) return "badge-danger";
  return "badge-muted";
}

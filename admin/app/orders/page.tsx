"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { api("/orders").then(setOrders); }, []);
  async function setStatus(id: string, status: string) {
    await api(`/orders/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
    api("/orders").then(setOrders);
  }
  return (
    <div className="card">
      <h1>Orders</h1>
      <table>
        <thead><tr><th>ID</th><th>Email</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{orders.map(o => (
          <tr key={o.id}>
            <td>{o.id.slice(0,8)}</td>
            <td>{o.email}</td>
            <td>€{(o.totalCents/100).toFixed(2)}</td>
            <td>{o.status}</td>
            <td>
              <select value={o.status} onChange={e => setStatus(o.id, e.target.value)}>
                {["PENDING","PAID","IN_PRODUCTION","SHIPPED","COMPLETED","CANCELLED","REFUNDED"].map(s => <option key={s}>{s}</option>)}
              </select>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

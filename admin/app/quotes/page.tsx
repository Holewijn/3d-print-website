"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const load = () => api("/quotes").then(setQuotes);
  useEffect(() => { load(); }, []);
  async function approve(id: string) {
    await api(`/quotes/${id}`, { method: "PUT", body: JSON.stringify({ status: "APPROVED" }) });
    load();
  }
  async function reject(id: string) {
    await api(`/quotes/${id}`, { method: "PUT", body: JSON.stringify({ status: "REJECTED" }) });
    load();
  }
  async function convert(id: string) {
    await api(`/quotes/${id}/convert-to-order`, { method: "POST" });
    load();
  }
  return (
    <div className="card">
      <h1>Quotes</h1>
      <table>
        <thead><tr><th>ID</th><th>Email</th><th>Material</th><th>Total</th><th>Status</th><th>STL</th><th>Actions</th></tr></thead>
        <tbody>{quotes.map(q => (
          <tr key={q.id}>
            <td>{q.id.slice(0,8)}</td>
            <td>{q.email}</td>
            <td>{q.material}</td>
            <td>€{((q.totalCents||0)/100).toFixed(2)}</td>
            <td>{q.status}</td>
            <td><a href={`/api/stl/${q.stlUploadId}/download`} className="btn">Download</a></td>
            <td>
              <button className="btn" onClick={() => approve(q.id)}>Approve</button>{" "}
              <button className="btn btn-danger" onClick={() => reject(q.id)}>Reject</button>{" "}
              <button className="btn" onClick={() => convert(q.id)}>→ Order</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

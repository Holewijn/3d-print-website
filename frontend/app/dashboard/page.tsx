"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  useEffect(() => {
    api("/auth/me").then(setMe).catch(() => location.href = "/login/");
    api("/users/me/orders").then(setOrders).catch(() => {});
    api("/users/me/quotes").then(setQuotes).catch(() => {});
  }, []);
  if (!me) return <p>Loading…</p>;
  return (
    <div>
      <div className="card">
        <h1>Welcome, {me.email}</h1>
        <button className="btn" onClick={async () => { await api("/auth/logout", { method: "POST" }); location.href = "/"; }}>Logout</button>
      </div>
      <div className="card">
        <h2>My Orders</h2>
        {orders.length === 0 && <p>No orders yet.</p>}
        <ul>{orders.map(o => <li key={o.id}>{o.id} — €{(o.totalCents/100).toFixed(2)} — {o.status}</li>)}</ul>
      </div>
      <div className="card">
        <h2>My Quotes</h2>
        {quotes.length === 0 && <p>No quotes yet.</p>}
        <ul>{quotes.map(q => <li key={q.id}>{q.id} — €{((q.totalCents||0)/100).toFixed(2)} — {q.status}</li>)}</ul>
      </div>
    </div>
  );
}

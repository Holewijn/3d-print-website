export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
}

export function fmtMoney(cents: number, cur = "EUR") {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: cur }).format((cents || 0) / 100);
}

export function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });
}

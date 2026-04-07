import { getSetting } from "./settings";

// Returns price in cents per kWh
export async function getEnergyPriceCentsKwh(): Promise<number> {
  const provider = await getSetting<string>("energy.provider", "manual");
  if (provider === "zonneplan") {
    try {
      const apiKey = await getSetting<string>("energy.zonneplanKey", "");
      if (!apiKey) throw new Error("no key");
      // placeholder endpoint — real one to be configured per account
      const r = await fetch("https://app-api.zonneplan.nl/api/v1/electricity-tariffs/current", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (r.ok) {
        const j: any = await r.json();
        const eur = j?.data?.price_total ?? null;
        if (eur) return Math.round(eur * 100);
      }
    } catch { /* fall through */ }
  }
  const manual = await getSetting<number>("energy.priceKwh", 0.30);
  return Math.round(manual * 100);
}

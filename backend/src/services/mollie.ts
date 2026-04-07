import { getSetting } from "./settings";

export async function createMolliePayment(opts: {
  amountCents: number;
  description: string;
  orderId: string;
  redirectUrl: string;
  webhookUrl: string;
}) {
  const apiKey = (await getSetting<string>("mollie.apiKey", "")) || process.env.MOLLIE_API_KEY || "";
  if (!apiKey) throw new Error("Mollie API key not configured");
  const body = {
    amount: { currency: "EUR", value: (opts.amountCents / 100).toFixed(2) },
    description: opts.description,
    redirectUrl: opts.redirectUrl,
    webhookUrl: opts.webhookUrl,
    metadata: { orderId: opts.orderId },
    method: ["ideal", "bancontact", "creditcard"]
  };
  const r = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Mollie create failed: ${r.status} ${await r.text()}`);
  return r.json() as Promise<any>;
}

export async function getMolliePayment(id: string) {
  const apiKey = (await getSetting<string>("mollie.apiKey", "")) || process.env.MOLLIE_API_KEY || "";
  const r = await fetch(`https://api.mollie.com/v2/payments/${id}`, {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  if (!r.ok) throw new Error(`Mollie fetch failed: ${r.status}`);
  return r.json() as Promise<any>;
}

import { sendMail } from "./email";
import { getSetting } from "./settings";

export const CARRIERS = ["PostNL", "DHL", "DPD", "UPS", "GLS"] as const;
export type Carrier = typeof CARRIERS[number];

export function buildTrackingUrl(carrier: string, number: string, postalCode?: string | null): string {
  const n = encodeURIComponent(number.trim());
  const pc = encodeURIComponent((postalCode || "").replace(/\s/g, ""));
  switch (carrier) {
    case "PostNL": return `https://jouw.postnl.nl/track-and-trace/${n}-NL-${pc}`;
    case "DHL":    return `https://www.dhl.com/nl-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${n}`;
    case "DPD":    return `https://tracking.dpd.de/status/en_US/parcel/${n}`;
    case "UPS":    return `https://www.ups.com/track?tracknum=${n}`;
    case "GLS":    return `https://gls-group.eu/track/${n}`;
    default:       return "";
  }
}

export async function sendTrackingEmail(order: any, carrier: string, trackingNumber: string, trackingUrl: string): Promise<void> {
  if (!order.email) return;
  const companyName = await getSetting<string>("company.name", "3D Print Studio");
  const orderShort = order.id.slice(-8).toUpperCase();
  const total = (order.totalCents / 100).toFixed(2);

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1a202c;">
  <h2 style="color: #2563eb;">📦 Your order is on its way!</h2>
  <p>Hi,</p>
  <p>Good news — your order <strong>#${orderShort}</strong> has been shipped via <strong>${carrier}</strong>.</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
    <div style="font-size: 0.78rem; color: #6b7280; text-transform: uppercase; font-weight: 700;">Tracking number</div>
    <div style="font-family: monospace; font-size: 1.1rem; margin-top: 0.25rem;">${trackingNumber}</div>
  </div>
  <p style="text-align: center; margin: 2rem 0;">
    <a href="${trackingUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 0.85rem 2rem; border-radius: 6px; text-decoration: none; font-weight: 700;">
      Track Your Package →
    </a>
  </p>
  <p style="color: #6b7280; font-size: 0.85rem;">Order total: €${total}</p>
  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 0.8rem;">Questions? Just reply to this email.</p>
  <p style="color: #6b7280; font-size: 0.8rem;">— ${companyName}</p>
</body></html>`.trim();

  await sendMail({
    to: order.email,
    subject: `Your order #${orderShort} has shipped — ${carrier} tracking`,
    html,
  });
}

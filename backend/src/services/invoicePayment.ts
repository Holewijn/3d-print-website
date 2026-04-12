import { prisma } from "../db";
import { createMolliePayment } from "./mollie";
import { sendMail } from "./email";
import { getSetting } from "./settings";

export async function createInvoicePaymentLink(invoiceId: string): Promise<{ checkoutUrl: string; paymentId: string }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.paidAt) throw new Error("Invoice is already paid");

  const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  const customerEmail = invoice.order?.email || "";

  const payment = await createMolliePayment({
    amountCents: invoice.totalCents,
    description: `Invoice ${invoice.number}`,
    orderId: invoice.id, // we use invoice.id as the lookup key on webhook
    redirectUrl: `${base}/invoice/${invoice.id}/thanks`,
    webhookUrl: `${base}/api/payments/invoice-webhook`,
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { molliePaymentId: payment.id },
  });

  return {
    checkoutUrl: payment._links?.checkout?.href || "",
    paymentId: payment.id,
  };
}

export function invoicePaymentEmailHtml(invoice: any, paymentLink: string, companyName: string): string {
  const total = (invoice.totalCents / 100).toFixed(2);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice ${invoice.number}</title></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1a202c;">
  <h2 style="color: #2563eb;">Payment Request — Invoice ${invoice.number}</h2>
  <p>Hi,</p>
  <p>Thank you for your business with ${companyName}. Your invoice <strong>${invoice.number}</strong> is ready and the total amount is <strong>€${total}</strong>.</p>
  <p>Please use the secure link below to pay online via iDEAL, credit card, Bancontact, or any of our supported payment methods.</p>
  <p style="text-align: center; margin: 2rem 0;">
    <a href="${paymentLink}" style="display: inline-block; background: #2563eb; color: #fff; padding: 0.85rem 2rem; border-radius: 6px; text-decoration: none; font-weight: 700;">
      Pay €${total} Now →
    </a>
  </p>
  <p style="color: #6b7280; font-size: 0.85rem;">If the button doesn't work, copy this link into your browser:<br><a href="${paymentLink}" style="color: #2563eb; word-break: break-all;">${paymentLink}</a></p>
  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 0.8rem;">If you have any questions about this invoice, just reply to this email.</p>
  <p style="color: #6b7280; font-size: 0.8rem;">— ${companyName}</p>
</body>
</html>`.trim();
}

export async function emailInvoicePaymentLink(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (!invoice.order?.email) throw new Error("No customer email on order");

  // Make sure we have a payment link
  let checkoutUrl = "";
  if (!invoice.molliePaymentId) {
    const created = await createInvoicePaymentLink(invoiceId);
    checkoutUrl = created.checkoutUrl;
  } else {
    // Re-fetch payment from Mollie to get the URL
    const { getMolliePayment } = await import("./mollie");
    const p = await getMolliePayment(invoice.molliePaymentId);
    checkoutUrl = p._links?.checkout?.href || "";
  }

  if (!checkoutUrl) throw new Error("Failed to get payment link");

  const companyName = await getSetting<string>("company.name", "3D Print Studio");
  const html = invoicePaymentEmailHtml(invoice, checkoutUrl, companyName);

  await sendMail({
    to: invoice.order.email,
    subject: `Invoice ${invoice.number} — Payment Link`,
    html,
  });
}

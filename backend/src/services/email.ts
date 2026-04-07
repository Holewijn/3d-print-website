import nodemailer from "nodemailer";
import { getSetting } from "./settings";

export async function getMailer() {
  const [host, port, user, pass, secure] = await Promise.all([
    getSetting<string>("smtp.host", process.env.SMTP_HOST || ""),
    getSetting<number>("smtp.port", parseInt(process.env.SMTP_PORT || "587")),
    getSetting<string>("smtp.user", process.env.SMTP_USER || ""),
    getSetting<string>("smtp.pass", process.env.SMTP_PASS || ""),
    getSetting<boolean>("smtp.secure", false),
  ]);
  if (!host) throw new Error("SMTP host not configured");
  return nodemailer.createTransport({
    host, port, secure,
    auth: user ? { user, pass } : undefined,
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; path: string }>;
}

export async function sendMail(opts: SendMailOptions) {
  const transporter = await getMailer();
  const from = (await getSetting<string>("smtp.from", process.env.SMTP_FROM || "noreply@local"));
  return transporter.sendMail({ from, ...opts });
}

export async function sendInvoiceEmail(invoice: any) {
  const companyName = await getSetting<string>("company.name", "3D Print Studio");
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Thank you for your order!</h2>
      <p>Hi ${invoice.customerName || "there"},</p>
      <p>Your invoice <strong>${invoice.number}</strong> is attached to this email.</p>
      <table style="border-collapse: collapse; width: 100%; margin-top: 1rem;">
        <tr><td style="padding: 4px 0; color: #64748b;">Invoice number</td><td style="padding: 4px 0;"><strong>${invoice.number}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: #64748b;">Total</td><td style="padding: 4px 0;"><strong>€ ${(invoice.totalCents / 100).toFixed(2)}</strong></td></tr>
      </table>
      <p style="margin-top: 2rem;">If you have any questions, just reply to this email.</p>
      <p>— ${companyName}</p>
    </div>
  `;
  return sendMail({
    to: invoice.customerEmail,
    subject: `Invoice ${invoice.number} from ${companyName}`,
    html,
    attachments: invoice.pdfPath ? [{ filename: `invoice-${invoice.number}.pdf`, path: invoice.pdfPath }] : [],
  });
}

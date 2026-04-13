import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../db";
import { getSetting } from "./settings";

const INVOICE_DIR = process.env.INVOICE_DIR || "/var/lib/print3d/invoices";
fs.mkdirSync(INVOICE_DIR, { recursive: true });

// ─── Number generation ─────────────────────────────────
async function nextInvoiceNumber(): Promise<{ number: string; year: number; sequence: number }> {
  const year = new Date().getFullYear();
  // Atomic-ish: take max sequence for current year, add 1.
  const last = await prisma.invoice.findFirst({
    where: { year },
    orderBy: { sequence: "desc" },
  });
  const sequence = (last?.sequence ?? 0) + 1;
  const number = `${year}-${sequence.toString().padStart(4, "0")}`;
  return { number, year, sequence };
}

// ─── Build company info from settings ──────────────────
async function getCompanyInfo() {
  const [name, line1, line2, postalCode, city, country, kvk, btw, iban, bic, bank, email, phone, website, logoUrl, vatRate, paymentTerms, footerNote] = await Promise.all([
    getSetting<string>("company.name", "3D Print Studio"),
    getSetting<string>("company.addressLine1", ""),
    getSetting<string>("company.addressLine2", ""),
    getSetting<string>("company.postalCode", ""),
    getSetting<string>("company.city", ""),
    getSetting<string>("company.country", "Netherlands"),
    getSetting<string>("company.kvk", ""),
    getSetting<string>("company.btw", ""),
    getSetting<string>("company.iban", ""),
    getSetting<string>("company.bic", ""),
    getSetting<string>("company.bank", ""),
    getSetting<string>("company.email", ""),
    getSetting<string>("company.phone", ""),
    getSetting<string>("company.website", ""),
    getSetting<string>("company.logoUrl", ""),
    getSetting<number>("invoice.vatRate", 21),
    getSetting<string>("invoice.paymentTerms", "Payment within 14 days of invoice date."),
    getSetting<string>("invoice.footerNote", ""),
  ]);
  return {
    name, line1, line2, postalCode, city, country,
    kvk, btw, iban, bic, bank, email, phone, website, logoUrl,
    vatRate, paymentTerms, footerNote,
  };
}

// ─── Create an invoice for an order ───────────────────
export async function createInvoiceForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, invoice: true },
  });
  if (!order) throw new Error("Order not found");
  if (order.invoice) return order.invoice; // already exists

  const company = await getCompanyInfo();
  const { number, year, sequence } = await nextInvoiceNumber();

  // Treat order totals as VAT-inclusive (consumer pricing).
  // subtotalCents (inc VAT) → split into ex-VAT subtotal + VAT.
  const totalIncVat = order.subtotalCents + order.shippingCents;
  const vatRate = company.vatRate || 0;
  const vatMultiplier = 1 + vatRate / 100;
  const totalExVat = Math.round(totalIncVat / vatMultiplier);
  const vatCents = totalIncVat - totalExVat;
  const subtotalExVat = Math.round(order.subtotalCents / vatMultiplier);
  const shippingExVat = Math.round(order.shippingCents / vatMultiplier);

  const lineItems = order.items.map((it) => ({
    name: it.name,
    qty: it.qty,
    unitPriceExVat: Math.round(it.priceCents / vatMultiplier),
    lineTotalExVat: Math.round((it.priceCents * it.qty) / vatMultiplier),
    unitPriceIncVat: it.priceCents,
    lineTotalIncVat: it.priceCents * it.qty,
  }));

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 14);

  const invoice = await prisma.invoice.create({
    data: {
      number, year, sequence,
      orderId: order.id,
      dueAt,
      paidAt: order.status === "PAID" ? new Date() : null,
      companyName: company.name,
      companyAddress: {
        line1: company.line1, line2: company.line2,
        postalCode: company.postalCode, city: company.city, country: company.country,
        email: company.email, phone: company.phone, website: company.website,
      },
      companyKvk: company.kvk,
      companyBtw: company.btw,
      companyIban: company.iban,
      companyBic: company.bic,
      companyBank: company.bank,
      customerName: order.shippingName || order.email,
      customerEmail: order.email,
      customerAddress: order.shippingAddr || {},
      subtotalCents: subtotalExVat,
      vatRate,
      vatCents,
      shippingCents: shippingExVat,
      totalCents: totalIncVat,
      lineItems,
      notes: company.paymentTerms,
    },
  });

  // Render PDF and save
  const pdfPath = path.join(INVOICE_DIR, `invoice-${number}.pdf`);
  await renderInvoicePdf(invoice, company, pdfPath);
  await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath } });

  return invoice;
}

// ─── PDF rendering ─────────────────────────────────────
function fmtMoney(cents: number) {
  return `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

async function renderInvoicePdf(invoice: any, company: any, outPath: string) {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    stream.on("finish", () => resolve());
    stream.on("error", reject);

    const PRIMARY = "#2563eb";
    const TEXT = "#0f172a";
    const MUTED = "#64748b";
    const LIGHT = "#e2e8f0";

    // ─── Header: company info on left, INVOICE label on right ───
    let y = 50;
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(18).text(company.name, 50, y);
    y += 22;
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    if (company.line1) { doc.text(company.line1, 50, y); y += 12; }
    if (company.postalCode || company.city) { doc.text(`${company.postalCode} ${company.city}`, 50, y); y += 12; }
    if (company.country) { doc.text(company.country, 50, y); y += 12; }
    if (company.email) { doc.text(company.email, 50, y); y += 12; }
    if (company.phone) { doc.text(company.phone, 50, y); y += 12; }
    if (company.website) { doc.text(company.website, 50, y); y += 12; }

    // INVOICE label (right side)
    doc.font("Helvetica-Bold").fontSize(28).fillColor(PRIMARY).text("INVOICE", 350, 50, { align: "right", width: 200 });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`Invoice number`, 350, 90, { align: "right", width: 200 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text(invoice.number, 350, 102, { align: "right", width: 200 });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Issue date", 350, 122, { align: "right", width: 200 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT).text(formatDate(invoice.issuedAt), 350, 134, { align: "right", width: 200 });
    if (invoice.dueAt) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Due date", 350, 152, { align: "right", width: 200 });
      doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT).text(formatDate(invoice.dueAt), 350, 164, { align: "right", width: 200 });
    }

    y = Math.max(y + 20, 200);

    // ─── Bill To ───
    doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED).text("BILL TO", 50, y);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text(invoice.customerName, 50, y);
    y += 14;
    const addr = invoice.customerAddress || {};
    doc.font("Helvetica").fontSize(10).fillColor(TEXT);
    if (addr.line1) { doc.text(addr.line1, 50, y); y += 12; }
    if (addr.line2) { doc.text(addr.line2, 50, y); y += 12; }
    if (addr.postalCode || addr.city) { doc.text(`${addr.postalCode || ""} ${addr.city || ""}`.trim(), 50, y); y += 12; }
    if (addr.country) { doc.text(addr.country, 50, y); y += 12; }
    if (invoice.customerEmail) { doc.fillColor(MUTED).text(invoice.customerEmail, 50, y); y += 12; }

    y += 20;

    // ─── Line items table ───
    const tableTop = y;
    const colDesc = 50, colQty = 320, colUnit = 380, colTotal = 480;
    doc.rect(50, tableTop, 500, 24).fill("#f1f5f9");
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(9);
    doc.text("DESCRIPTION", colDesc + 8, tableTop + 8);
    doc.text("QTY", colQty, tableTop + 8, { width: 40, align: "right" });
    doc.text("UNIT PRICE", colUnit - 10, tableTop + 8, { width: 80, align: "right" });
    doc.text("TOTAL", colTotal, tableTop + 8, { width: 70, align: "right" });

    y = tableTop + 24;
    doc.font("Helvetica").fontSize(10).fillColor(TEXT);
    for (const it of invoice.lineItems) {
      const rowY = y + 8;
      doc.text(it.name, colDesc + 8, rowY, { width: 250 });
      doc.text(String(it.qty), colQty, rowY, { width: 40, align: "right" });
      doc.text(fmtMoney(it.unitPriceExVat), colUnit - 10, rowY, { width: 80, align: "right" });
      doc.text(fmtMoney(it.lineTotalExVat), colTotal, rowY, { width: 70, align: "right" });
      y += 24;
      doc.moveTo(50, y).lineTo(550, y).strokeColor(LIGHT).stroke();
    }

    // ─── Totals ───
    y += 16;
    const totalsX = 350;
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("Subtotal", totalsX, y, { width: 130, align: "right" });
    doc.fillColor(TEXT).text(fmtMoney(invoice.subtotalCents), totalsX + 140, y, { width: 70, align: "right" });
    y += 16;
    if (invoice.shippingCents > 0) {
      doc.fillColor(MUTED).text("Shipping", totalsX, y, { width: 130, align: "right" });
      doc.fillColor(TEXT).text(fmtMoney(invoice.shippingCents), totalsX + 140, y, { width: 70, align: "right" });
      y += 16;
    }
    doc.fillColor(MUTED).text(`VAT (${invoice.vatRate}%)`, totalsX, y, { width: 130, align: "right" });
    doc.fillColor(TEXT).text(fmtMoney(invoice.vatCents), totalsX + 140, y, { width: 70, align: "right" });
    y += 20;
    doc.moveTo(totalsX, y - 4).lineTo(550, y - 4).strokeColor(LIGHT).stroke();
    doc.font("Helvetica-Bold").fontSize(13).fillColor(PRIMARY);
    doc.text("TOTAL", totalsX, y, { width: 130, align: "right" });
    doc.text(fmtMoney(invoice.totalCents), totalsX + 140, y, { width: 70, align: "right" });

    // ─── Payment status ───
    if (invoice.paidAt) {
      y += 28;
      doc.rect(350, y, 200, 22).fill("#dcfce7");
      doc.fillColor("#16a34a").font("Helvetica-Bold").fontSize(10).text(`✓ PAID on ${formatDate(invoice.paidAt)}`, 360, y + 7);
    }

    // ─── Footer: payment details ───
    let footerY = 700;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text("PAYMENT DETAILS", 50, footerY);
    footerY += 14;
    doc.font("Helvetica").fontSize(9).fillColor(TEXT);
    if (invoice.companyBank)  { doc.text(`Bank: ${invoice.companyBank}`, 50, footerY); footerY += 11; }
    if (invoice.companyIban)  { doc.text(`IBAN: ${invoice.companyIban}`, 50, footerY); footerY += 11; }
    if (invoice.companyBic)   { doc.text(`BIC:  ${invoice.companyBic}`, 50, footerY); footerY += 11; }
    if (invoice.companyKvk)   { doc.text(`KvK:  ${invoice.companyKvk}`, 50, footerY); footerY += 11; }
    if (invoice.companyBtw)   { doc.text(`BTW:  ${invoice.companyBtw}`, 50, footerY); footerY += 11; }

    if (invoice.notes) {
      doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text(invoice.notes, 50, 760, { width: 500, align: "center" });
    }
    if (company.footerNote) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(company.footerNote, 50, 790, { width: 500, align: "center" });
    }

    doc.end();
  });
}

export async function generateInvoicePdf(invoice: any): Promise<string> {
  const company = await getCompanyInfo();
  const pdfPath = path.join(INVOICE_DIR, `invoice-${invoice.number}.pdf`);
  await renderInvoicePdf(invoice, company, pdfPath);
  return pdfPath;
}

export async function generatePackingSlipPdf(order: any): Promise<string> {
  return renderPackingSlip(order.id);
}

function formatDate(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Packing slip (no prices) ─────────────────────────
export async function renderPackingSlip(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error("Order not found");
  const company = await getCompanyInfo();
  const outPath = path.join(INVOICE_DIR, `packing-${order.id}.pdf`);

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text(company.name, 50, 50);
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#2563eb").text("PACKING SLIP", 50, 80);

    doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(`Order #${order.id.slice(-8).toUpperCase()}`, 50, 120);
    doc.text(`Date: ${formatDate(order.createdAt)}`, 50, 134);

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#64748b").text("SHIP TO", 50, 170);
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text(order.shippingName || order.email, 50, 184);
    const addr: any = order.shippingAddr || {};
    let y = 200;
    doc.font("Helvetica").fontSize(11).fillColor("#0f172a");
    if (addr.line1) { doc.text(addr.line1, 50, y); y += 14; }
    if (addr.line2) { doc.text(addr.line2, 50, y); y += 14; }
    if (addr.postalCode || addr.city) { doc.text(`${addr.postalCode || ""} ${addr.city || ""}`.trim(), 50, y); y += 14; }
    if (addr.country) { doc.text(addr.country, 50, y); y += 14; }
    if (order.shippingPhone) { doc.text(order.shippingPhone, 50, y); y += 14; }

    y += 30;
    doc.rect(50, y, 500, 28).fill("#f1f5f9");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
    doc.text("ITEM", 60, y + 10);
    doc.text("QTY", 470, y + 10, { width: 70, align: "right" });
    y += 28;
    doc.font("Helvetica").fontSize(11).fillColor("#0f172a");
    for (const it of order.items) {
      doc.text(it.name, 60, y + 8, { width: 400 });
      doc.text(String(it.qty), 470, y + 8, { width: 70, align: "right" });
      y += 28;
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#e2e8f0").stroke();
    }

    if (order.shippingMethod) {
      y += 20;
      doc.font("Helvetica").fontSize(10).fillColor("#64748b").text(`Shipping: ${order.shippingMethod}`, 50, y);
    }

    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text("Thank you for your order!", 50, 760, { width: 500, align: "center" });
    doc.end();
  });
}

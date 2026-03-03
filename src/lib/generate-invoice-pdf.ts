import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type BusinessInfo = {
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
};

type InvoiceData = {
  id: string;
  total_amount: number;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  is_fixed_price?: boolean;
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  clientName: string;
  clientEmail?: string;
  projectName?: string;
  footer?: string | null;
  terms_and_conditions?: string | null;
  business?: BusinessInfo;
  items: Array<{
    description: string;
    quantity: number;
    unit_rate: number;
    amount: number;
  }>;
};

const MARGIN = 50;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 <= maxLen) {
      line += (line ? " " : "") + w;
    } else {
      if (line) lines.push(line);
      line = w.length > maxLen ? w.slice(0, maxLen) : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  let y = PAGE_HEIGHT - MARGIN;
  const sectionGap = 20;

  const drawText = (
    text: string,
    x: number,
    size = 10,
    bold = false,
    color = rgb(0.1, 0.1, 0.1)
  ) => {
    const f = bold ? fontBold : font;
    page.drawText(text, { x, y, size, font: f, color });
    y -= size + 4;
  };

  const businessName = data.business?.name || "Your Business";

  // Header - business name and Invoice label (left side)
  drawText(businessName, MARGIN, 20, true);
  drawText("Invoice", MARGIN, 12);
  y -= sectionGap;

  // Invoice # and dates (right column) - use fixed positions for this row
  const invoiceNumY = PAGE_HEIGHT - MARGIN - 14;
  page.drawText(`Invoice #${data.id.slice(0, 8)}`, {
    x: PAGE_WIDTH - MARGIN - 80,
    y: invoiceNumY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Bill From / Bill To / Dates - three columns
  const col1X = MARGIN;
  const col2X = 220;
  const col3X = PAGE_WIDTH - MARGIN - 120;

  const infoBlockY = y;

  page.drawText("Bill From", { x: col1X, y: infoBlockY, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(businessName, { x: col1X, y: infoBlockY - 12, size: 10, font });
  let by = infoBlockY - 28;
  if (data.business?.address) {
    const addrLines = wrapText(data.business.address, 35);
    for (const line of addrLines.slice(0, 3)) {
      page.drawText(line.slice(0, 45), { x: col1X, y: by, size: 9, font });
      by -= 12;
    }
  }
  if (data.business?.phone) {
    page.drawText(data.business.phone.slice(0, 30), { x: col1X, y: by, size: 9, font });
    by -= 12;
  }

  page.drawText("Bill To", { x: col2X, y: infoBlockY, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(data.clientName.slice(0, 35), { x: col2X, y: infoBlockY - 12, size: 10, font });
  if (data.clientEmail) {
    page.drawText(data.clientEmail.slice(0, 45), { x: col2X, y: infoBlockY - 24, size: 9, font });
  }

  const datesY = infoBlockY;
  page.drawText("Issued:", { x: col3X, y: datesY, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText((data.issued_at ?? "—").slice(0, 12), { x: col3X + 45, y: datesY, size: 9, font });
  page.drawText("Due:", { x: col3X, y: datesY - 14, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText((data.due_at ?? "—").slice(0, 12), { x: col3X + 45, y: datesY - 14, size: 9, font });
  if (data.projectName) {
    page.drawText("Project:", { x: col3X, y: datesY - 28, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(data.projectName.slice(0, 15), { x: col3X + 45, y: datesY - 28, size: 9, font });
  }

  // Move y below the info block (lowest point)
  const lowestInfo = Math.min(by, infoBlockY - 42);
  y = lowestInfo - sectionGap;

  // Table
  const colDesc = MARGIN;
  const colQty = PAGE_WIDTH - 280;
  const colRate = PAGE_WIDTH - 200;
  const colAmount = PAGE_WIDTH - 120;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 16;

  const isFixed = data.is_fixed_price === true;
  page.drawText("Description", { x: colDesc, y, size: 9, font: fontBold });
  if (!isFixed) {
    page.drawText("Qty", { x: colQty, y, size: 9, font: fontBold });
    page.drawText("Rate", { x: colRate, y, size: 9, font: fontBold });
  }
  page.drawText("Amount", { x: colAmount, y, size: 9, font: fontBold });
  y -= 16;

  for (const row of data.items) {
    const descLines = wrapText(row.description, 52);
    const desc = descLines[0].length > 52 ? descLines[0].slice(0, 49) + "..." : descLines[0];
    page.drawText(desc, { x: colDesc, y, size: 9, font });
    if (!isFixed) {
      page.drawText(String(row.quantity), { x: colQty, y, size: 9, font });
      page.drawText(`$${Number(row.unit_rate).toFixed(2)}`, { x: colRate, y, size: 9, font });
    }
    page.drawText(row.amount > 0 ? `$${Number(row.amount).toFixed(2)}` : "—", { x: colAmount, y, size: 9, font });
    y -= 18;
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 24;

  if (data.tax_rate != null && data.tax_rate > 0 && data.subtotal != null && data.tax_amount != null) {
    page.drawText("Subtotal", { x: colDesc, y, size: 10, font });
    page.drawText(`${data.currency} $${Number(data.subtotal).toFixed(2)}`, {
      x: colAmount - 40,
      y,
      size: 10,
      font,
    });
    y -= 16;
    page.drawText(`Tax (${data.tax_rate}%)`, { x: colDesc, y, size: 10, font });
    page.drawText(`${data.currency} $${Number(data.tax_amount).toFixed(2)}`, {
      x: colAmount - 40,
      y,
      size: 10,
      font,
    });
    y -= 20;
  }

  page.drawText("Total", { x: colDesc, y, size: 12, font: fontBold });
  page.drawText(`${data.currency} $${Number(data.total_amount).toFixed(2)}`, {
    x: colAmount - 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 36;

  if (data.terms_and_conditions?.trim()) {
    const lines = data.terms_and_conditions.split("\n").filter(Boolean);
    for (const line of lines) {
      if (y < 80) break;
      const truncated = wrapText(line, 100);
      for (const t of truncated.slice(0, 2)) {
        if (y < 80) break;
        page.drawText(t.slice(0, 95), { x: MARGIN, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        y -= 11;
      }
    }
  }
  if (data.footer?.trim()) {
    y -= 6;
    const footerLines = wrapText(data.footer, 100);
    for (const line of footerLines.slice(0, 2)) {
      if (y < 80) break;
      page.drawText(line.slice(0, 95), { x: MARGIN, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 11;
    }
  }
  if (y > 60) {
    page.drawText(`— ${businessName}`, { x: MARGIN, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

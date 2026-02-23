import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type InvoiceData = {
  id: string;
  total_amount: number;
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  clientName: string;
  clientEmail?: string;
  projectName?: string;
  footer?: string | null;
  terms_and_conditions?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit_rate: number;
    amount: number;
  }>;
};

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const { width } = page.getSize();
  let y = 800;

  const drawText = (text: string, x: number, size = 10, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };

  // Header
  drawText("Timvo", 50, 20, true);
  drawText("Invoice", 50, 12);
  y -= 10;

  drawText(`Invoice #${data.id.slice(0, 8)}`, width - 120, 11);
  y -= 8;

  // Bill To (left) and Dates (right)
  const rightX = width - 150;
  page.drawText("Bill To", { x: 50, y: 770, size: 9, font: fontBold });
  page.drawText(data.clientName, { x: 50, y: 758, size: 11, font });
  if (data.clientEmail) page.drawText(data.clientEmail, { x: 50, y: 744, size: 9, font });
  page.drawText("Issued:", { x: rightX, y: 770, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(data.issued_at ?? "—", { x: rightX + 50, y: 770, size: 9, font });
  page.drawText("Due:", { x: rightX, y: 756, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(data.due_at ?? "—", { x: rightX + 50, y: 756, size: 9, font });
  if (data.projectName) {
    page.drawText("Project:", { x: rightX, y: 742, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(data.projectName, { x: rightX + 50, y: 742, size: 9, font });
  }

  y = 700;

  // Table header
  const colDesc = 50;
  const colQty = width - 280;
  const colRate = width - 200;
  const colAmount = width - 120;

  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 14;

  page.drawText("Description", { x: colDesc, y, size: 9, font: fontBold });
  page.drawText("Qty", { x: colQty, y, size: 9, font: fontBold });
  page.drawText("Rate", { x: colRate, y, size: 9, font: fontBold });
  page.drawText("Amount", { x: colAmount, y, size: 9, font: fontBold });
  y -= 14;

  for (const row of data.items) {
    const desc = row.description.length > 45 ? row.description.slice(0, 42) + "..." : row.description;
    page.drawText(desc, { x: colDesc, y, size: 9, font });
    page.drawText(String(row.quantity), { x: colQty, y, size: 9, font });
    page.drawText(`$${Number(row.unit_rate).toFixed(2)}`, { x: colRate, y, size: 9, font });
    page.drawText(`$${Number(row.amount).toFixed(2)}`, { x: colAmount, y, size: 9, font });
    y -= 16;
  }

  y -= 16;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

  page.drawText("Total", { x: colDesc, y, size: 12, font: fontBold });
  page.drawText(`${data.currency} $${Number(data.total_amount).toFixed(2)}`, {
    x: colAmount - 30,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 30;

  if (data.terms_and_conditions?.trim()) {
    y -= 10;
    const lines = data.terms_and_conditions.split("\n").filter(Boolean);
    for (const line of lines) {
      if (y < 80) break;
      const truncated = line.length > 90 ? line.slice(0, 87) + "..." : line;
      page.drawText(truncated, { x: 50, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
      y -= 12;
    }
  }
  if (data.footer?.trim()) {
    y -= 8;
    const footerLine = data.footer.length > 90 ? data.footer.slice(0, 87) + "..." : data.footer;
    page.drawText(footerLine, { x: 50, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }
  page.drawText("— Timvo", { x: 50, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

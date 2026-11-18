/**
 * The doctor's prescription as an A4 PDF, laid out like the printed pad on the
 * Prescription screen: letterhead, patient line, notes, diagnosis, medicines (℞),
 * tests, advice, follow-up, the doctor's sign-off and the BloodLyn footer.
 *
 * It's drawn as real text (sharp at any zoom, small file) with jsPDF, which is
 * loaded only when the patient taps Download.
 */
import type { jsPDF as JsPDF } from "jspdf";
import { medicineLine, testTitle, type Prescription } from "@/lib/prescription";

export interface PrescriptionPdfInfo {
  doctorTitle: string;
  registration: string;
  issued: Date;
  /** "HS20261118-3788", shown in the footer. */
  reference: string;
  followUpOn: string;
  /** Turns a catalogue test name into the patient-friendly one shown on screen. */
  testName?: (name: string) => string;
}

const BLUE: [number, number, number] = [8, 65, 212];
const INK: [number, number, number] = [15, 23, 42];
const GREY: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [203, 213, 225];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const WIDTH = PAGE_W - MARGIN * 2;
const FOOTER_H = 14;

/**
 * The PDF's built-in fonts only cover Western characters, so swap the common
 * look-alikes (curly quotes, dashes, ₹) and drop anything they can't draw.
 */
export const pdfText = (value: string) =>
  value
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/₹/g, "Rs. ")
    .replace(/℞/g, "Rx")
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

/** "Prescription-Dr-Ar-Das-18-Nov-2026.pdf" */
export function prescriptionFileName(doctorTitle: string, issued: Date) {
  const who = pdfText(doctorTitle).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Doctor";
  const day = issued.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s+/g, "-");
  return `Prescription-${who}-${day}.pdf`;
}

/** The BloodLyn logo as a data URL, or null if it can't be loaded (the PDF is fine without it). */
async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/assets/images/logo-full.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildPrescriptionPdf(rx: Prescription, info: PrescriptionPdfInfo): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `Prescription from ${pdfText(info.doctorTitle)}`, author: pdfText(info.doctorTitle), creator: "BloodLyn" });
  const logo = await logoDataUrl();
  const testName = info.testName ?? ((n: string) => n);

  let y = 0;
  const set = (size: number, style: "normal" | "bold" | "italic" | "bolditalic" = "normal", color = INK, font = "helvetica") => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const lineHeight = (size: number) => size * 0.42;

  const footer = () => {
    doc.setFillColor(248, 250, 252);
    doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(0, PAGE_H - FOOTER_H, PAGE_W, PAGE_H - FOOTER_H);
    set(8.5, "bold", GREY);
    doc.text(`Digital prescription by BloodLyn :: ${pdfText(info.reference)}`, PAGE_W / 2, PAGE_H - FOOTER_H / 2 + 1.2, { align: "center" });
  };
  const topBar = () => {
    // The pad's coloured strip: BloodLyn blue into sky and green.
    const stripe = PAGE_W / 3;
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, stripe, 2.2, "F");
    doc.setFillColor(14, 165, 233);
    doc.rect(stripe, 0, stripe, 2.2, "F");
    doc.setFillColor(16, 185, 129);
    doc.rect(stripe * 2, 0, stripe + 1, 2.2, "F");
  };
  /** Start a new page when the next block won't fit above the footer. */
  const room = (needed: number) => {
    if (y + needed <= PAGE_H - FOOTER_H - 8) return;
    footer();
    doc.addPage();
    topBar();
    y = MARGIN;
  };
  const paragraph = (value: string, size: number, style: "normal" | "bold" | "italic" = "normal", color = INK, indent = 0) => {
    set(size, style, color);
    const lines = doc.splitTextToSize(pdfText(value), WIDTH - indent) as string[];
    for (const line of lines) {
      room(lineHeight(size) + 1);
      y += lineHeight(size);
      doc.text(line, MARGIN + indent, y);
      y += 1.4;
    }
  };
  const heading = (title: string) => {
    room(14);
    y += 5;
    set(8.5, "bold", GREY);
    doc.setCharSpace(0.6);
    doc.text(pdfText(title).toUpperCase(), MARGIN, y);
    doc.setCharSpace(0);
    y += 1.5;
  };

  // ── Letterhead ─────────────────────────────────────────────────────────────
  topBar();
  y = MARGIN + 4;
  const logoW = 30;
  const logoH = (logoW * 192) / 441;
  if (logo) {
    try {
      const logoX = PAGE_W - MARGIN - logoW;
      doc.addImage(logo, "PNG", logoX, y - 6, logoW, logoH);
      // The logo file has a faint rule along its left edge; paper over it.
      doc.setFillColor(255, 255, 255);
      doc.rect(logoX - 0.5, y - 6.5, 1.3, logoH + 1, "F");
    } catch (e) {
      // A logo that won't decode never stops the prescription from downloading.
      console.warn("Prescription PDF: logo skipped", e);
    }
  }
  // Letter-spaced, so right-align by hand (jsPDF's align ignores the spacing).
  set(7.5, "bold", GREY);
  const tag = "ONLINE CONSULTATION";
  const spacing = 0.5;
  doc.setCharSpace(spacing);
  doc.text(tag, PAGE_W - MARGIN - doc.getTextWidth(tag) - spacing * (tag.length - 1), y - 6 + logoH + 4);
  doc.setCharSpace(0);

  set(22, "bold", BLUE, "times");
  doc.text(pdfText(info.doctorTitle), MARGIN, y + 2);
  y += 7;
  const headerWidth = WIDTH - logoW - 6;
  for (const [value, size, style, color] of [
    [rx.doctor_qualification, 11, "bold", INK],
    [rx.doctor_specialty, 10, "normal", GREY],
    [info.registration, 8.5, "normal", GREY],
  ] as const) {
    if (!value) continue;
    set(size, style, color);
    for (const line of doc.splitTextToSize(pdfText(value), headerWidth) as string[]) {
      y += lineHeight(size) + 0.6;
      doc.text(line, MARGIN, y);
    }
  }
  y = Math.max(y, MARGIN + 4 + logoH + 6) + 4;
  // Double rule under the letterhead.
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.line(MARGIN, y + 1, PAGE_W - MARGIN, y + 1);
  y += 7;

  // ── Patient line ───────────────────────────────────────────────────────────
  const labelled = (label: string, value: string, x: number, align: "left" | "right" = "left") => {
    set(10, "normal", GREY);
    const labelW = doc.getTextWidth(`${label} `);
    set(10, "bold", INK);
    const valueW = doc.getTextWidth(value);
    const start = align === "right" ? x - labelW - valueW : x;
    set(10, "normal", GREY);
    doc.text(`${label} `, start, y);
    set(10, "bold", INK);
    doc.text(value, start + labelW, y);
  };
  labelled("Patient:", pdfText(rx.patient_name) || "-", MARGIN);
  y += 6;
  const ageSex = [rx.patient_age && `${rx.patient_age} yrs`, rx.patient_gender].filter(Boolean).join(" / ");
  labelled("Age / Sex:", pdfText(ageSex) || "-", MARGIN);
  labelled("Date:", info.issued.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), PAGE_W - MARGIN, "right");
  y += 4;
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineDashPattern([], 0);
  y += 2;

  // ── The prescription ───────────────────────────────────────────────────────
  if (rx.notes) {
    heading("Clinical notes");
    paragraph(rx.notes, 10.5);
  }
  if (rx.diagnosis) {
    heading("Diagnosis");
    paragraph(rx.diagnosis, 12, "bold");
  }
  if (rx.medicines.length > 0) {
    room(16);
    y += 9;
    set(20, "bold", BLUE, "times");
    doc.text("Rx", MARGIN, y);
    y += 1;
    rx.medicines.forEach((m, i) => {
      room(12);
      y += 4.5;
      set(11, "bold", GREY);
      doc.text(`${i + 1}.`, MARGIN, y);
      set(11, "bold", INK);
      const nameLines = doc.splitTextToSize(pdfText(m.name).toUpperCase(), WIDTH - 8) as string[];
      nameLines.forEach((line, j) => doc.text(line, MARGIN + 7, y + j * lineHeight(11)));
      y += (nameLines.length - 1) * lineHeight(11);
      const line = medicineLine(m);
      if (line) paragraph(line, 10, "normal", INK, 7);
      if (m.instructions) paragraph(m.instructions, 9.5, "italic", GREY, 7);
      if (i < rx.medicines.length - 1) {
        y += 1.5;
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(MARGIN + 7, y, PAGE_W - MARGIN, y);
      }
    });
  }
  if (rx.tests.length > 0) {
    heading(`Investigations advised (${rx.tests.length})`);
    rx.tests.forEach((t) => {
      room(7);
      y += 1;
      doc.setFillColor(...BLUE);
      doc.circle(MARGIN + 1.2, y + 2.4, 0.8, "F");
      const before = y;
      paragraph(testName(testTitle(t)), 10.5, "normal", INK, 5);
      if (y === before) y += 5;
    });
  }
  if (rx.advice) {
    heading("Advice");
    paragraph(rx.advice, 10.5);
  }
  if (rx.follow_up || info.followUpOn) {
    heading("Follow-up");
    paragraph([rx.follow_up, info.followUpOn && `on ${info.followUpOn}`].filter(Boolean).join(" - "), 11, "bold");
  }

  // ── Sign-off ───────────────────────────────────────────────────────────────
  room(26);
  y += 14;
  const signW = 70;
  const signX = PAGE_W - MARGIN - signW;
  set(14, "bolditalic", BLUE, "times");
  doc.text(pdfText(info.doctorTitle), PAGE_W - MARGIN, y, { align: "right" });
  y += 2.5;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(signX, y, PAGE_W - MARGIN, y);
  y += 4;
  set(8, "normal", GREY);
  doc.text("Issued digitally on BloodLyn", PAGE_W - MARGIN, y, { align: "right" });

  footer();
  // Page numbers once the total is known.
  const pages = doc.getNumberOfPages();
  if (pages > 1) {
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      set(8, "normal", GREY);
      doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, PAGE_H - FOOTER_H / 2 + 1.2, { align: "right" });
    }
  }
  return doc.output("blob");
}

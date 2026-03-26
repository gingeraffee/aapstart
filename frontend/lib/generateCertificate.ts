import { jsPDF } from "jspdf";

export function generateCertificate(name: string, completedCount: number) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");

  // Top accent bar
  doc.setFillColor(15, 127, 179);
  doc.rect(0, 0, w * 0.52, 6, "F");
  doc.setFillColor(223, 0, 48);
  doc.rect(w * 0.52, 0, w * 0.48, 6, "F");

  // Border frame
  doc.setDrawColor(194, 218, 241);
  doc.setLineWidth(1.5);
  doc.roundedRect(24, 24, w - 48, h - 48, 8, 8, "S");

  // Inner decorative border
  doc.setDrawColor(224, 236, 248);
  doc.setLineWidth(0.5);
  doc.roundedRect(36, 36, w - 72, h - 72, 6, 6, "S");

  // "AAP START" eyebrow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 127, 179);
  doc.text("AAP START", w / 2, 90, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(15, 29, 60);
  doc.text("Certificate of Completion", w / 2, 140, { align: "center" });

  // Decorative line under title
  doc.setDrawColor(15, 127, 179);
  doc.setLineWidth(1.5);
  doc.line(w / 2 - 100, 158, w / 2 + 100, 158);

  // "This certifies that"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(68, 91, 120);
  doc.text("This certifies that", w / 2, 195, { align: "center" });

  // Employee name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(15, 29, 60);
  doc.text(name, w / 2, 235, { align: "center" });

  // Name underline
  doc.setDrawColor(205, 224, 243);
  doc.setLineWidth(0.75);
  const nameWidth = doc.getTextWidth(name);
  doc.line(w / 2 - nameWidth / 2 - 20, 245, w / 2 + nameWidth / 2 + 20, 245);

  // Body text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(68, 91, 120);
  doc.text(
    "has successfully completed all required onboarding modules",
    w / 2,
    280,
    { align: "center" }
  );
  doc.text(
    "in the AAP Start Onboarding Program.",
    w / 2,
    298,
    { align: "center" }
  );

  // Stats
  const statsY = 340;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 109, 163);
  doc.text(String(completedCount), w / 2 - 80, statsY, { align: "center" });
  doc.text("100%", w / 2 + 80, statsY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(93, 115, 145);
  doc.text("MODULES COMPLETE", w / 2 - 80, statsY + 16, { align: "center" });
  doc.text("PROGRESS", w / 2 + 80, statsY + 16, { align: "center" });

  // Date
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(96, 120, 150);
  doc.text(`Completed on ${dateStr}`, w / 2, 400, { align: "center" });

  // Bottom accent
  doc.setFillColor(15, 127, 179);
  doc.rect(0, h - 6, w * 0.52, 6, "F");
  doc.setFillColor(223, 0, 48);
  doc.rect(w * 0.52, h - 6, w * 0.48, 6, "F");

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 165, 185);
  doc.text("American Associated Pharmacies", w / 2, h - 46, { align: "center" });

  doc.save(`AAP Start Certificate - ${name}.pdf`);
}

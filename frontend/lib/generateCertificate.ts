import { jsPDF } from "jspdf";
import { CERTIFICATE_LOGO } from "./certificateLogo";
import { INTER_REGULAR } from "./certificateFontRegular";
import { INTER_BOLD } from "./certificateFontBold";
import { INTER_BOLD_ITALIC } from "./certificateFontBoldItalic";

function registerInterFont(doc: jsPDF) {
  doc.addFileToVFS("Inter-Regular.ttf", INTER_REGULAR);
  doc.addFont("Inter-Regular.ttf", "Inter", "normal");

  doc.addFileToVFS("Inter-Bold.ttf", INTER_BOLD);
  doc.addFont("Inter-Bold.ttf", "Inter", "bold");

  doc.addFileToVFS("Inter-BoldItalic.ttf", INTER_BOLD_ITALIC);
  doc.addFont("Inter-BoldItalic.ttf", "Inter", "bolditalic");
}

export function generateCertificate(name: string, completedCount: number) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Register Inter font
  registerInterFont(doc);

  // --- Colors ---
  const navy = [15, 29, 60] as const;
  const gold = [201, 168, 76] as const;
  const goldLight = [228, 210, 154] as const;
  const slate = [68, 91, 120] as const;
  const cream = [252, 250, 245] as const;

  // --- Background ---
  doc.setFillColor(...cream);
  doc.rect(0, 0, w, h, "F");

  // --- Double border frame ---
  doc.setDrawColor(...gold);
  doc.setLineWidth(2.5);
  doc.roundedRect(20, 20, w - 40, h - 40, 4, 4, "S");
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.75);
  doc.roundedRect(30, 30, w - 60, h - 60, 3, 3, "S");

  // --- Corner ornaments ---
  const cs = 18;
  const p = 20;
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  // Top-left
  doc.line(p, p + cs, p, p);
  doc.line(p, p, p + cs, p);
  // Top-right
  doc.line(w - p - cs, p, w - p, p);
  doc.line(w - p, p, w - p, p + cs);
  // Bottom-left
  doc.line(p, h - p - cs, p, h - p);
  doc.line(p, h - p, p + cs, h - p);
  // Bottom-right
  doc.line(w - p - cs, h - p, w - p, h - p);
  doc.line(w - p, h - p - cs, w - p, h - p);

  // --- Logo ---
  const logoW = 180;
  const logoH = 59;
  doc.addImage(CERTIFICATE_LOGO, "PNG", w / 2 - logoW / 2, 52, logoW, logoH);

  // --- "AAP START" eyebrow ---
  doc.setFont("Inter", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text("AAP START", w / 2, 132, { align: "center" });

  // --- Title ---
  doc.setFont("Inter", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...navy);
  doc.text("Certificate of Completion", w / 2, 172, { align: "center" });

  // --- Gold ornamental divider with diamond ---
  doc.setDrawColor(...gold);
  doc.setLineWidth(1);
  const cx = w / 2;
  doc.line(cx - 140, 186, cx - 8, 186);
  doc.line(cx + 8, 186, cx + 140, 186);
  doc.setFillColor(...gold);
  doc.setLineWidth(0);
  doc.triangle(cx, 182, cx + 4, 186, cx, 190, "F");
  doc.triangle(cx, 182, cx - 4, 186, cx, 190, "F");

  // --- "This certifies that" ---
  doc.setFont("Inter", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...slate);
  doc.text("This certifies that", w / 2, 220, { align: "center" });

  // --- Employee name ---
  doc.setFont("Inter", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...navy);
  doc.text(name, w / 2, 260, { align: "center" });

  // --- Name underline ---
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.75);
  const nameW = doc.getTextWidth(name);
  doc.line(w / 2 - nameW / 2 - 30, 270, w / 2 + nameW / 2 + 30, 270);

  // --- Body text ---
  doc.setFont("Inter", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...slate);
  doc.text(
    "has successfully completed all required onboarding modules",
    w / 2, 300, { align: "center" }
  );
  doc.text(
    "in the AAP Start Onboarding Program.",
    w / 2, 316, { align: "center" }
  );

  // --- Stats ---
  const sy = 355;
  doc.setFont("Inter", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...navy);
  doc.text(String(completedCount), w / 2 - 80, sy, { align: "center" });
  doc.text("100%", w / 2 + 80, sy, { align: "center" });

  doc.setFont("Inter", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text("MODULES COMPLETE", w / 2 - 80, sy + 14, { align: "center" });
  doc.text("PROGRESS", w / 2 + 80, sy + 14, { align: "center" });

  // --- Small divider ---
  doc.setDrawColor(...goldLight);
  doc.setLineWidth(0.5);
  doc.line(w / 2 - 60, sy + 30, w / 2 + 60, sy + 30);

  // --- Date ---
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFont("Inter", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...slate);
  doc.text(`Completed on ${dateStr}`, w / 2, sy + 48, { align: "center" });

  // --- Encouraging message ---
  doc.setFont("Inter", "bolditalic");
  doc.setFontSize(14);
  doc.setTextColor(...navy);
  doc.text(
    "Welcome to the team \u2014 you\u2019re ready to make an impact!",
    w / 2, sy + 78, { align: "center" }
  );

  // --- Footer ---
  doc.setFont("Inter", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 155, 165);
  doc.text("American Associated Pharmacies", w / 2, h - 42, { align: "center" });

  doc.save(`AAP Start Certificate - ${name}.pdf`);
}

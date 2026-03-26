import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { jsPDF } = require("../frontend/node_modules/jspdf/dist/jspdf.node.min.js");
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
const w = doc.internal.pageSize.getWidth();
const h = doc.internal.pageSize.getHeight();
const margin = 48;
const contentW = w - margin * 2;

// ── Top accent bar ──
doc.setFillColor(15, 127, 179);
doc.rect(0, 0, w * 0.52, 5, "F");
doc.setFillColor(223, 0, 48);
doc.rect(w * 0.52, 0, w * 0.48, 5, "F");

// ── Header ──
let y = 40;
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(15, 127, 179);
doc.text("AAP START  •  QUICK REFERENCE", margin, y);

y += 24;
doc.setFont("helvetica", "bold");
doc.setFontSize(22);
doc.setTextColor(15, 29, 60);
doc.text("Attendance Point System", margin, y);

y += 16;
doc.setDrawColor(15, 127, 179);
doc.setLineWidth(1.5);
doc.line(margin, y, margin + 120, y);

y += 18;
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(68, 91, 120);
doc.text("This reference covers point values, corrective action thresholds, rolloff rules,", margin, y);
y += 14;
doc.text("and the perfect attendance bonus for hourly employees.", margin, y);

// ── Point Values Table ──
y += 32;
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.setTextColor(15, 29, 60);
doc.text("Point Values", margin, y);

y += 16;
const pointRows = [
  ["Tardy ≤ 5 minutes", "No point"],
  ["Tardy or leave early < half shift", "0.5 points"],
  ["Tardy or leave early > half shift", "1.0 point"],
  ["Absence", "1.0 point"],
  ["Absent with doctor's note (up to 3 consecutive days)", "1.0 point total"],
  ["No call / no show or no notice within 15 min of shift", "1.5 points"],
  ["Two consecutive no call / no shows", "Presumed resignation"],
];

// Table header
doc.setFillColor(240, 246, 252);
doc.rect(margin, y, contentW, 20, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(8.5);
doc.setTextColor(15, 29, 60);
doc.text("SITUATION", margin + 8, y + 13);
doc.text("POINTS", margin + contentW - 90, y + 13);
y += 20;

// Table rows
doc.setFont("helvetica", "normal");
doc.setFontSize(9.5);
pointRows.forEach((row, i) => {
  const rowH = 22;
  if (i % 2 === 0) {
    doc.setFillColor(250, 252, 255);
    doc.rect(margin, y, contentW, rowH, "F");
  }
  doc.setTextColor(50, 65, 90);
  doc.text(row[0], margin + 8, y + 14);

  // Bold the points column
  const isResignation = row[1] === "Presumed resignation";
  if (isResignation) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(196, 0, 42);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 109, 163);
  }
  doc.text(row[1], margin + contentW - 90, y + 14);
  doc.setFont("helvetica", "normal");
  y += rowH;
});

// Table border
doc.setDrawColor(205, 224, 243);
doc.setLineWidth(0.5);
doc.rect(margin, y - (pointRows.length * 22 + 20), contentW, pointRows.length * 22 + 20, "S");

// ── New Employee Note ──
y += 20;
doc.setFillColor(255, 245, 235);
doc.roundedRect(margin, y, contentW, 36, 4, 4, "F");
doc.setDrawColor(223, 150, 80);
doc.setLineWidth(0.5);
doc.roundedRect(margin, y, contentW, 36, 4, 4, "S");
doc.setFont("helvetica", "bold");
doc.setFontSize(9);
doc.setTextColor(180, 90, 20);
doc.text("NEW EMPLOYEES:", margin + 10, y + 15);
doc.setFont("helvetica", "normal");
doc.setTextColor(120, 70, 20);
doc.text("May not exceed 2.0 points during the first 60 days of employment.", margin + 115, y + 15);
doc.text("Exceeding this threshold may result in corrective action or separation.", margin + 10, y + 28);

// ── Corrective Action Thresholds ──
y += 56;
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.setTextColor(15, 29, 60);
doc.text("Corrective Action Thresholds", margin, y);

y += 16;
const thresholdRows = [
  ["5.0 points", "Coaching"],
  ["6.0 points", "Verbal Warning"],
  ["7.0 points", "Written Warning"],
  ["8.0 points", "Termination"],
];

// Table header
doc.setFillColor(240, 246, 252);
doc.rect(margin, y, contentW, 20, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(8.5);
doc.setTextColor(15, 29, 60);
doc.text("POINTS", margin + 8, y + 13);
doc.text("ACTION", margin + 140, y + 13);
y += 20;

doc.setFontSize(9.5);
thresholdRows.forEach((row, i) => {
  const rowH = 22;
  if (i % 2 === 0) {
    doc.setFillColor(250, 252, 255);
    doc.rect(margin, y, contentW, rowH, "F");
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 109, 163);
  doc.text(row[0], margin + 8, y + 14);

  const isTermination = row[1] === "Termination";
  if (isTermination) {
    doc.setTextColor(196, 0, 42);
  } else {
    doc.setTextColor(50, 65, 90);
  }
  doc.setFont("helvetica", "normal");
  doc.text(row[1], margin + 140, y + 14);
  y += rowH;
});

doc.setDrawColor(205, 224, 243);
doc.setLineWidth(0.5);
doc.rect(margin, y - (thresholdRows.length * 22 + 20), contentW, thresholdRows.length * 22 + 20, "S");

y += 8;
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(96, 120, 150);
doc.text("Points are tracked within a rolling 12-month period. Supervisor discretion applies at each stage.", margin, y);

// ── Point Rolloff ──
y += 32;
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.setTextColor(15, 29, 60);
doc.text("How Points Come Off", margin, y);

y += 18;
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(50, 65, 90);

// Bullet 1
doc.setFillColor(15, 127, 179);
doc.circle(margin + 4, y - 3, 2.5, "F");
doc.text("Two consecutive months with no tardy or unexcused absence = 1.0 point drops off.", margin + 14, y);

y += 18;
// Bullet 2
doc.setFillColor(15, 127, 179);
doc.circle(margin + 4, y - 3, 2.5, "F");
doc.text("Points automatically roll off one year later, on the first of that month.", margin + 14, y);

// ── Perfect Attendance Bonus ──
y += 32;
doc.setFillColor(235, 248, 255);
doc.roundedRect(margin, y, contentW, 52, 6, 6, "F");
doc.setDrawColor(15, 127, 179);
doc.setLineWidth(0.75);
doc.roundedRect(margin, y, contentW, 52, 6, 6, "S");

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(15, 109, 163);
doc.text("Perfect Attendance Bonus", margin + 12, y + 18);

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(50, 65, 90);
doc.text("Three consecutive months with no tardies or unexcused absences = $75 bonus", margin + 12, y + 34);
doc.text("on your first paycheck of the following month.", margin + 12, y + 46);

// ── Reporting ──
y += 72;
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.setTextColor(15, 29, 60);
doc.text("Reporting an Absence", margin, y);

y += 18;
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(50, 65, 90);
doc.text("Report within 15 minutes of your scheduled shift start. Log it in BambooHR or contact", margin, y);
y += 14;
doc.text("your supervisor or HR directly. The sooner you communicate, the easier it is for everyone.", margin, y);

// ── Bottom accent bar ──
doc.setFillColor(15, 127, 179);
doc.rect(0, h - 5, w * 0.52, 5, "F");
doc.setFillColor(223, 0, 48);
doc.rect(w * 0.52, h - 5, w * 0.48, 5, "F");

// ── Footer ──
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(150, 165, 185);
doc.text("American Associated Pharmacies  •  AAP Start", w / 2, h - 20, { align: "center" });

// Save
const outPath = resolve(__dirname, "..", "backend", "static", "downloads", "Attendance_Point_System_Quick_Reference.pdf");
const arrayBuffer = doc.output("arraybuffer");
writeFileSync(outPath, Buffer.from(arrayBuffer));
console.log(`Saved to ${outPath}`);

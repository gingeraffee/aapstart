import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, Header, Footer, PageNumber, LevelFormat
} from "docx";
import fs from "fs";

const BLUE = "1B3A5C";
const LIGHT_BLUE = "D5E8F4";
const MID_BLUE = "2E6DA4";
const GRAY = "F5F5F5";
const DARK_GRAY = "4A4A4A";
const WHITE = "FFFFFF";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MID_BLUE, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: BLUE })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: MID_BLUE })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK_GRAY, ...opts })],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: DARK_GRAY, bold })],
  });
}

function spacer(lines = 1) {
  return Array.from({ length: lines }, () =>
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun("")] })
  );
}

function labelValueRow(label, value, shade = false) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2800, type: WidthType.DXA },
        borders: cellBorders,
        shading: shade ? { fill: LIGHT_BLUE, type: ShadingType.CLEAR } : { fill: GRAY, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 20, bold: true, color: BLUE })] })],
      }),
      new TableCell({
        width: { size: 6560, type: WidthType.DXA },
        borders: cellBorders,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: value, font: "Arial", size: 20, color: DARK_GRAY })] })],
      }),
    ],
  });
}

function infoTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: rows.map(([label, value], i) => labelValueRow(label, value, i % 2 === 0)),
  });
}

function sectionHeaderRow(text) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        width: { size: 9360, type: WidthType.DXA },
        borders: cellBorders,
        shading: { fill: BLUE, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: WHITE })] })],
      }),
    ],
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 260 } } },
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: MID_BLUE },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: MID_BLUE, space: 4 } },
              children: [
                new TextRun({ text: "AAP Start — IT Governance & Compliance Documentation", font: "Arial", size: 18, color: BLUE }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 } },
              children: [
                new TextRun({ text: "AAP Start  |  Prepared for IT Review  |  Page ", font: "Arial", size: 18, color: DARK_GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: DARK_GRAY }),
                new TextRun({ text: " of ", font: "Arial", size: 18, color: DARK_GRAY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: DARK_GRAY }),
              ],
            }),
          ],
        }),
      },
      children: [
        // ── COVER BLOCK ──────────────────────────────────────────────────────────
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 120 },
          children: [new TextRun({ text: "AAP Start", font: "Arial", size: 56, bold: true, color: BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: "IT Governance & Compliance Documentation", font: "Arial", size: 30, color: MID_BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: "Business-Developed Application Review", font: "Arial", size: 22, color: DARK_GRAY, italics: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 480 },
          children: [new TextRun({ text: "Prepared April 2025  |  Human Resources Department", font: "Arial", size: 20, color: DARK_GRAY })],
        }),

        // ── PURPOSE ──────────────────────────────────────────────────────────────
        heading1("Purpose"),
        body(
          "This document responds to IT's request for governance documentation for AAP Start, the company's HR onboarding portal. " +
          "It addresses ownership, architecture, access controls, data handling, security, monitoring, and lifecycle planning. " +
          "It is intended to support formal approval of the platform and serve as a reference for ongoing compliance."
        ),
        ...spacer(1),

        // ── 1. OWNERSHIP ─────────────────────────────────────────────────────────
        heading1("1. Ownership & Accountability"),
        infoTable([
          ["Business Owner", "HR Department — [HR Leadership Name / Title to be confirmed]"],
          ["Technical Owner", "Nicole Thornton, HR — primary developer and administrator"],
          ["Backup Ownership", "To be designated; recommend a second HR administrator be trained on the admin panel and Render account access"],
          ["Change Approvals", "Business Owner approves content changes; Technical Owner approves and deploys code changes"],
          ["Outage Response", "Technical Owner is the first point of contact; escalation path to IT to be defined during this review"],
          ["Security Issues", "Technical Owner triages and remediates; IT Security notified for any confirmed breach or data exposure"],
        ]),
        ...spacer(1),

        // ── 2. HOSTING & ARCHITECTURE ────────────────────────────────────────────
        heading1("2. Hosting & Architecture"),
        heading2("Platform Overview"),
        infoTable([
          ["Frontend", "Next.js 15 (React/TypeScript) — hosted on Render"],
          ["Backend", "FastAPI (Python) — hosted on Render"],
          ["Database", "SQLite — stored on the Render service instance"],
          ["Domain", "aapstart.com (custom domain configured on Render)"],
          ["Deployment", "GitHub-connected; code changes deploy from the main branch"],
        ]),
        ...spacer(1),
        heading2("Account Ownership & Platform Flexibility"),
        body(
          "The Render hosting account and domain registration are currently held under an individual account. " +
          "We are fully open to any of the following changes at IT's direction:"
        ),
        bullet("Transferring the existing Render account ownership to a corporate account"),
        bullet("Migrating to a different hosting platform if IT has a preferred or pre-approved vendor"),
        bullet("Moving the codebase to a corporate GitHub organization, replacing the current personal repository"),
        body(
          "We will coordinate whichever transition IT recommends and can work to a timeline that avoids disruption to active onboarding."
        ),
        ...spacer(1),
        heading2("IT Visibility & Access"),
        body("In the meantime, we can accommodate the following to provide IT oversight:"),
        bullet("Add an IT representative as a member on the Render account"),
        bullet("Grant read (or full) access to the GitHub repository"),
        bullet("Share admin credentials for the application's admin panel upon request"),
        ...spacer(1),

        // ── 3. ACCESS CONTROL ────────────────────────────────────────────────────
        heading1("3. Access Control"),
        heading2("Who Can Access the Site"),
        body(
          "Access is restricted to current AAP employees. Users must provide a valid employee ID, first name, last name, " +
          "and their employee ID must match the record created for them in the admin dashboard. There is no self-registration — all accounts are created " +
          "manually by an HR administrator through the admin panel."
        ),
        ...spacer(1),
        heading2("Authentication"),
        infoTable([
          ["Method", "Employee ID + first and last name, which must match the record created by HR in the admin dashboard; JWT session tokens (8-hour expiry, stored in httpOnly cookies)"],
          ["Multi-Factor Auth", "TOTP-based MFA via authenticator app (e.g. Google Authenticator); currently required for all users"],
          ["SSO Future State", "We support SSO as a future enhancement; transitioning to company credentials (Azure AD / Okta) would eliminate local accounts entirely and is recommended as the platform scales"],
          ["Privileged Access", "Admin accounts are manually flagged in the database; admin panel is the only elevated-access interface"],
        ]),
        ...spacer(1),
        heading2("Access Reviews"),
        body(
          "User accounts are manually created and deactivated by HR. As part of this governance framework, we commit to " +
          "conducting quarterly access reviews to remove accounts for employees who have left or changed roles. " +
          "A review schedule will be added to the HR admin calendar."
        ),
        ...spacer(1),

        // ── 4. DATA HANDLING ─────────────────────────────────────────────────────
        heading1("4. Data Handling & Privacy"),
        heading2("Data Stored"),
        body("The following employee data is stored in the application database:"),
        bullet("Full name and employee ID"),
        bullet("Job track assignment (e.g., HR, Warehouse, Management)"),
        bullet("Admin status flag"),
        bullet("Login timestamps (first login, last login)"),
        bullet("Module completion progress, quiz scores, and acknowledgement timestamps"),
        bullet("Optional notes or questions submitted during training"),
        ...spacer(1),
        heading2("What Is NOT Stored"),
        body("The following categories of sensitive or regulated data are not stored and will not be stored on this platform:"),
        bullet("Social Security numbers or government-issued IDs"),
        bullet("Compensation, payroll, or performance data"),
        bullet("Disciplinary records"),
        bullet("Benefits enrollment or health information"),
        bullet("Email addresses or personal contact information"),
        ...spacer(1),
        heading2("Content & Intellectual Property"),
        body(
          "Downloadable content consists of internal HR documents: employee handbook, policy guides, SOPs, training checklists, and how-to guides. " +
          "All content is authored internally by AAP HR and does not include third-party copyrighted materials. " +
          "No regulated data (HIPAA, PII beyond name/ID) is uploaded or distributed through the platform."
        ),
        ...spacer(1),
        heading2("Data Retention & Deletion"),
        body(
          "Employee records and progress data are retained for the duration of employment. " +
          "Upon termination or decommissioning, records can be exported and deleted from the database via the admin panel. " +
          "Render does not retain data independently — all data resides in the application's SQLite database file."
        ),
        ...spacer(1),
        heading2("Storage Location"),
        body(
          "Application code and all training content (PDFs, documents, videos) are stored in GitHub, which serves as the authoritative source. " +
          "Employee progress data resides in the SQLite database on Render's infrastructure. " +
          "Render is not treated as a system of record for content."
        ),
        ...spacer(1),

        // ── 5. SECURITY & MAINTENANCE ────────────────────────────────────────────
        heading1("5. Security & Maintenance"),
        heading2("Patch & Update Responsibilities"),
        infoTable([
          ["Responsible Party", "Technical Owner (Nicole Thornton)"],
          ["Frontend Dependencies", "Reviewed and updated quarterly via npm; package.json tracks all dependencies"],
          ["Backend Dependencies", "Reviewed and updated quarterly via pip; requirements.txt tracks all packages"],
          ["OS / Infrastructure Patching", "Managed by Render (shared responsibility model — vendor patches the underlying infrastructure)"],
          ["Frequency", "Quarterly dependency review; critical security patches applied within 30 days of disclosure"],
        ]),
        ...spacer(1),
        heading2("Vulnerability Awareness & Remediation"),
        bullet("GitHub Dependabot alerts are enabled on the repository and notify the Technical Owner of known vulnerabilities"),
        bullet("Critical vulnerabilities will be triaged within 5 business days and remediated within 30 days or escalated to IT"),
        bullet("No known vulnerabilities are currently outstanding"),
        ...spacer(1),

        // ── 6. MONITORING, BACKUP & RECOVERY ────────────────────────────────────
        heading1("6. Monitoring, Backup & Recovery"),
        heading2("Current State"),
        body(
          "Render provides basic uptime monitoring and automatic restarts for failed services. " +
          "Application-level logging is currently limited to startup diagnostics. " +
          "There is no third-party APM or alerting tool in place at this time."
        ),
        ...spacer(1),
        heading2("Planned Improvements"),
        bullet("Add structured application logging to capture errors and admin actions"),
        bullet("Configure Render health check alerts to notify the Technical Owner of outages via email"),
        bullet("Evaluate lightweight monitoring (e.g., UptimeRobot or Render's built-in alerts) for uptime visibility"),
        ...spacer(1),
        heading2("Backup Strategy"),
        infoTable([
          ["Code & Content", "All application code and training materials (PDFs, documents, videos) are stored in GitHub and can be redeployed from there at any time. GitHub is the authoritative source for all content."],
          ["Database Backup", "No automated database backup process is currently in place. Employee progress data (completion records, quiz scores, notes) lives only on the Render instance. Establishing a backup process for this data is an identified gap — see Planned Improvements below."],
          ["Restoration Testing", "A formal restoration test has not yet been conducted. This will be scheduled once a database backup process is established."],
        ]),
        ...spacer(1),
        heading2("Planned Backup Improvements"),
        bullet("Implement a scheduled SQLite database export (e.g., weekly) stored in a designated location such as a corporate SharePoint or IT-managed storage"),
        bullet("Document and test restoration procedures once backup process is in place"),
        bullet("Evaluate whether Render's paid tiers or an alternative host offer automated database snapshot capabilities"),
        ...spacer(1),
        heading2("Recovery Time Objective"),
        body(
          "In the event of a Render outage or service failure, expected recovery options are:"
        ),
        bullet("Render service restart: typically under 5 minutes for automatic recovery"),
        bullet("Full redeploy from GitHub: typically under 15 minutes — all code and content is preserved in the repository"),
        bullet("Employee progress data: not recoverable without a database backup; this is an acknowledged gap being addressed"),
        body(
          "Alternate onboarding method during an outage: HR can distribute core materials directly from GitHub or via email while the platform is unavailable."
        ),
        ...spacer(1),
        heading2("Incident Escalation"),
        body("Outage or security incident escalation path:"),
        bullet("Level 1 — Technical Owner (Nicole Thornton) responds and triages"),
        bullet("Level 2 — HR Business Owner notified if outage exceeds 1 hour or impacts active onboarding"),
        bullet("Level 3 — IT escalation for confirmed security incidents or data exposure"),
        ...spacer(1),

        // ── 7. LIFECYCLE MANAGEMENT ──────────────────────────────────────────────
        heading1("7. Lifecycle Management"),
        infoTable([
          ["Expected Lifespan", "Minimum 2 years in current form; long-term intent is for this to serve as the foundation for a company intranet"],
          ["Future Enhancements", "SSO integration, expanded content tracks, manager dashboard, potential migration to a company-managed hosting environment if the platform scales to an intranet"],
          ["Migration Path", "If transitioned to a full intranet, content and user data can be exported from the current platform; migration plan will be documented at that time"],
          ["Decommission Plan", "If decommissioned, employee progress data will be exported to CSV, user accounts deleted, and Render services terminated. All code and content remains preserved in GitHub."],
        ]),
        ...spacer(1),

        // ── 8. RENDER TOS COMPLIANCE ─────────────────────────────────────────────
        heading1("8. Render Terms of Service — Compliance Confirmation"),
        body("In alignment with IT's Render TOS review findings, we confirm the following:"),
        ...spacer(1),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [5400, 1980, 1980],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 5400, type: WidthType.DXA },
                  borders: cellBorders,
                  shading: { fill: BLUE, type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Safeguard", font: "Arial", size: 20, bold: true, color: WHITE })] })],
                }),
                new TableCell({
                  width: { size: 1980, type: WidthType.DXA },
                  borders: cellBorders,
                  shading: { fill: BLUE, type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Current Status", font: "Arial", size: 20, bold: true, color: WHITE })] })],
                }),
                new TableCell({
                  width: { size: 1980, type: WidthType.DXA },
                  borders: cellBorders,
                  shading: { fill: BLUE, type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Notes", font: "Arial", size: 20, bold: true, color: WHITE })] })],
                }),
              ],
            }),
            ...([
              ["Site restricted to authorized internal users only", "In Place", "Account creation is manual by HR admin; login requires employee ID + name match"],
              ["Quarterly user access reviews", "Committed", "Will be added to HR admin calendar as part of this approval"],
              ["MFA enabled", "In Place", "TOTP via authenticator app is required for all users"],
              ["Only approved HR onboarding materials published", "In Place", "Content reviewed by HR before upload"],
              ["No confidential, regulated, or sensitive employee data uploaded", "In Place", "Confirmed — see Section 4"],
              ["Content reviewed for copyright ownership", "In Place", "All materials are internally authored by AAP HR"],
              ["Authoritative content source maintained outside the platform", "In Place", "All code and content stored in GitHub; fully recoverable independent of Render"],
              ["Alternate onboarding method exists if platform unavailable", "Committed", "Materials can be distributed directly from GitHub or via email during an outage"],
            ].map(([safeguard, status, notes], i) =>
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 5400, type: WidthType.DXA },
                    borders: cellBorders,
                    shading: { fill: i % 2 === 0 ? WHITE : GRAY, type: ShadingType.CLEAR },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: safeguard, font: "Arial", size: 20, color: DARK_GRAY })] })],
                  }),
                  new TableCell({
                    width: { size: 1980, type: WidthType.DXA },
                    borders: cellBorders,
                    shading: {
                      fill: status === "In Place" ? "D4EDDA" : status === "Committed" ? "FFF3CD" : "CCE5FF",
                      type: ShadingType.CLEAR,
                    },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: status, font: "Arial", size: 20, bold: true, color: DARK_GRAY })] })],
                  }),
                  new TableCell({
                    width: { size: 1980, type: WidthType.DXA },
                    borders: cellBorders,
                    shading: { fill: i % 2 === 0 ? WHITE : GRAY, type: ShadingType.CLEAR },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: notes, font: "Arial", size: 18, color: DARK_GRAY, italics: true })] })],
                  }),
                ],
              })
            )),
          ],
        }),
        ...spacer(1),

        // ── 9. OPEN ITEMS ────────────────────────────────────────────────────────
        heading1("9. Open Items & Requested IT Guidance"),
        body("The following items require input or direction from IT to close out:"),
        bullet("Confirm preferred hosting platform (retain Render, migrate to another vendor, or IT-managed infrastructure) and transfer timeline"),
        bullet("Confirm whether codebase should move to a corporate GitHub organization and provide org details"),
        bullet("Confirm whether IT would like to be added to the Render account and/or GitHub repository in the interim"),
        bullet("Confirm whether SSO integration is a requirement for approval or a future-state recommendation"),
        bullet("Define the formal escalation contact on the IT side for outages and security incidents"),
        bullet("Agree on periodic review cadence (suggest annual review of this document)"),
        ...spacer(1),

        // ── SIGN OFF ─────────────────────────────────────────────────────────────
        heading1("Document Information"),
        infoTable([
          ["Prepared by", "Nicole Thornton, Human Resources"],
          ["Date", "April 2025"],
          ["Version", "1.0 — Initial submission for IT review"],
          ["Next Review", "April 2026 (or upon material change to the platform)"],
        ]),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const outPath = new URL("../AAP_Start_IT_Governance_Documentation.docx", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
fs.writeFileSync(outPath, buffer);
  console.log("Done: AAP_Start_IT_Governance_Documentation.docx");
});

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# ── Colors ──────────────────────────────────────────────────────────────────
AAP_BLUE      = colors.HexColor('#2E75B6')
WARNING_BG    = colors.HexColor('#FFF8E1')
WARNING_BORDER= colors.HexColor('#F0A500')
TIP_BG        = colors.HexColor('#E8F5E9')
TIP_BORDER    = colors.HexColor('#4CAF50')
INFO_BG       = colors.HexColor('#E3F2FD')
INFO_BORDER   = colors.HexColor('#2196F3')

# ── Styles ───────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=15,
    textColor=AAP_BLUE,
    alignment=TA_CENTER,
    spaceBefore=10,
    spaceAfter=10,
)

intro_style = ParagraphStyle(
    'Intro',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=10,
    leading=15,
    spaceAfter=8,
)

heading_style = ParagraphStyle(
    'SectionHeading',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    textColor=AAP_BLUE,
    spaceBefore=14,
    spaceAfter=5,
)

body_style = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=10,
    leading=15,
    spaceAfter=6,
)

bullet_style = ParagraphStyle(
    'Bullet',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=10,
    leading=15,
    leftIndent=18,
    spaceAfter=4,
)

callout_style = ParagraphStyle(
    'Callout',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=10,
    leading=15,
)

callout_bold_style = ParagraphStyle(
    'CalloutBold',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=15,
    spaceAfter=3,
)

# ── Helpers ───────────────────────────────────────────────────────────────────
BULLET = u'\u25AA\u00A0\u00A0'   # ▪ + spaces

def b(text):
    return f'<b>{text}</b>'

def bullet(text):
    return Paragraph(BULLET + text, bullet_style)

def callout_box(label, text, bg, border):
    label_para  = Paragraph(b(label), callout_bold_style)
    body_para   = Paragraph(text, callout_style)
    inner_table = Table([[label_para], [body_para]], colWidths=[6.3*inch])
    inner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('BOX',        (0,0), (-1,-1), 1.5, border),
        ('LEFTPADDING',  (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING',   (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0), (-1,-1), 8),
        ('ROWPADDING',   (0,0), (-1,-1), 2),
    ]))
    return inner_table

# ── Document ──────────────────────────────────────────────────────────────────
OUTPUT = (
    r'C:\Users\Nicole\OneDrive\Documentos\GitHub\aapstart'
    r'\frontend\public\downloads'
    r'\AAP_Point_System_Overview.pdf'
)

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    rightMargin=0.85*inch,
    leftMargin=0.85*inch,
    topMargin=0.6*inch,
    bottomMargin=0.75*inch,
)

story = []

# ── Logo ──────────────────────────────────────────────────────────────────────
LOGO = (
    r'C:\Users\Nicole\OneDrive\Documentos\GitHub\aapstart'
    r'\frontend\public\logo.png'
)
logo = Image(LOGO, width=2.8*inch, height=0.85*inch, hAlign='CENTER')
story.append(logo)
story.append(Spacer(1, 0.18*inch))

# ── Title ─────────────────────────────────────────────────────────────────────
story.append(Paragraph('AAP Point System Overview – Supervisor Guide', title_style))

# ── Intro ─────────────────────────────────────────────────────────────────────
story.append(Paragraph(
    'This guide explains how AAP\'s attendance point system works for hourly employees — '
    'how points are earned, when they roll off, corrective action thresholds, and guidance '
    'for supervisors on managing attendance fairly and consistently.',
    intro_style
))

# ── 1. What Is the Point System? ─────────────────────────────────────────────
story.append(Paragraph('1. What Is the Point System?', heading_style))
story.append(Paragraph(
    'AAP uses a <b>no-fault attendance point system</b> to track attendance for all hourly '
    'employees. No-fault means employees are not required to provide a reason or documentation '
    'for an absence — a point is assessed regardless of the cause.',
    body_style
))
story.append(Paragraph(
    'Points are tracked on a <b>rolling 12-month basis</b>. No employee may exceed '
    '<b>8.0 points</b> within any 12-month period.',
    body_style
))
story.append(Paragraph(
    'All point values are determined by the employee\'s employment type:',
    body_style
))
story.append(bullet('<b>Full-time employees</b> are assessed based on an 8-hour shift.'))
story.append(bullet('<b>Part-time employees</b> are assessed based on a 4-hour shift.'))
story.append(Spacer(1, 4))

# ── 2. Point Values ───────────────────────────────────────────────────────────
story.append(Paragraph('2. Point Values', heading_style))
story.append(Paragraph(
    'Point values are based on the employee\'s employment type.',
    body_style
))

pv_items = [
    ('<b>Tardy — 5 minutes or less:</b> No point assessed. This applies to both clocking in '
     'at the start of the shift and clocking back in from lunch.'),
    '<b>Tardy — more than 5 minutes, less than half of shift:</b> 0.5 point',
    '<b>Miss more than half of shift:</b> 1.0 point',
    '<b>Miss full shift:</b> 1.0 point',
    ('<b>No Call No Show (NCNS):</b> 1.5 points — employee provides no notification whatsoever.'),
    ('<b>Late Notification:</b> 1.5 points — employee notifies their supervisor, but does so '
     'after 15 minutes into the scheduled shift start time.'),
]
for item in pv_items:
    story.append(bullet(item))
story.append(Spacer(1, 4))

# ── 3. Illness and Doctor's Note Exception ────────────────────────────────────
story.append(Paragraph('3. Illness and Doctor\'s Note Exception', heading_style))
story.append(Paragraph(
    'The standard point value for a missed shift is 1.0 point per occurrence. However, if an '
    'employee provides a doctor\'s note documenting the illness with specific dates, up to '
    '<b>3 consecutive calendar days</b> of illness will be assessed only <b>1.0 point total</b>.',
    body_style
))
story.append(bullet(
    'Weekend days count toward the 3 consecutive days, even if the employee is not scheduled on those days.'
))
story.append(bullet(
    'It is the <b>employee\'s responsibility</b> to provide the doctor\'s note. Points will be '
    'assessed at the standard rate if a note is not submitted.'
))
story.append(Spacer(1, 4))

# ── 4. COVID-19 Exception ─────────────────────────────────────────────────────
story.append(Paragraph('4. COVID-19 Exception', heading_style))
story.append(Paragraph(
    'Employees who test positive for COVID-19 may be absent per their doctor\'s recommendation '
    'without any points assessed, up to a maximum of <b>5 days</b>. Employees must provide '
    '<b>documentation of their positive test result</b> to qualify for this exception.',
    body_style
))

# ── 5. Absences That Do Not Earn Points ───────────────────────────────────────
story.append(Paragraph('5. Absences That Do Not Earn Points', heading_style))
story.append(Paragraph('The following absences are excluded from the point system entirely:', body_style))
no_point_items = [
    'Bereavement leave',
    'FMLA usage',
    'Long-term sick leave (full-time employees only)',
    'Jury duty',
    'Court-mandated appearances',
    'Time off to vote',
]
for item in no_point_items:
    story.append(bullet(item))
story.append(Spacer(1, 4))

# ── 6. Point Roll Offs ────────────────────────────────────────────────────────
story.append(Paragraph('6. Point Roll Offs', heading_style))
story.append(Paragraph(
    'Points do not remain on an employee\'s record permanently. There are two automatic roll off rules:',
    body_style
))
story.append(Paragraph(
    '<b>YTD Roll Off:</b> Points earned in a given calendar month will roll off on the 1st of '
    'that same month the following year. For example, any points earned in April 2025 — '
    'regardless of the specific date — will automatically be subtracted from the employee\'s '
    'total on April 1, 2026.',
    body_style
))
story.append(Paragraph(
    '<b>2-Month Roll Off:</b> An employee who goes two consecutive full calendar months without '
    'earning any points will automatically have 1.0 point subtracted from their total on the '
    'first day of the following month. For example, if an employee earns a point on April 15th '
    'and receives no points in May or June, 1.0 point is subtracted on July 1st.',
    body_style
))
story.append(Spacer(1, 6))
story.append(KeepTogether(callout_box(
    'Note',
    'An employee\'s point balance will never go below 0.0. If a roll off would reduce a '
    'balance below zero, it floors at 0.0.',
    INFO_BG, INFO_BORDER
)))
story.append(Spacer(1, 8))

# ── 7. Perfect Attendance Bonus ───────────────────────────────────────────────
story.append(Paragraph('7. Perfect Attendance Bonus', heading_style))
story.append(Paragraph(
    'Any employee who goes <b>three consecutive months</b> without earning any points will '
    'receive a <b>$75 bonus</b>, paid out on the first payroll of the following month. The bonus '
    'is earned every third month of perfect attendance — it is not tied to fixed calendar '
    'quarters, so any three-month stretch qualifies.',
    body_style
))
story.append(Paragraph(
    'For example, an employee with no points in January, February, and March earns the bonus on '
    'the first payroll in April. An employee with no points in February, March, and April earns '
    'the bonus on the first payroll in May.',
    body_style
))

# ── 8. Corrective Action Thresholds ───────────────────────────────────────────
story.append(Paragraph('8. Corrective Action Thresholds', heading_style))
story.append(Paragraph(
    'HR generates corrective action documents at the end of each month for any employee who has '
    'reached a threshold. The supervisor is responsible for delivering and discussing the document '
    'with the employee, obtaining the employee\'s signature, entering the conversation in the '
    'Corrective Action section of BambooHR, and returning the completed document to HR.',
    body_style
))
story.append(Paragraph('Point thresholds and corresponding actions:', body_style))
ca_items = [
    '<b>5.0 points:</b> Coaching — the supervisor has a documented conversation with the employee acknowledging the attendance concern.',
    '<b>6.0 points:</b> Verbal warning',
    '<b>7.0 points:</b> Written warning',
    '<b>8.0 points:</b> Termination',
]
for item in ca_items:
    story.append(bullet(item))
story.append(Spacer(1, 4))

# ── 9. Probationary Employees ─────────────────────────────────────────────────
story.append(Paragraph('9. Probationary Employees', heading_style))
story.append(Paragraph(
    'Employees within their <b>first 60 days of employment</b> are considered probationary. '
    'Probationary employees may not exceed <b>2.0 points</b> during this window. Exceeding this '
    'threshold may result in disciplinary action, including extended probation or termination.',
    body_style
))

# ── 10. Waiving a Point ───────────────────────────────────────────────────────
story.append(Paragraph('10. Waiving a Point', heading_style))
story.append(Paragraph(
    'Although the point system is no-fault, a supervisor may choose to waive a point for '
    'extenuating circumstances. Before agreeing to waive a point, the supervisor should consult '
    'with HR, who can provide context such as the employee\'s current balance, upcoming roll offs, '
    'and any conduct or performance concerns on file.',
    body_style
))
story.append(Spacer(1, 6))
story.append(KeepTogether(callout_box(
    'Important',
    'Waiving points is highly discouraged. The integrity of the point system depends on '
    'consistent, fair application across all employees. Supervisors are not obligated to waive '
    'a point under any circumstance.',
    WARNING_BG, WARNING_BORDER
)))
story.append(Spacer(1, 10))
story.append(Paragraph('Before waiving a point, consider:', body_style))
waive_items = [
    'Is the circumstance verifiable or is there documentation?',
    'Does the employee have a pattern of absences or tardiness?',
    'Does the employee show up ready to work with a positive attitude?',
    'Is the employee meeting performance standards?',
]
for item in waive_items:
    story.append(bullet(item))
story.append(Spacer(1, 8))
story.append(KeepTogether(callout_box(
    'Keep in Mind',
    "It\u2019s not about the reason for the 8th point that gets the employee terminated \u2014 "
    "it\u2019s about the 7 that came before.",
    TIP_BG, TIP_BORDER
)))

# ── Build ─────────────────────────────────────────────────────────────────────
doc.build(story)
print(f'PDF created: {OUTPUT}')

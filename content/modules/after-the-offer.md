---
slug: after-the-offer
title: After the Offer
description: New hire setup in BambooHR — from the hire click through document filing, onboarding tasks, and first-day readiness.
tracks: [hr]
order: 11
estimatedMinutes: 18
status: published
requiresQuiz: true
requiresAcknowledgement: true

acknowledgements:
  - id: ack-1
    statement: I know all 12 steps of the HRA-04 BambooHR onboarding workflow and can complete them without a reference guide.
  - id: ack-2
    statement: I know to enter the employee number as TBA[Hire Date] until a permanent number is assigned — never leave it blank.
  - id: ack-3
    statement: I know to check every new hire's state and manually add the correct tax form if they're outside Tennessee or Alabama.
  - id: ack-4
    statement: I know all four BambooHR document folder destinations and file every document in the correct one on the first try.
  - id: ack-5
    statement: I understand the 60-day introductory period, what happens at separation, and that involuntary terminations are handled by the HR Manager only.

quiz:
  questions:
    - id: q1
      text: You're setting up a new hire and get to the employee number field. The permanent number hasn't been assigned yet. What do you enter?
      options:
        - id: a
          text: Leave it blank and come back to fill it in once the number is assigned
        - id: b
          text: Enter TBA followed by the hire date — e.g., TBA01152026
        - id: c
          text: Use the candidate's BambooHR applicant ID as a temporary number
        - id: d
          text: Enter PENDING and flag it for the HR Manager to update
      correctId: b

    - id: q2
      text: You're onboarding a new employee who lives in Georgia. You've selected the correct template and added onboarding tasks. What's the step most people forget?
      options:
        - id: a
          text: Adding the Georgia state tax form manually and marking it Required
        - id: b
          text: Sending a welcome email before the new hire packet
        - id: c
          text: Checking if Georgia requires a different I-9 process
        - id: d
          text: Notifying Paylocity that the employee is in a different state
      correctId: a

    - id: q3
      text: A new hire's signed W-4 comes back. Where does it go in BambooHR?
      options:
        - id: a
          text: New Hire Forms folder — it was part of the new hire packet
        - id: b
          text: Payroll Related Documents — W-4s, ACH forms, and state tax forms go here
        - id: c
          text: I-9 Folder — all tax and identity documents are stored together
        - id: d
          text: The employee's main Documents tab — no specific subfolder required
      correctId: b

    - id: q4
      text: A new hire is in their third week and has already accumulated 2 attendance points. They call in sick again today. What should you know?
      options:
        - id: a
          text: They're at the limit — one more point during the introductory period could be grounds for separation
        - id: b
          text: The introductory period allows up to 3 points, so they still have room
        - id: c
          text: Points don't apply during the introductory period — they start at day 61
        - id: d
          text: Escalate to the HR Manager now — 2 points in 3 weeks is already a pattern worth reviewing
      correctId: a

    - id: q5
      text: An employee resigns and asks if their personal leave balance will be paid out. What do you tell them?
      options:
        - id: a
          text: Yes — all PTO balances are paid out at separation
        - id: b
          text: Only if they give at least 2 weeks' notice
        - id: c
          text: No — accrued vacation is paid out, but personal leave is forfeited
        - id: d
          text: Route it to the HR Manager — you can't discuss pay-related questions
      correctId: c
---

## Setting Up a New Hire in BambooHR (HRA-04)

This is the workflow that turns a candidate into an employee. It's 12 steps, they go in order, and skipping one creates a problem somewhere downstream — payroll, IT, compliance, or all three. Before you start clicking, make sure the groundwork is done.

**Before you start:** Confirm that all pre-hire screenings are received and reviewed — background check, drug screen, and reference checks. Confirm the start date, location, division, employment status, and department. And check the employee's state — you'll need to know this for tax forms.

### The 12 Steps

**1. Click Hire.** In Applicant Tracking, find the candidate and click **Hire** from the Offer Tracking section. This is the official transition from applicant to employee.

**2. Check the Position Requisition Form before touching "close job posting."** This is a small box that's easy to miss. Before you decide, pull up the Position Requisition Form — it tells you how many roles were approved and whether they're all filled. If all roles are filled, close the posting. If not, uncheck it. Don't assume based on a single hire.

**3. Click Add New Employee.** Select the checkbox to send a new hire packet. This triggers the onboarding paperwork that the employee will complete electronically.

**4. Enter the employee number.** Use **TBA[Hire Date]** — for example, TBA01152026. The permanent number gets assigned later. Don't leave this blank. A missing employee number causes issues in every system that syncs with BambooHR.

**5. Fill in the details.** Location, division, status, department, compensation, and overtime amounts. Double-check compensation before you move on — this flows into payroll, and fixing it after the fact is a headache.

**6. Select the correct template.** Templates are based on location, department, and status. Picking the wrong one means the employee gets the wrong paperwork. Take an extra second to verify.

**7. Add onboarding tasks.** Click **Add Onboarding Tasks** — this auto-fills tasks based on the department, status, and location. These tasks are what keep the first-day checklist on track for you, the supervisor, and IT.

**8. Check the employee's state.** This is the step that trips people up. If the employee is in **Tennessee or Alabama**, the state tax forms are already loaded. If they're in **any other state**, you need to manually add the correct state tax form and mark it **Required**. Miss this and payroll gets complicated — the employee won't have the right withholding on their first check.

**9. Preview and send.** Look at everything one more time before you hit send. Once the new hire packet goes out, the employee starts receiving tasks and signing documents. Make sure it's right.

**10. Complete your onboarding tasks.** You'll have your own tasks assigned — complete them on or before the due date and mark them done. Don't let your tasks be the bottleneck.

**11. Follow up as documents come in.** You'll receive email notifications as the employee completes and signs each document. Monitor the employee page and follow up if anything is overdue or incomplete.

**12. File everything in the right folder.** This is the last step and one of the most important. Every document has a designated home in BambooHR:

| Document Type | BambooHR Folder |
|--------------|-----------------|
| New hire forms (offer letter, handbook acknowledgment, etc.) | **New Hire Forms** |
| AAP Confidential Medical form | **Medical Documents** |
| ACH, W-4, state tax forms | **Payroll Related Documents** |
| Signed I-9 + two forms of ID | **I-9 Folder (restricted)** |

Filing something in the wrong folder isn't a small mistake. When someone needs to pull an I-9 for an audit or a W-4 for payroll, they need to find it exactly where it's supposed to be.

:::callout warning
Escalate if: start date, status, compensation, or location changes after you've already entered the hire; you can't identify the correct state tax form; onboarding documents are incomplete or past due; the I-9 is missing or invalid; or anything raises a compliance concern.
:::

## The Introductory Period

Every new hire starts with a 60-day introductory period. Think of it as a probationary window — the expectations are higher for attendance, and some benefits haven't kicked in yet.

**During the first 60 days:**

- The employee is allowed a **maximum of 2 attendance points.** That's a tight margin. A third point during the introductory period can be grounds for separation — so if you see someone trending in that direction early, make sure the HR Manager is aware.
- **No vacation accrual yet.** Personal time eligibility begins at 60 days.
- The employee is still learning, still adjusting — but they're also being evaluated on whether they can meet the basic expectations of the role.

**After 60 days (regular full-time status):**

- Personal time becomes eligible
- Vacation accrual begins
- Holiday pay kicks in
- Health insurance enrollment opens on the 1st of the month after 60 days
- 401(k) enrollment opens on the 1st of the month after 60 days

:::callout tip
If a new hire asks about benefits during their first week, they're not being impatient — they're planning. Know the timeline so you can give them a clear answer instead of a vague "it'll come later."
:::

## When Someone Leaves

Separation happens — voluntary and involuntary. Your role depends on which kind it is.

**What gets paid out and what doesn't:**

| PTO Type | At Separation |
|----------|--------------|
| Accrued vacation | **Paid out** |
| Personal leave | **Forfeited** |
| Long-term sick leave | **Relinquished** |

Employees will ask about this. Know the answer cold — especially the vacation payout, because that's the one people care about most.

**System cleanup:** Deactivate the employee in all HR systems. Notify IT to revoke computer access and software licenses. If the employee had access to the Proton Pass HR vault, deactivate them from there too. The Offboarding Request in BambooHR should be completed to ensure IT and all relevant workflows are triggered.

**Involuntary terminations are the HR Manager's territory.** You do not communicate a termination to an employee. Ever. Your role in an involuntary separation is support and documentation — the HR Manager handles the conversation and the decision.

**2-day no-call/no-show = voluntary quit.** If an employee misses two consecutive days without calling in, policy treats it as a voluntary resignation. This isn't a judgment call or a gray area — it's policy. Notify the HR Manager immediately when it happens.

:::callout warning
Never communicate a termination yourself. Involuntary separations are handled by the HR Manager only. Your role is documentation and system cleanup.
:::

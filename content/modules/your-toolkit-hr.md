---
slug: your-toolkit-hr
title: Your Toolkit
description: The systems you'll use every day — BambooHR, PayClock, Employvio, and more — with step-by-step workflows so you're not guessing when it matters.
tracks: [hr]
order: 7
estimatedMinutes: 18
status: published
requiresQuiz: true
requiresAcknowledgement: true

acknowledgements:
  - id: ack-1
    statement: I have confirmed system access for BambooHR, PayClock, Employvio, Phoenix LIS, and the HR Drive.
  - id: ack-2
    statement: I understand the PayClock workflows for polling, PTO entry, punch edits, and new employee setup.
  - id: ack-3
    statement: I know the Memphis vs. Scottsboro Employvio workflows and when to use each.
  - id: ack-4
    statement: I know that passwords go in Proton Pass only — never email, Teams, or shared documents.

quiz:
  questions:
    - id: q1
      text: What do all active shifts in PayClock start with?
      options:
        - id: a
          text: "*Brandy"
        - id: b
          text: The scheduled shift time
        - id: c
          text: NEW
        - id: d
          text: USE
      correctId: c

    - id: q2
      text: For a Memphis applicant, which drug test do you select in Employvio?
      options:
        - id: a
          text: Standard 5-Panel
        - id: b
          text: LabCorp 10 Panel (A La Carte)
        - id: c
          text: Basic Screening — 1 County
        - id: d
          text: Urinalysis Plus
      correctId: b

    - id: q3
      text: When editing a time punch in PayClock (PC-02), what must you have before making any change?
      options:
        - id: a
          text: HR Manager's verbal approval
        - id: b
          text: Documentation — supervisor note, email, or correction form
        - id: c
          text: The employee's written request
        - id: d
          text: Nothing — you can edit at your discretion
      correctId: b

    - id: q4
      text: The PC-05 timecard review requires two monitors. What goes on each screen?
      options:
        - id: a
          text: PayClock on both — one per location
        - id: b
          text: BambooHR Time Off Used report on one; PayClock timecards on the other
        - id: c
          text: Paylocity on one; PayClock on the other
        - id: d
          text: BambooHR on both for side-by-side comparison
      correctId: b

    - id: q5
      text: You run the Payroll Change Report and see an unexpected pay rate change for an employee. What do you do?
      options:
        - id: a
          text: Approve it — it was probably a manager update
        - id: b
          text: Correct the rate yourself and continue
        - id: c
          text: Flag it to the HR Manager before payroll is submitted
        - id: d
          text: Skip it and note it for next cycle
      correctId: c

    - id: q6
      text: Where do you share passwords with other HR team members?
      options:
        - id: a
          text: Teams message
        - id: b
          text: Email
        - id: c
          text: Word document on S drive
        - id: d
          text: Proton Pass (HR vault)
      correctId: d
---

## Systems Overview

These are the systems you'll touch daily — or close to it. You already know some of them from the employee side, but from HR, you'll be using them differently. Bookmark them, learn the logins, and get comfortable navigating each one early.

| System | Link | Primary Use |
|--------|------|-------------|
| **BambooHR** | [aap.bamboohr.com](https://aap.bamboohr.com) | Employee profiles, onboarding, PTO, job postings, ATS |
| **PayClock** | [portal.payclock.com](https://portal.payclock.com) | Poll timeclocks, review timecards, enter PTO |
| **Employvio** | [clients.employvio.com](https://clients.employvio.com/login.php) | Background & drug screen orders/invitations |
| **Paylocity** | [access.paylocity.com](https://access.paylocity.com) | Payroll (reference only unless assigned) |
| **Proton Pass** | [app.proton.me/pass](https://app.proton.me/pass) | Password sharing — HR vault |
| **Phoenix LIS** | [flcscottsboro.phoenixlis.com](https://flcscottsboro.phoenixlis.com) | Scottsboro drug screening results (login via Proton Pass) |
| **HR Drive** | S:\Human Resources & HR SharePoint | Digital filing |

:::callout warning
Passwords go in Proton Pass only. Never email or Teams a password.
:::

## BambooHR — Payroll Change Report (BH-02)

This is one of the last checks before payroll goes out the door — and it's on you to catch anything that doesn't look right. If something slips past this report, it hits someone's paycheck.

**When:** Each payroll cycle during reconciliation, before Tuesday 6:00 PM CST submission.

**Steps:**

1. Go to Reports → open the **Payroll Change Report** for the correct pay date/range
2. Review all changes: pay rates, job/comp changes, new hires/terminations, time off edits
3. Flag any unexpected items to Nicole **before** payroll is submitted

**Escalate if:** Unexpected pay changes, retro adjustments, or report access issues.

## PayClock — PC-03 Poll Timeclocks

Polling is how punches get from the physical timeclock into PayClock. If you don't poll, the data doesn't move — and that means timecards are incomplete when it's time to review them. This is one of those small tasks that causes big problems if it gets skipped.

**When:** Every 2 hours — imports recent Face Clock punches into PayClock.

**Steps:**

1. Open **Clocks > Manage Clocks**
2. Select the clock and run **Poll** (or Poll All if appropriate)
3. Refresh the timecard view and verify recent punches imported
4. If polling fails, capture the error message and clock ID

**Checks:** Recent punches show on the right employees; no duplicate imports.

**Escalate if:** Clock won't poll, widespread missing punches, or repeated polling errors.

## PayClock — PC-04 Add New Employee

Every new hire needs to exist in PayClock before they walk in on Day 1 — otherwise they can't clock in, and you're starting their first day with a problem. This is part of the onboarding task list, and it's one you don't want to leave until the last minute.

**Before you start:** Confirm the employee is active in BambooHR and their start date is set. Create their employee number in New Hires, Changes and Terminations. Verify department, location, employment status, and schedule are ready.

**Steps:**

1. Open **Employees > + New**
2. Enter employee's name (**Name At Clock** must be in [Last Name First Name] format with no comma)
3. Enter Employee # for the Employee Number, Employee Pin and Badge Number
4. Select the type of employee, pay class, location, department and date of hire
5. Save the employee record
6. Click **Manage Employee > Manage Schedule.** Select the employee's shift and set it as recurring (All shifts should start with NEW)
7. Update/poll clocks so the employee appears at the timeclock

**Checks:** Employee appears in Timecards with correct filters; location/dept correct; test on Day 1 if feasible.

**Escalate if:** Missing identifiers, duplicate/incorrect record, or device won't receive the update.

## PayClock — PC-01 Enter PTO & PC-02 Edit Punches

These two tasks will eat up more of your time than you'd expect. PTO entry and punch edits are where small mistakes turn into payroll problems — so slow down, double-check, and don't skip the documentation step.

**PC-01 — Enter PTO:**

- Verify PTO is approved in BambooHR before entering — no approval, no entry
- Open Timecards → select employee → add the PTO hours into the corresponding column
- Always double-check that PTO is entered for the correct date — one day off means the wrong paycheck

**PC-02 — Edit Time Punches:**

- Always obtain documentation (supervisor note/email/correction form) **before** making any change — no exceptions
- To edit: double-click the cell → type corrected time (verify AM or PM) → Enter to save
- To add missing punch: double-click the **last** Out punch in the row → enter time + verify AM or PM → Enter to Save. The added punch will automatically move to the corresponding column.
- To delete: only with documentation; note the reason → click in the cell → click/press **Delete**
- Review totals and exceptions after every change

:::callout warning
Escalate if repeated fixes for same employee, conflicting instructions, or policy-inconsistent corrections.
:::

## PC-05 — Review Timecards Using BambooHR Time Off Used Report

This is your daily reconciliation — matching what BambooHR says was approved against what PayClock actually shows. It's the task that catches missed PTO entries, exception flags, and discrepancies before they snowball into payroll issues. Two monitors aren't a suggestion — they're a requirement.

**When:** Enter PTO for the previous work day **daily.**

**Steps:**

1. In BambooHR → Reports → open **"Time Off Used"** report
2. Set date range; filter by Pay Type → Hourly and Location → AAP/API Scottsboro OR API Memphis
3. In PayClock → open Timecards → select the same pay period and location group
4. Review each timecard for exceptions: late arrivals, early departures, missing punches — note items needing follow-up
5. Using the BambooHR Time Off Used report, add PTO in PayClock for the correct employee, date(s), hours, and non-work pay code

**Escalate if:** Time off is disputed/unclear, appears unapproved, doesn't match BambooHR, or has unusual payroll impact.

## Employvio — Location-Specific Workflows

Employvio handles background checks and drug screening — and the process is different depending on whether the applicant is Memphis or Scottsboro. Mix these up and you'll delay a hire, so know which workflow you're in before you click anything.

**Memphis applicants (HRA-03):**

1. Order → Order w/ Invitation → Standard → A La Carte → check **(AF) LabCorp – 10 Panel** → Next
2. Template: **Background Check Authorization** → enter applicant info → Send Invitation
3. Immediately update BambooHR status to **"Pending Drug Screening Results"**

**Scottsboro applicants (HRA-03):**

1. Drug screening: **The Family Life Center**, 211 S. Market Street, Scottsboro, AL 35768 (Mon–Fri 8am–5pm, closed 12–1pm); employee must bring **photo ID**
2. Send **APIS Drug Screening Instructions** template from BambooHR when offer letter is signed
3. Update BambooHR status to **"Pending Drug Screening Results"**
4. In Employvio: Order → Order → Standard → Next → enter info → **Standard Screening – 1 County** → Submit

**File naming:** `YYYY-MM-DD DOC NAME - FIRST NAME LAST NAME` | Save within **48 hours** of receipt.


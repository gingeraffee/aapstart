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
      text: You're entering PTO in PayClock and the Time Off Taken Report shows 8 hours of personal time. Where do the hours go?
      options:
        - id: a
          text: The Vacation column — all PTO goes under Vacation
        - id: b
          text: The Personal column — it needs to match the type shown on the report
        - id: c
          text: The PTO column — PayClock has a single PTO bucket
        - id: d
          text: Whichever column has available balance remaining
      correctId: b

    - id: q2
      text: You run the Payroll Change Report and see a pay rate change for an employee. You weren't told about it, but it looks like a normal raise. What do you do?
      options:
        - id: a
          text: Verify the rate matches PayClock and move on — raises are routine
        - id: b
          text: Flag it to Nicole before payroll is submitted — unexpected changes always get flagged
        - id: c
          text: Update PayClock to match the new rate and continue reconciliation
        - id: d
          text: Check with the employee's supervisor to confirm the raise was approved
      correctId: b

    - id: q3
      text: A Scottsboro applicant needs a drug screening. Why don't they use LabCorp like Memphis applicants?
      options:
        - id: a
          text: Scottsboro applicants use a different panel type that LabCorp doesn't offer
        - id: b
          text: The Family Life Center gives faster results than LabCorp
        - id: c
          text: There's no approved LabCorp facility within 25 miles of Scottsboro
        - id: d
          text: Scottsboro uses a county-level screening that requires a local provider
      correctId: c

    - id: q4
      text: A supervisor emails you asking to edit an employee's time punch from last Thursday. The email says "please change the 2:00 PM out-punch to 5:00 PM." What do you do?
      options:
        - id: a
          text: Make the edit — an email from a supervisor counts as documentation
        - id: b
          text: Make the edit, but ask the supervisor to also submit a correction form for the file
        - id: c
          text: Ask the supervisor to submit a correction form or signed note before you make the change
        - id: d
          text: Forward the email to Nicole for approval before editing
      correctId: a

    - id: q5
      text: You're setting up a new Memphis hire in Employvio. Which screening do you select?
      options:
        - id: a
          text: Standard Screening — 1 County
        - id: b
          text: (AF) LabCorp — 10 Panel (A La Carte)
        - id: c
          text: (AF) LabCorp — 5 Panel Standard
        - id: d
          text: Background Check Authorization — Standard
      correctId: b

    - id: q6
      text: You notice a new hire on the Payroll Change Report who doesn't have a PayClock record yet. Their start date is Monday. What's the priority?
      options:
        - id: a
          text: Get them into PayClock (PC-04) before their start date so they can clock in on Day 1
        - id: b
          text: Flag it to Nicole — new hire setup isn't your responsibility until you're trained
        - id: c
          text: Wait until Monday and set them up when they arrive for orientation
        - id: d
          text: Enter them in PayClock and backdate their start date after orientation
      correctId: a
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

You won't run this report on your own yet — but you will eventually, and when you do, it needs to be second nature. This is one of the last checks before payroll goes out the door. If something slips past this report, it hits someone's paycheck. The goal right now is for you to know where it lives, what it tells you, and what to do with the information.

**What it is:** The Payroll Change Report captures anything that changed in BambooHR since the last payroll cycle — pay rate adjustments, job title or department changes, new hires, terminations, and time off edits. Think of it as BambooHR's way of saying *"here's everything that happened that could affect a paycheck."*

**When it's used:** Each payroll cycle during reconciliation, before the Tuesday 6:00 PM CST submission deadline.

**How to find it:**

1. Log in to [BambooHR](https://aap.bamboohr.com)
2. Go to **Reports** in the left-hand navigation
3. Open the **Payroll Change Report**
4. Set the date range to match the current pay period

**What you're looking at:**

The report will show a list of changes organized by employee. Each row tells you what changed, when it changed, and what the old and new values are. The most common items you'll see:

- **Pay rate changes** — raises, corrections, or reclassifications
- **Job or department changes** — transfers, promotions, title updates
- **New hires and terminations** — anyone added or removed during the period
- **Time off adjustments** — manual balance corrections or policy changes

**What to do with it:**

1. Review every line. Don't skim — each change has a potential payroll impact
2. Cross-reference pay rate changes against what's in PayClock. If BambooHR shows a rate change, PayClock needs to match. If it doesn't, that's a flag
3. Verify new hires are already set up in PayClock (PC-04) with the correct rate, department, and location
4. Check terminations against PayClock to confirm their final timecard is complete and no future shifts are scheduled

**What counts as an abnormality:**

Not everything on the report is a problem — but some things should make you pause. Flag it to Nicole **before payroll is submitted** if you see:

- A pay rate change you weren't expecting or that doesn't have a corresponding approval
- A retroactive adjustment — anything backdated to a previous pay period
- A new hire on the report who isn't set up in PayClock yet
- A termination where the final timecard in PayClock still has open exceptions
- Any change that doesn't match what you've been told is happening

:::callout tip
When in doubt, flag it. It's always better to ask a question before payroll goes out than to fix a paycheck after it does. Nicole would rather you over-flag than under-flag while you're learning.
:::

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

- Your source for PTO entries is the **Time Off Taken Report** in BambooHR — this is where you'll see who took time off and for how many hours. Only approved time appears on this report, so if it's there, it's good to enter
- Open Timecards → select employee → add the PTO hours into the corresponding column
- Always double-check that PTO is entered for the correct date — one day off means the wrong paycheck
- Make sure the hours go into the correct column — vacation, personal, sick, etc. Entering PTO under the wrong type shows up on the employee's pay stub and leads to questions you don't want to answer

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

Employvio handles background checks and drug screening — but the process isn't the same for every location. Memphis and Scottsboro follow completely different workflows, and if you mix them up, you'll delay a hire. So before you click anything, know which location you're working with.

**Why two workflows?** It comes down to geography. Memphis has plenty of approved LabCorp facilities nearby, so applicants can walk into a lab and get screened through Employvio's standard electronic process. Scottsboro doesn't have an approved facility within 25 miles — so we use a local provider, The Family Life Center, and handle the screening manually. Same goal, different path to get there.

### Memphis Applicants (HRA-03)

Memphis is the more straightforward workflow. Everything runs through Employvio electronically — you place the order, the applicant gets an invitation, and they go to a LabCorp location on their own.

**Steps:**

1. In Employvio: **Order → Order w/ Invitation → Standard → A La Carte** → check **(AF) LabCorp – 10 Panel** → Next
2. Select the **Background Check Authorization** template → enter the applicant's info → Send Invitation
3. Immediately update the applicant's BambooHR status to **"Pending Drug Screening Results"**

The applicant receives an email with instructions and a list of LabCorp locations. They pick one, walk in, and get screened. Results come back through Employvio.

### Scottsboro Applicants (HRA-03)

Scottsboro takes a few more steps because the screening happens locally instead of through LabCorp. You're coordinating between BambooHR, the applicant, The Family Life Center, and Employvio — so keep your ducks in a row.

**Steps:**

1. When the offer letter is signed, send the **APIS Drug Screening Instructions** template from BambooHR — this tells the applicant where to go and what to bring
2. Update BambooHR status to **"Pending Drug Screening Results"**
3. The applicant goes to **The Family Life Center** — 211 S. Market Street, Scottsboro, AL 35768 (Mon–Fri 8am–5pm, closed 12–1pm). They must bring a **photo ID**
4. In Employvio: **Order → Order → Standard → Next** → enter applicant info → select **Standard Screening – 1 County** → Submit

:::callout tip
The Family Life Center closes for lunch from 12–1pm. If an applicant says they went and it was closed, that's probably why. Make sure the instructions template is clear about hours.
:::

### File Naming

All Employvio-related documents follow the same naming convention:

`YYYY-MM-DD DOC NAME - FIRST NAME LAST NAME`

Save within **48 hours** of receipt. No exceptions — if it's not filed, it might as well not exist.


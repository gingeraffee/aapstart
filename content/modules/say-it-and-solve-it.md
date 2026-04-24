---
slug: say-it-and-solve-it
title: Say It & Solve It
description: Scripts, intake procedures, and routing rules for timecard exceptions, employee concerns, complaints, and escalation.
tracks: [hr]
order: 9
estimatedMinutes: 20
status: published
requiresQuiz: true
requiresAcknowledgement: true

acknowledgements:
  - id: ack-1
    statement: I understand the communication principles — direct, transparent, professional — and know when to use email vs. phone vs. in person.
  - id: ack-2
    statement: I can identify timecard exception types and know which script to use, including when to attach a screenshot.
  - id: ack-3
    statement: I know that pay questions are always routed to the HR Manager — I never provide pay information, even if I think I know the answer.
  - id: ack-4
    statement: I understand that harassment, discrimination, and retaliation reports are intake, documentation, and immediate handoff only — I do not investigate, advise, or interpret.
  - id: ack-5
    statement: I know the escalation routing table, urgency levels, and what every internal escalation message must include.

quiz:
  questions:
    - id: q1
      text: An employee calls and says their paycheck seems short. You're pretty sure you can see the issue in PayClock — they were out a day without PTO entered. What do you do?
      options:
        - id: a
          text: Walk them through what you see in PayClock so they understand the discrepancy
        - id: b
          text: Document the call with the details they gave you and route it to the HR Manager — pay questions always go to the HR Manager
        - id: c
          text: Check BambooHR to see if they have PTO available and suggest they submit a request to cover the missing day
        - id: d
          text: Let them know you see the issue and you'll get it corrected before the next payroll cycle
      correctId: b

    - id: q2
      text: You're reviewing timecards and notice an employee has three extra punches on Tuesday that don't make sense. What do you do before contacting the supervisor?
      options:
        - id: a
          text: Delete the extra punches — they're clearly errors
        - id: b
          text: Check the scheduled shift and existing notes, then take a screenshot of the timecard
        - id: c
          text: Email the employee directly to ask what happened
        - id: d
          text: Flag it for the HR Manager since it could be a falsification issue
      correctId: b

    - id: q3
      text: An employee comes to you and says a coworker has been making comments that make them uncomfortable. They're not sure if it's "serious enough" to report. What do you say?
      options:
        - id: a
          text: Ask them to describe the comments so you can help them decide if it's worth reporting
        - id: b
          text: Let them know you take this seriously, document what they're telling you, and hand it off to the HR Manager immediately
        - id: c
          text: Encourage them to talk to the coworker directly first and come back if it doesn't stop
        - id: d
          text: Document it and tell them you'll keep an eye on the situation before escalating
      correctId: b

    - id: q4
      text: A supervisor emails you about a missing punch but doesn't respond to your follow-up. Payroll processes tomorrow. What do you do?
      options:
        - id: a
          text: Call the supervisor directly — email wasn't urgent enough for a payroll deadline
        - id: b
          text: Enter the employee's scheduled time as a placeholder and fix it next cycle
        - id: c
          text: Send the payroll cutoff follow-up script and escalate to the HR Manager if you still don't hear back before the deadline
        - id: d
          text: Submit payroll without it and document the missing response
      correctId: a

    - id: q5
      text: An employee asks you to excuse a point from their attendance record. They say they had a flat tire and it wasn't their fault. What do you tell them?
      options:
        - id: a
          text: Explain that the point system is no-fault, check whether they have PTO to cover the time, and if not, let them know they can discuss exceptions with their supervisor
        - id: b
          text: Remove the point since a flat tire is clearly outside their control
        - id: c
          text: Tell them to bring documentation of the flat tire and you'll see what you can do
        - id: d
          text: Route it to the HR Manager since point exceptions are the HR Manager's decision
      correctId: a
---

## How to Communicate in HR

Most of what you do in this role comes down to communication — answering questions, following up, delivering news people don't want to hear, and documenting all of it. The way you communicate matters as much as the information itself.

**Be direct, transparent, and professional.** Employees don't need you to sugarcoat things or dance around an answer. They need to know what's happening, what you can do, and what happens next. If the answer is "no," say so clearly and kindly. If you don't know, say *"Let me check on that and get back to you"* — and then actually get back to them.

**Know when to use which channel.** Email is for documentation — anything you might need to reference later. Phone or in-person is for nuance and de-escalation — tone matters when someone is frustrated, and you can't read a room through email. When in doubt, handle it in person and follow up with an email to document what was discussed.

**Never guess or promise outcomes.** You can promise process. You can promise a follow-up timeline. You cannot promise results. *"I'll look into this and get back to you by Thursday"* is always safe. *"I'm sure we can fix this"* is not.

**Complaints get documented on the HR Incident/Complaint Report Form** — and the employee's statement goes in their own words, not yours. Safety concerns require full documentation: what, when, where, why, how. If it's not written down, it's like it never happened.

**Follow up by every date you commit to.** If the timeline changes, tell the employee before they have to ask. Nothing erodes trust faster than silence after a promise.

:::callout tip
Email format standard: Open with a warm greeting — **"Hey [First Name]!"**, **"Hello [First Name],"**, or **"Hi [First Name],"** all work. Close with **"Thanks!"**, **"Thank you,"**, or another professional sign-off. Keep it warm but professional — you're a person, not a form letter.
:::

## Timecard Exception Scripts (CS-01)

Timecard exceptions are going to be a big chunk of your week. Missing punches, extra punches, early arrivals, late arrivals — they all need to be resolved before payroll goes out. These scripts give you a starting point for each type of exception. Use the structure, but make it sound like you.

**Before you reach out to a supervisor:** Open the timecard, identify the exception, check the scheduled shift and any existing notes, and take a screenshot (WIN + Shift + S) if the punches are complex or unclear. Don't send a vague "something's off" email — give the supervisor enough context to answer you quickly.

### Missing Arrival Punch

> Subject: Missing In Punch — [Employee Name], [Date]
>
> Hey [Supervisor Name]! I'm reviewing timecards and [Employee Name] is missing their clock-in for [Date]. Do you know what time they got in? Thanks!

### Missing Departure Punch

> Subject: Missing Out Punch — [Employee Name], [Date]
>
> Hey [Supervisor Name]! [Employee Name] didn't clock out on [Date]. Do you know when they left? Thanks!

### Extra or Off-Sequence Punches (attach screenshot)

> Subject: Timecard Review — [Employee Name], [Date/Date Range]
>
> Hey [Supervisor Name]! [Employee Name]'s timecard looks a little off for [Date/Date Range] — there are some extra punches that don't line up. I attached a screenshot. Can you take a look and let me know what the correct times should be? Thanks!

### Late Arrival — No Point or PTO Recorded

> Subject: Late Arrival — [Employee Name], [Date]
>
> Hey [Supervisor Name]! I see [Employee Name] was late on [Date], but I don't see a point or any PTO noted. Should they be pointed for the late arrival, or are they using PTO to cover the time? Thanks!

### Early Arrivals / Overtime

> Subject: Overtime Check — [Employee Name], [Date/Date Range]
>
> Hey [Supervisor Name]! [Employee Name] has been clocking in early and it's pushing them into overtime for [Date/Date Range]. Was the overtime approved, or should we adjust expectations going forward? Thanks!

### Payroll Cutoff Follow-Up

This one's for when you've already reached out and haven't heard back — and the deadline is coming.

> Subject: Follow-Up — Timecard for [Employee Name], Due by [Deadline]
>
> Hey [Supervisor Name]! Quick follow-up on [Employee Name]'s timecard for [Date/Date Range]. Payroll is processing soon and I need confirmation by [Deadline]. Can you reply with the correct times or confirm what's there is accurate? Thanks!

### Close the Loop

After a correction is made, let the supervisor know it's done. This keeps everyone on the same page and builds trust.

> Subject: Timecard Updated — [Employee Name], [Date]
>
> Hey [Supervisor Name]! Thanks for confirming — I updated [Employee Name]'s timecard for [Date]. In: [Time], Out: [Time]. Let me know if anything else needs adjusting. Thanks!

:::callout warning
Escalate to the HR Manager if you see: a dispute about the timecard, suspected falsification, a repeated pattern with the same employee, anything that looks like off-the-clock work, a missed meal break that could have legal implications, changes needed to a closed pay period, or a supervisor who doesn't respond before the payroll cutoff.
:::

## Employee Concern & Complaint Scripts (CS-02)

Not every conversation will be about timecards. Employees will come to you with concerns, complaints, questions about pay, and sometimes things that are genuinely serious. These scripts help you handle each type without overstepping.

### General Concern — Email

> Subject: Re: Your Concern
>
> Hey [First Name]! Thanks for reaching out. I hear you on [briefly restate the issue]. Here's what I can tell you right now: [what you know / what you can and can't do]. Here's what happens next: [next step]. If this needs HR Manager review, I'll get it routed right away. I'll follow up with you by [Date]. Thanks!

### General Concern — In Person or Phone

When someone comes to you in person or calls, the goal is to listen first and respond second. Here's the flow:

1. *"Thanks for coming to me with this. I want to make sure I understand."*
2. *"Walk me through what happened."*
3. *"So what I'm hearing is [restate in one sentence]. Did I get that right?"*
4. *"Here's what I can tell you right now..."*
5. *"Here's what happens next, and when you can expect to hear back."*

Don't rush to fix. Don't interrupt. Let them finish, then respond. Most people just want to know they were heard.

### Complaint Intake — In Person or Phone

This is different from a general concern. A complaint means paperwork.

*"Thank you for bringing this forward. I'm going to document what you're telling me so it can be reviewed. I'll need: what happened, when and where, who was involved, and whether there were witnesses. I'll also need your statement in your own words for the complaint form. Once that's done, I'll hand it over to the HR Manager with a summary so it can be reviewed."*

Your job here is intake and documentation. You are not investigating. You are not deciding if it's valid. You are collecting information and handing it off.

### Pay Questions — Always Route

This one is simple: pay questions go to the HR Manager. Every time. Even if you're 99% sure you know the answer.

> Subject: Re: Pay Question
>
> Hey [First Name]! Pay questions need to go through the HR Manager directly so we make sure everything is accurate. I'm forwarding your question to her now. It'll help if you can include the pay period and whether this is about hours, overtime, a bonus, or a deduction. Thanks!

### Harassment, Discrimination, or Retaliation

This is the most serious category. Your role is intake, documentation, and immediate handoff. That's it.

*"Thank you for telling me. I'm going to document what you've shared and get this to the HR Manager right away."*

Do **not** investigate. Do **not** interview the other party. Do **not** advise on what they should do. Do **not** tell them whether you think it's serious enough to act on. Document what they told you and hand it off. Advise the employee to preserve any evidence — texts, emails, screenshots.

:::callout warning
Harassment, discrimination, and retaliation reports are intake + documentation + immediate handoff. No exceptions. No judgment calls. No delays.
:::

### Employee Wants a Point Excused

This comes up more than you'd think. Here's how to handle it.

*"We use a no-fault point system, so the reason for the absence doesn't affect whether a point is recorded — but there are two things we can look at. First, do you have PTO you could use to cover the time? Vacation has to be taken in 2-hour increments, personal time in 1-hour increments. Second, if there are extenuating circumstances and no PTO available, your supervisor has the ability to review whether an exception is appropriate — I'd encourage you to have that conversation with them."*

## Escalation Routing (ES-01)

Not everything is yours to handle. The routing table below tells you who owns what and how fast it needs to get there.

| Issue Type | Owner | Urgency |
|------------|-------|---------|
| Pay discrepancy | the HR Manager | Immediate |
| Safety hazard / injury | HR Administrative Assistant | Immediate |
| Harassment / discrimination / retaliation | the HR Manager | Immediate |
| Threats / violence | the HR Manager + Site Leadership | Immediate |
| General complaint / workplace conflict | HR Administrative Assistant | Same Day |
| FMLA / medical / leave | the HR Manager | Immediate |
| Attendance point exception | Employee's Supervisor | Same Day |
| PTO balance discrepancy | HR Administrative Assistant | Next Business Day |
| Performance dispute | HR Administrative Assistant | Next Business Day |
| Policy exception request | the HR Manager | Next Business Day |

### What Every Escalation Message Must Include

When you route something to the HR Manager, don't make her ask follow-up questions. Include everything she needs upfront:

- **Employee name, ID, location, and department**
- **Category and urgency level** (from the table above)
- **1–2 sentence summary** of what's going on
- **Key facts** — dates, times, locations, who was involved
- **Attachments** — complaint form, employee statements, screenshots
- **What you've done so far** and what you need the HR Manager to do next

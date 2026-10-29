# Field Labs usability test script

Short script for five real testers on the three playable missions (IAM, NAT, DNS). Use it moderated or unmoderated. Do not invent participants or fill results early. Results are **PENDING**.

## Goal to tell the tester

You are the on-call engineer. A service is broken. Your job is to restore it using the Field Labs virtual system (change settings, run the test, see what happens). There is no live AWS account and nothing is graded automatically.

Do **not** tell them which tab, card, button or control to use. Do **not** walk them through the fix.

## What to measure

| Measure | How |
| --- | --- |
| Time to first action | Seconds from first view of the homepage until the first deliberate click or keypress toward the lab (not idle reading) |
| Field Labs in ≤2 clicks | From the homepage, did they open Field Labs / a mission catalog entry in two clicks or fewer? |
| Finish or abandon (10 min) | Did they reach a successful verified result within 10 minutes, or stop earlier? |
| Confusion points | Their words only: where they hesitated, misread a label or felt stuck |

## Mission rotation (one mission per tester)

| Tester slot | Mission | Catalog case |
| --- | ---: | --- |
| 1 | IAM | Permissions-boundary / daily report AccessDenied |
| 2 | NAT | Private subnet outbound HTTPS / NAT routing |
| 3 | DNS | Resolver logging gap / missing historical DNS |
| 4 | IAM | (repeat IAM) |
| 5 | NAT | (repeat NAT) |

If a sixth session is ever added, give them DNS. Keep one mission only per person for this script.

## Consent (read aloud or show before start)

This is a short usability study of CloudOps Lab Field Labs, a local educational prototype by @jmsgnnr. It is not an official AWS product or exam. We will watch or record how you use the screen so we can improve clarity. We will note timing and what confused you. We will not ask for AWS credentials, employer data or payment details. You may stop at any time. Results are used only to improve this prototype. Do you agree to take part?

Record yes/no. Do not proceed without a clear yes.

## Moderated form (~20 minutes)

1. Confirm consent. Note role (optional) and whether they have used this app before.
2. Open the homepage at a comfortable size (desktop or phone). Start a visible timer.
3. Say the goal above. Assign their rotated mission by name of the outage only (for example: "the reporting job cannot read its daily file"), not by UI path.
4. Observe silently. Mark time to first action and whether Field Labs was reached in ≤2 clicks.
5. Soft prompts only if they are fully stuck for ~90 seconds: "What are you trying to do?" or "What do you think that control does?" Never name the correct control.
6. Stop at success, clear abandon, or 10 minutes.
7. Ask the post-task questions. Fill one results row in their own words.

## Unmoderated form

Same consent, goal, mission assignment and 10-minute cap.

Provide a one-page brief and a way to return notes (form, email or shared doc). Ask them to:

1. Write the clock time when they first click toward the lab.
2. Write whether they found Field Labs from the homepage in two clicks or fewer (yes/no).
3. Write finish or abandon within 10 minutes (yes/no) and wall-clock minutes if known.
4. List confusion points in their own words.
5. Answer the post-task questions below.

Do not coach mid-task in the unmoderated brief beyond the goal sentence and the assigned outage description.

## Post-task questions

1. In one sentence, what was the broken service and what did you try first?
2. What label or screen moment was clearest?
3. What was most confusing? (quote them)
4. Did optional clues help, hurt or go unused?
5. Would you try another mission without coaching? Why or why not?

## Results table

Status: **PENDING**. Do not invent testers or outcomes. Fill a row only after a real session.

| Tester | Mission | Time to first action | Completed within 10 minutes | Confusion points | Notes |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

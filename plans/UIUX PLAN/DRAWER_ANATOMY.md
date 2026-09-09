# Drawer Anatomy — Right-Side Detail Panel

## Purpose
Define the anatomy, behavior, and content hierarchy of all right-side detail drawers
so every module uses consistent patterns without re-inventing the panel.

---

## Global Drawer Rules

1. Drawer slides in from the right — never replaces the page.
2. Page scroll position and filters are preserved when drawer opens and closes.
3. Drawer width: 420px on desktop, full-width on mobile.
4. Drawer has its own scroll — page does not scroll behind it.
5. Closing the drawer: Escape key, clicking the backdrop, or the × button.
6. "Open Full Detail" is always available at the top of the drawer for deep work.
7. Drawer never contains a nested modal — use inline confirmation or toast instead.
8. All changes inside drawer take effect immediately (optimistic update) with undo toast.
9. Drawer title = participant full name + status badge.

---

## Universal Drawer Anatomy

```
┌────────────────────────────────────────────┐
│  Budi Santoso                       LUNAS  │  ← Header: Name + Status badge
│  TICKET-DIGNITY-2026-012            [×]    │  ← Ticket code + Close
│  ────────────────────────────────────────  │
│  [ Open Full Detail → ]                    │  ← Always visible, secondary style
│  ════════════════════════════════════════  │
│                                            │
│  IDENTITY                                  │  ← Section 1
│  Email      budi@example.com               │
│  WhatsApp   +62 812 3456 7890              │
│  Instansi   PT Example                     │
│  Kota       Surabaya                       │
│  Paket      INDIVIDU — Rp 100.000          │
│  Daftar     3 Sep 2026 14:22               │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  STATUS TIMELINE                           │  ← Section 2
│  ● Registered          3 Sep 14:22         │
│  ● Proof submitted     3 Sep 17:05         │
│  ● Payment verified    4 Sep 09:11 (Donni) │
│  ● Ticket sent         4 Sep 09:12 (sys)   │
│  ○ Certificate         —                   │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  QUICK ACTIONS                             │  ← Section 3
│  [ Verify Payment ]  (if pending)          │
│  [ Send Ticket ]     (if not sent)         │
│  [ Send Certificate ](if eligible)         │
│  [ Send WhatsApp ]                         │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  RELATED RECORDS                           │  ← Section 4
│  Payment  Rp 100.000  VERIFIED  4 Sep      │
│  Proof    [View proof image]               │
│  Ticket   TICKET-DIGNITY-2026-012  SENT    │
│  Certificate  —  (not yet generated)       │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  NOTES                                     │  ← Section 5
│  (internal admin note — not shown to user) │
│  [ Add note... ]                           │
│                                            │
└────────────────────────────────────────────┘
```

---

## Section Definitions

### Section 1 — Identity
**Always visible. Never collapsed.**
- Full name, email, WhatsApp, institution, city.
- Package type + nominal.
- Registration timestamp.
- Source indicator if from Google Form (small icon, not emphasized).

### Section 2 — Status Timeline
**Always visible. Never collapsed.**
- Ordered: Registered → Proof Submitted → Verified/Rejected → Ticket Sent → Certificate Sent.
- Completed steps: filled dot + timestamp + actor.
- Pending steps: empty dot + "—".
- Failed steps: red dot + short reason.
- This is read-only. Changes to status happen via Quick Actions.

### Section 3 — Quick Actions
**Context-sensitive. Shows only what is actionable for this participant right now.**

Rules:
- Only show actions that are currently valid given participant state.
- Do not show "Send Ticket" if ticket already sent successfully.
- Do not show "Verify Payment" if already verified or rejected.
- Primary action (most urgent) is at the top.
- Maximum 4 actions visible at once — more behind "More actions" disclosure.
- Destructive actions (Delete, Reject) appear below a separator and are outlined, never filled red.

| Condition | Actions Shown |
|---|---|
| Payment PENDING | Verify Payment (primary), Reject |
| Payment VERIFIED, Ticket NOT_SENT | Send Ticket (primary) |
| Ticket SENT, Certificate NOT_SENT | Send Certificate (primary) |
| All done | "All done for this participant" + Edit |
| Always | Send WhatsApp, Edit Participant |

### Section 4 — Related Records
**Collapsed by default on mobile, expanded on desktop.**
- One row per record type: Payment / Proof / Ticket / Certificate.
- Each row: type label + reference code + status + timestamp + quick link.
- Proof: inline thumbnail that opens full-size in a lightbox (not new tab).
- Missing records shown as empty state row, not omitted.

### Section 5 — Notes
**Collapsed by default. Expanded on click.**
- Internal admin notes only. Never surfaced to participant.
- Timestamped, actor-attributed.
- Free text. Max 1000 characters.
- No formatting, no mentions.

---

## Drawer Variants by Module

Each module uses the universal anatomy but may emphasize different sections:

| Module | Default Open Section | Primary Action |
|---|---|---|
| Registrants | Identity + Timeline | Edit / Send Message |
| Payments | Identity + Proof (Section 4) | Verify / Reject |
| Tickets | Identity + Timeline | Send Ticket / Resend |
| Attendance | Identity + Timeline | Mark Attended / Override |
| Certificates | Identity + Timeline | Generate / Send Certificate |

For **Payments**, Section 4 (Related Records → Proof) is promoted to appear
immediately after Identity, before Timeline.

---

## Optimistic Update Behavior
- When admin clicks "Verify Payment":
  1. Drawer immediately shows status → VERIFIED.
  2. Toast: "Payment verified. [Undo]"
  3. Background API call fires.
  4. If API fails: status reverts, error toast shown.
- 5-second undo window for all quick actions except bulk operations.

---

## Loading & Error States
- Drawer open: skeleton loader for each section independently.
- Section error: inline error with retry — does not collapse other sections.
- Optimistic update failure: revert + error toast with specific reason.

---

## Acceptance Criteria
- All modules use this same drawer anatomy.
- Proof image is visible inline without new tab or download.
- Status timeline is read-only and always current.
- Quick Actions never show irrelevant actions.
- Closing the drawer does not reset the list filter or scroll position.
- Mobile drawer is full-width and maintains all sections.
- Notes are never accidentally sent to participants.
- Every quick action in the drawer is also audited.

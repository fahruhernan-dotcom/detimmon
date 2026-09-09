# Dashboard Specification — "What Needs Action Now?"

## Core Question
Every element on the dashboard must justify its presence by answering:
**"Does this help the admin decide what to do in the next 30 seconds?"**

If not — it belongs on a module page, not the dashboard.

---

## Layout Structure (Desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Event Context Bar]  Bootcamp Solo — 14 Sep 2026   [Change ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ACTION INBOX                           REVENUE SUMMARY         │
│  ┌───────────────────────────────┐      ┌──────────────────┐   │
│  │ 🔴  8  Pending Payment        │      │  Rp 12.400.000   │   │
│  │ 🟡  3  Ticket Not Sent        │      │  Verified        │   │
│  │ 🟡  1  Certificate Not Sent   │      │                  │   │
│  │ ⚪  2  Proof Without Review   │      │  Rp  3.600.000   │   │
│  │                               │      │  Pending         │   │
│  │  [ Go to Payments ]           │      └──────────────────┘   │
│  └───────────────────────────────┘                              │
│                                                                 │
│  OPERATIONAL SUMMARY                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Total   │  │ Verified │  │  Hadir   │  │  Tiket   │       │
│  │   183    │  │   171    │  │   168    │  │  Terkirim│       │
│  │ Peserta  │  │ Bayar    │  │          │  │   171    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  RECENT ACTIVITY                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Budi Santoso         Payment verified     2 min ago    │   │
│  │  Andi Wijaya          Ticket sent          5 min ago    │   │
│  │  Citra Lestari        Registered           12 min ago   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Action Inbox (Highest Priority)

**Purpose:** Immediately surface what requires human attention.

### Rules
- Items sorted by urgency: Payment Pending > Ticket Not Sent > Certificate Not Sent > Proof Unreviewed.
- Each item shows: icon + count + label + CTA button.
- If count is 0: item is shown in muted state, not hidden. ("✓ All payments verified")
- Clicking any item navigates directly to the relevant module with filter pre-applied.
- No graph, no chart in this section — only counts and actions.

### Items
| Priority | Condition | Label | CTA |
|---|---|---|---|
| 1 | Payment status = PENDING | `N Pending Payment` | Go to Payments |
| 2 | Ticket delivery = NOT_SENT | `N Ticket Not Sent` | Go to Tickets |
| 3 | Certificate delivery = NOT_SENT | `N Certificate Not Sent` | Go to Certificates |
| 4 | Proof submitted but not reviewed | `N Proof Unreviewed` | Go to Payments |

### Visual
- Red dot: requires immediate action (pending payment).
- Amber dot: should be done today (not sent).
- Grey dot: informational / low urgency.
- Green check: all clear for that category.

---

## Section 2: Revenue Summary (Top Right)

**Purpose:** One-glance financial health for the current event.

### Content
- Verified revenue (total of VERIFIED payments).
- Pending revenue (total of PENDING payments).
- Outstanding (expected total minus verified).
- No chart — numbers only with labels.
- Currency formatted: `Rp 12.400.000` (Indonesian format, no decimals).

### Rules
- Scope: current active event only.
- If event is future: show projected vs actual.
- Link: "Detail →" navigates to Revenue module.

---

## Section 3: Operational Summary (4 KPI tiles)

**Purpose:** Single-line health check across all modules.

### KPI Tiles (left to right)
| Tile | Value | Label |
|---|---|---|
| 1 | Total registrants | Peserta |
| 2 | Verified payment count | Bayar Verified |
| 3 | Attendance count | Hadir |
| 4 | Tickets delivered count | Tiket Terkirim |

### Rules
- No delta/trend arrows on dashboard (save for BI module).
- Numbers are integers, not percentages — percentages are for reports.
- Tiles are not clickable widgets with graphs — just numbers with labels.
- Tile background: plain white. No gradient, no color fill.

---

## Section 4: Recent Activity (Bottom)

**Purpose:** Show what the system has done recently so admin can orient quickly.

### Content
- Last 10 system events (across all admins).
- Columns: Participant name / Action / Actor / Time (relative).
- Compact table, no pagination — scroll to see more is acceptable.
- Link at bottom: "View full audit log →"

### Actions shown
- Registered, Payment submitted, Payment verified, Payment rejected,
  Ticket sent, Certificate generated, Certificate sent, Attendance recorded.

### Rules
- No destructive or sensitive data (no bank details, no full payment amount).
- Relative time: "2 min ago", "1 hour ago", "Yesterday".

---

## Empty State (No Active Event Selected)

```
No event selected.
[ Select Event ]
```

Single prompt, centered, no decorative elements.

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Desktop (≥1280px) | Action Inbox left, Revenue right, 4 KPI tiles, Recent Activity full width |
| Laptop (≥1024px) | Same but Revenue moves below Action Inbox |
| Tablet (≥768px) | Stack: Action Inbox → Revenue → 2×2 KPI tiles → Recent Activity |
| Mobile (<768px) | Stack: Action Inbox → Revenue → KPI 2 per row → Recent Activity (5 items) |

---

## Acceptance Criteria
- Admin can identify all pending actions within 5 seconds.
- Zero chart/graph on dashboard — data density is controlled through counts and labels.
- All 4 Action Inbox items navigate to the relevant filtered view.
- Revenue numbers are scoped to the selected event.
- Dashboard does not require scroll on desktop to see all critical information.
- Empty Action Inbox is visually calm, not alarming.
- Recent Activity never shows raw token, secret, or credential values.

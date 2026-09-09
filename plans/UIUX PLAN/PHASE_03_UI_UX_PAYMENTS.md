# Phase 3 — Payment Verification UX

## Objective
Give admins a focused, linear workspace to review, verify, or reject payment submissions
without mixing unrelated actions into the same screen.

## Primary Flow

```text
Payments page (default: Pending tab)
  ↓
Row click → Right-side Drawer opens
  ↓
Proof image visible without extra click
Nominal / bank / account / date shown
Participant identity summary shown
  ↓
[ Reject ]          [ Verify Payment ]
  ↓                       ↓
Rejection reason    Ticket status → NOT SENT
dialog (required)   Toast confirmation
  ↓                       ↓
Status → REJECTED   Remain on list, next pending
```

## Payments Page Layout

### Default View
- Tab bar: **Pending** (default) / Verified / Rejected / All
- Default tab is Pending so admin always sees what needs action.
- Pending count shown as badge on tab label.
- Table columns (priority order):
  - Participant name + package type
  - Nominal
  - Submitted at (relative time: "2 hours ago")
  - Proof indicator (icon: has proof / no proof)
  - Action: quick verify button (primary) visible inline for Pending rows only

### Sorting
- Default: oldest pending first (most urgent at top).
- Sortable by: submitted date, nominal, name.

### Filter
- By package type (INDIVIDU / MABAR).
- By date range.
- By proof status (has proof / no proof).

## Payment Drawer

### Sections (top to bottom)

**1. Identity**
Full name, email, WhatsApp, institution, city.
Package type. Ticket reference.

**2. Payment Detail**
Nominal, bank destination, submitted timestamp.
If multiple submissions exist, show history as collapsed list.

**3. Proof**
Proof image displayed inline at readable size.
[ Open Full Size ] link for detail.
If no proof: empty state — "No proof submitted yet."
Do not hide this section if empty.

**4. Actions**
Primary: [ Verify Payment ] — green, right-aligned.
Secondary: [ Reject ] — outlined, left-aligned.
Destructive phrasing avoided; use "Reject submission" not "Delete".

**5. Status Timeline**
Submitted → Under Review → Verified / Rejected.
Each step shows actor and timestamp.

## Rejection Dialog
- Triggered only by clicking Reject.
- Requires reason selection (dropdown): Wrong amount / Wrong account / Unclear proof / Duplicate / Other.
- Optional free-text note.
- Confirm button: "Reject Submission" (not "OK").
- Rejection note is stored and visible to admin in history.

## Post-Verify Behavior
- Payment status → VERIFIED.
- Ticket record → created/updated with status NOT_SENT.
- Drawer stays open, status timeline updates immediately.
- List retains current filter (Pending tab); this row disappears from Pending — next row receives focus.

## Post-Reject Behavior
- Payment status → REJECTED.
- No ticket action taken.
- Rejection reason stored with timestamp and actor.
- Drawer stays open showing Rejected state.

## Acceptance Criteria
- Admin never needs to open a separate page to verify a payment.
- Proof is visible without downloading or opening a new tab.
- Rejection always stores a reason; free-form is allowed but reason category is required.
- Verifying payment never sends a ticket automatically — delivery is a separate step.
- Pending tab is the default; admin immediately sees what needs action.
- Bulk verify is available for unambiguous batches but requires explicit count confirmation.
- Every verify/reject action is recorded in the audit log with actor, timestamp, and before/after state.

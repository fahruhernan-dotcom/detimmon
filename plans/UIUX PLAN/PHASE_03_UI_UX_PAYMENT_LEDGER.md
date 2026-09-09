# Phase 3 — Payment & Ledger UX

## Objective
Give Finance a simple, auditable payment workflow.

## Implement
- Payment Review queue.
- Payment detail drawer.
- Proof viewer entry.
- Payment ledger timeline.
- Verification confirmation.
- Adjustment workflow.
- Outstanding balance view.

## UX Rule
Never make `total_paid` or `balance_due` look like ordinary editable fields.

## Detail Layout
```text
Participant
Amount Due
Paid to Date
Balance

Payment History
Adjustment History
Proof
Audit

[Reject] [Verify Payment]
```

## Acceptance Criteria
- Finance sees pending items first.
- Verification has a clear confirmation step.
- Ledger history is visible without leaving context.
- Manual adjustments require reason.

# Phase 4 — Ticket + MABAR UX

## Objective
Make ticket issuance and group registration understandable at a glance.

## Implement
- Ticket Delivery dashboard.
- Individual ticket detail.
- MABAR group detail.
- Member list.
- QR/ticket preview.
- Send/Resend controls.

## MABAR UX
Show the group as one commercial registration with expandable members.

```text
MABAR #001 — Rp500.000
├── A — Budi — SENT
├── B — Andi — SENT
├── C — Citra — NOT SENT
└── ...
```

## Acceptance Criteria
- Ticket suffix is understandable but not treated as identity.
- Delivery state is explicit.
- Group owner and members are visually distinct.
- Bulk resend never includes successful recipients by default.

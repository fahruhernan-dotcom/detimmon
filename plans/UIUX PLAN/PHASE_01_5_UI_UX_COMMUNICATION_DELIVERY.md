# Phase 1.5 — Communication Delivery UX

## Objective
Create the operational communication workflow foundation before deeper module work.

## UX Flow
**Audience → Template → Preview → Review Recipients → Approval → Queue → Send → Monitor → Retry**

## Implement
- Communication center landing.
- Blast creation wizard.
- Audience filter builder.
- Preview state using real/sample participant data.
- Recipient review table.
- Approval confirmation.
- Queue monitor.
- Delivery status views.
- Ticket Delivery and Certificate Delivery views.
- Blast history.

## Guardrails
- Default exclude already-sent recipients.
- Explicit resend mode.
- Mass send never happens from a generic row action.
- Show counts before final approval.
- Show failed recipient reasons.

## Acceptance Criteria
- Admin can answer “who has not received a ticket?” in one screen.
- Admin can send only filtered unsent recipients.
- Admin can preview before approval.
- Failed recipients can be retried without resending successful recipients.

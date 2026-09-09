# Phase 18 — Communication Template Studio

## Objective
Provide a reusable, versioned visual editor for email communication without requiring code edits.

## Editor Choice
**Block editor**: Header / Text / Image / Button / Ticket Card / Event Info / Payment Info / Certificate Info / Voucher / Divider / Footer.

## Flow
Create/Edit → Preview → Test Email → Save Draft → Approve → Publish → Use in Blast

## Implement
- Template library.
- Visual block editor.
- Drag/reorder blocks.
- Variable picker.
- Subject editor.
- Desktop/mobile preview.
- Test email.
- Draft/testing/active/archived lifecycle.
- Template version history.
- Event-specific overrides.
- Read-only historical snapshot of the template used by each blast.

## Variables
Examples:
`{{FULL_NAME}}`, `{{EVENT_TITLE}}`, `{{EVENT_DATE}}`, `{{EVENT_TIME}}`, `{{EVENT_VENUE}}`, `{{TICKET_CODE}}`, `{{PAYMENT_STATUS}}`, `{{CERTIFICATE_NO}}`, `{{VERIFICATION_CODE}}`, `{{VOUCHER_CODE}}`.

## Critical UX Rule
The editor must never allow a user to unknowingly alter a live template. Editing creates a draft/new version.

## Acceptance Criteria
- Admin can edit a template without touching source code.
- Preview uses real/sample participant data.
- Test email is available before activation.
- Every blast can identify exactly which template version was used.
- Existing sent emails are unaffected by later template edits.

# Phase 6 — Certificate UX

## Objective
Create a controlled certificate workflow with preview, generation, Drive archive, and delivery tracking.

## Flow
Eligibility → Preview Sample → Approve → Generate → Archive to Drive → Delivery Queue → Send → Verify

## Implement
- Certificate eligibility queue.
- Sample preview.
- Bulk generation monitor.
- Certificate detail.
- Public verification.
- Delivery status.

## SVG/Canva
Support variables such as:
`{{FULL_NAME}}`, `{{CERTIFICATE_NO}}`, `{{EVENT_NAME}}`, `{{EVENT_DATE}}`, `{{VERIFICATION_CODE}}`.

## Acceptance Criteria
- Admin can preview before bulk generation.
- Each certificate records template/version metadata.
- Generated file can be opened from its Drive reference.
- Public verification is simple and mobile friendly.

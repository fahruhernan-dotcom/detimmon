# Phase 1 — UI/UX Foundation & Security Surfaces

## Objective
Build the visual application shell and secure admin entry points without redesigning business modules yet.

## Implement
- Login/authenticated shell.
- shadcn sidebar-07 shell.
- User/profile area.
- Role-aware navigation visibility.
- Event context bar.
- Global search/command placeholder.
- System status indicators.

## Acceptance Criteria
- Shell works at desktop, laptop, tablet, and mobile widths.
- Hidden modules are based on permission, not only CSS.
- Session transitions do not visually reset the app unexpectedly.
- No secret/configuration value is rendered in UI unless intentionally public.

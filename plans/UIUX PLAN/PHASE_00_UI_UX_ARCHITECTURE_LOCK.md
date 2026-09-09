# Phase 0 — UI/UX Architecture Lock

## Objective
Freeze the information architecture, navigation model, interaction rules, design tokens, and UX laws before visual implementation.

## Implement
- Adopt shadcn `sidebar-07` interaction model.
- Define global shell: sidebar + top context bar + content canvas.
- Add persistent active-event selector in the shell.
- Define page hierarchy and breadcrumb behavior.
- Define drawer, modal, confirmation, toast, table, filter, command/search, and empty-state patterns.
- Define loading/error/success states as part of the design system.
- Establish White Luxury Minimal tokens.

## Acceptance Criteria
- No page invents its own navigation pattern.
- Active event is always obvious.
- Sidebar collapses to icons without losing meaning.
- Primary/secondary/destructive actions follow one consistent hierarchy.
- A user can predict where a function lives from the IA alone.

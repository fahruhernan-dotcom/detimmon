# DIGNITY ADMIN COMMAND CENTER — UI/UX MASTER IMPLEMENTATION PLAN

## Purpose

Redesign the Dignity Admin Command Center from the current dense dashboard into a **white luxury, minimal, informative, simple executive operations system**.

The UI must prioritize decision-making and operational completion over decorative dashboard elements.

## Locked UX Direction

- Visual language: **White Luxury Minimal**.
- Base: white/off-white surfaces, dark typography, restrained Dignity-gold accent.
- Avoid excessive cards, pills, badges, borders, shadows, gradients, and competing colors.
- Typography hierarchy and whitespace carry most of the visual hierarchy.
- Primary interaction model: **See → Understand → Act → Confirm**.
- Dashboard 30-second question: **“Apa yang perlu saya tindak sekarang?”**
- Participant detail: **right-side detail panel** for quick review; full detail page only for complex workflows.
- Public registration: **Public Web → Supabase** as the primary intake. Google Form → Sheets → Supabase remains secondary/legacy.
- Communication: never send mass email blindly. Flow is **Audience → Template → Preview → Review → Approval → Queue → Send → Track → Retry**.
- Certificate: Canva/SVG template remains the design source; application injects variables and generates final files.
- Sidebar: use the visual/interaction pattern of **shadcn sidebar-07**: collapsible, icon mode, clear groups, compact header/footer, no oversized navigation footprint.

## Law of UX to Apply

- **Hick’s Law:** reduce visible choices; progressive disclosure for advanced actions.
- **Fitts’s Law:** primary actions are easy to reach and visually distinct.
- **Jakob’s Law:** use familiar table, filter, drawer, command, and settings patterns.
- **Miller’s Law:** group information; do not overload one screen.
- **Von Restorff Effect:** reserve emphasis for urgent/high-risk actions and statuses.
- **Tesler’s Law:** application absorbs workflow complexity instead of making admins manage state manually.
- **Aesthetic-Usability Effect:** polished visual restraint should improve perceived ease without reducing information density.

## Global UX Rules

1. One dominant action per screen.
2. Avoid destructive or mass actions directly beside routine actions.
3. Use side drawers for fast review; use full pages for deep work.
4. Default lists to the most actionable subset, not “everything”.
5. Always show current event context.
6. Preserve filters and scroll context after drawer close.
7. Never hide critical state only in color; pair color with text/icon.
8. Use empty states that explain the next action.
9. Every long-running action exposes progress and result.
10. Mass communication requires preview and confirmation.
11. Every sendable item exposes delivery state: Not Sent / Queued / Sending / Sent / Failed.
12. Responsive behavior must be designed, not merely inherited.

## Target Information Architecture

```text
OVERVIEW
└── Dashboard

OPERATIONS
├── Registrants
├── Payments
├── Tickets
├── Attendance
└── Certificates

COMMUNICATION
├── Blast
├── Templates
└── History

BUSINESS
├── Revenue
└── Reports

SYSTEM
├── Events
├── Settings
└── Audit
```

## Core Design System

- shadcn/ui primitives.
- Sidebar pattern based on shadcn `sidebar-07`.
- 8px spacing system.
- Large page gutters on desktop, compressed gutters on laptop/tablet.
- Radius: modest; avoid “all-cards-rounded” appearance.
- Shadows: subtle or none.
- Borders: used only to define structure.
- Status colors: sparse and semantic.
- Gold: brand accent, not a universal warning color.
- Monospace only for ticket/certificate/reference codes.
- Tables support sticky headers, keyboard-friendly actions, density modes, and predictable column priorities.

## Supplemental Specs (Read Before Implementing the Relevant Phase)

- **DASHBOARD_SPEC.md** — Action Inbox layout, KPI tiles, Revenue summary, Recent Activity, responsive rules.
- **DRAWER_ANATOMY.md** — Universal right-side drawer: all 5 sections, per-module variants, optimistic update behavior.
- **PHASE_03_UI_UX_PAYMENTS.md** — Payment verification flow, proof viewer, rejection dialog, post-verify ticket state.

## Component Strategy

Refactor existing dashboard components into feature-oriented modules. Avoid one giant `App.jsx` UI orchestrator.

```text
src/features/
├── dashboard/
├── registrants/
├── payments/
├── tickets/
├── attendance/
├── certificates/
├── communication/
├── events/
├── business/
├── reports/
├── system/
└── verify/
```


## Definition of UX Done

A phase is not complete when components merely render. It is complete when:

- primary task is understandable without training;
- critical action is discoverable within seconds;
- destructive/mass actions have clear guardrails;
- loading/empty/error/success states exist;
- desktop + laptop + mobile behavior is defined;
- accessibility basics are respected;
- no duplicate control performs the same action with different wording;
- data-heavy pages remain readable at realistic volumes;
- user never loses context after closing a drawer/modal;
- the design remains visually consistent with White Luxury Minimal.

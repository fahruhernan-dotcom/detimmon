# AI Builder Handoff — Dignity UI/UX Redesign

## Non-Negotiable Direction

Redesign the current UI substantially. Do not perform a cosmetic recolor of the existing dashboard.

### Visual Target
- White luxury minimal.
- Informative but calm.
- Premium executive feel.
- Strong typography hierarchy.
- Large whitespace.
- Sparse borders.
- Restrained use of gold as brand accent.
- Avoid dashboard-template clutter.

### Navigation
Use the interaction model of **shadcn `sidebar-07`** with these groups:

```text
OVERVIEW
Dashboard

OPERATIONS
Registrants
Payments
Tickets
Attendance
Certificates

COMMUNICATION
Blast
Templates
History

BUSINESS
Revenue
Reports

SYSTEM
Events
Settings
Audit
```

### Core UX
- Dashboard answers “what needs action now?”.
- Registrant row opens a right-side detail drawer.
- Deep workflows may open full pages.
- Keep event context persistent.
- Do not put every action into one dense table.
- Use progressive disclosure.

### Communication
Never implement a one-click blind blast.

```text
Audience
→ Template
→ Preview
→ Review Recipients
→ Approval
→ Queue
→ Send
→ Track
→ Retry
```

Default audience excludes recipients already sent successfully.

### Public Registration
Primary: public web registration → Supabase.
Secondary/legacy: Google Form → Sheets → Supabase.

### Certificate
Use client-provided Canva/SVG design with dynamic variables. Store generated certificate files in Google Drive. Expose generation and delivery status in the admin UI.

### Implementation Discipline
- Build feature modules rather than expanding a giant `App.jsx`.
- Reuse common patterns instead of bespoke screens.
- Do not hardcode one event into layouts.
- Do not invent duplicate navigation items.
- Do not hide critical states only by color.
- Every async/mass operation must expose progress/result/error.

## Delivery Order
Execute the phase markdown files in order. Before changing an existing feature, preserve its business logic unless the phase explicitly changes its UX/flow.

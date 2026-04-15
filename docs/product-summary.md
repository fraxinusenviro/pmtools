# PMTools — One-Page Product Summary

---

## What Is It?

**PMTools** is a browser-based project management application for teams that need more than a spreadsheet but less than enterprise software. It runs entirely in the browser with no installation, no server, and no subscription. Project data is stored locally and can be exported as JSON for backup or sharing.

---

## Who Is It For?

- Small-to-medium project teams (5–50 people)
- Freelancers and consultants managing client engagements
- Engineering teams who want Gantt + critical path without the overhead of MS Project or Primavera
- Organizations with a limited budget for tooling

---

## What Problem Does It Solve?

Most PM tools are either too lightweight (Trello, Basecamp — no Gantt, no scheduling engine) or too heavy and expensive (MS Project, Smartsheet — steep learning curve, enterprise pricing). PMTools targets the gap: a capable scheduling tool with critical path analysis, resource management, and budget tracking, delivered as a fast, browser-native single-page app.

---

## Core Capabilities (MVP)

| Capability | What the user gets |
|---|---|
| **Work Breakdown Structure** | Hierarchical task list with inline editing; indent/outdent; WBS numbering |
| **Auto-scheduling** | Finish-to-Start dependencies drive bar positions; dates auto-update on change |
| **Gantt Chart** | Interactive SVG Gantt; drag bars to reschedule; critical path in red |
| **Critical Path Method** | Full CPM engine (forward/backward pass, float calculation) |
| **Progress Tracking** | % complete per task; weighted rollup to summary tasks and project level |
| **Resource Assignment** | Assign people to tasks; view load by person; over-allocation warnings |
| **Budget Tracking** | Planned vs. actual cost per task; burn chart; over-budget flags |
| **Calendar View** | Month calendar showing task chips and milestones |
| **Reports & Export** | Status report with narrative fields; CSV, PDF, and JSON export |
| **No login required** | Data lives in your browser; export JSON for backup |

---

## How It Works (30-Second Version)

1. Create a project with a start date, end date, and budget.
2. Add tasks in the WBS table — set durations and drag-connect them as a dependency chain.
3. Open the Gantt tab — bars auto-position, critical path highlights in red.
4. Update % complete as work proceeds — the project health gauge rolls up automatically.
5. Enter actual costs in the Budget tab — see the burn curve against your plan.
6. Export a PDF status report when stakeholders ask for an update.

---

## Technology

React 18 + TypeScript, Vite, Zustand, TanStack Table, Recharts, custom SVG Gantt. Runs in any modern browser. Static deployment (no server). ~300KB gzipped bundle target.

---

## Key Differentiators

- **No signup, no server** — zero friction to start; data is yours
- **Real CPM scheduling** — not just date fields; actual forward/backward pass with float
- **Gantt that works** — draggable bars, dependency arrows, critical path highlight
- **Portable** — JSON export/import for backup and team sharing
- **Extensible** — clean architecture designed for Phase 2 collaboration features

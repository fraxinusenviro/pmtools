# Prioritized Feature List, MVP Scope, and Future Iteration Prompts

---

## 1. Prioritized Feature List

### Must Have (MVP — blocks launch without these)

| # | Feature | Rationale |
|---|---|---|
| M-01 | Create / edit / delete projects | Core data model |
| M-02 | Task table with hierarchy (WBS) | Primary work entry surface |
| M-03 | Add / edit / delete tasks and milestones | Task lifecycle management |
| M-04 | Indent / outdent tasks (subtask tree) | Hierarchical WBS structure |
| M-05 | Finish-to-Start dependencies | Foundational dependency type |
| M-06 | Scheduling engine (forward/backward pass, float) | Core product differentiator |
| M-07 | Critical path identification and Gantt highlight | Reason users choose PM tools |
| M-08 | Gantt chart with bars and today line | Visual timeline — top user demand |
| M-09 | Drag-to-move and drag-to-resize Gantt bars | Intuitive schedule adjustment |
| M-10 | Dependency arrows on Gantt | Visualize task relationships |
| M-11 | % complete tracking with summary rollup | Progress visibility |
| M-12 | Project % complete (weighted rollup) | Health gauge on overview |
| M-13 | Resource assignment (person → task) | Basic team planning |
| M-14 | Planned vs. actual budget per task | Financial tracking |
| M-15 | Project overview page (summary dashboard) | Stakeholder-facing summary |
| M-16 | CSV export (task list) | Interoperability; user data ownership |
| M-17 | JSON export/import (full backup) | Data portability |
| M-18 | Status report form with PDF export | Stakeholder reporting |
| M-19 | Calendar view (month, read-only) | Date-context view |
| M-20 | localStorage persistence | Data survives page refresh |
| M-21 | Cycle detection (guard against circular deps) | Safety for scheduling engine |
| M-22 | Seed data on first launch | Demo-ready out of the box |

---

### Should Have (Phase 2 — high value, not blocking MVP)

| # | Feature | Rationale |
|---|---|---|
| S-01 | All dependency types (FF, SS, SF) with lag/lead | Needed for complex real-world schedules |
| S-02 | Baseline snapshots (freeze + compare) | Variance reporting vs. original plan |
| S-03 | Schedule variance display on Gantt (ghost bars) | Key PM analysis capability |
| S-04 | Working calendar editor (holidays, non-working days) | Needed for accurate working-day math |
| S-05 | Auto vs. manual schedule mode toggle per task | Flex for project managers |
| S-06 | Over-allocation warnings on resource cards | Staffing health check |
| S-07 | Resource load bar chart by week | Visual capacity planning |
| S-08 | Budget burn chart (cumulative planned vs. actual) | Financial trajectory |
| S-09 | Budget categories (labor/materials/travel/other) | Cost breakdown analysis |
| S-10 | Critical path report (tabular) | Exportable critical path analysis |
| S-11 | Task constraint types (SNET, MFO, MSO) | Hard scheduling constraints |
| S-12 | Gantt PNG/SVG export | Shareable timeline image |
| S-13 | Task notes / description field | Context for task detail |
| S-14 | Task status dropdown (Not Started / In Progress / Complete / On Hold) | Status tracking beyond % |
| S-15 | IndexedDB persistence (via Dexie) for large projects | Scale beyond localStorage limits |
| S-16 | Dark mode | User preference |

---

### Nice to Have (Phase 3–5 — future expansion)

| # | Feature | Rationale |
|---|---|---|
| N-01 | Earned Value Management (CPI, SPI, EAC) | Advanced financial controls |
| N-02 | Resource leveling suggestions | Automated over-allocation resolution |
| N-03 | Multi-user auth (Supabase) | Collaboration for Phase 4 |
| N-04 | Real-time collaborative editing | Team concurrent use |
| N-05 | Comments and @mentions on tasks | Communication thread |
| N-06 | Activity log (audit trail) | Change history |
| N-07 | Portfolio dashboard (multi-project rollup) | Program management |
| N-08 | MS Project XML import | Enterprise migration path |
| N-09 | iCal export | Calendar app integration |
| N-10 | Risk register | Risk management module |
| N-11 | AI-assisted status report generation | Productivity feature |
| N-12 | Role-based access control (Owner/Editor/Viewer) | Enterprise access model |
| N-13 | Notification emails | Async team updates |
| N-14 | Budget approval workflow stubs | Finance integration hooks |
| N-15 | Jira / Linear integration | Dev team workflow integration |

---

## 2. Recommended MVP Scope

The MVP should be **demonstration-ready and genuinely useful** for a single user managing one or two projects. It does not require collaboration, cloud sync, or advanced financial analysis.

### Included in MVP
- Full task table with WBS hierarchy (indent/outdent, milestones, inline editing)
- Scheduling engine: FS-only dependencies, forward/backward pass, critical path
- Gantt chart: bars, today line, dependency arrows, drag-to-move/resize, zoom
- Critical path highlighted in red on Gantt
- % complete tracking with weighted rollup to project level
- Project overview page: health gauge, milestone list, team avatars, budget summary
- Basic resource assignment: person → task
- Budget: planned vs. actual cost per task; over-budget flag
- Calendar view: read-only month grid with task chips
- Status report: form-based with narrative fields
- Exports: CSV (tasks), JSON (full backup/restore), PDF (status report via browser print)
- Data persistence: localStorage with JSON import/export
- Seed data: two demo projects visible on first launch
- Cycle detection with error feedback

### Explicitly Excluded from MVP
- All dependency types except FS
- Baseline snapshots
- Resource load bars / over-allocation detection
- Working calendar customization (holidays)
- Earned Value Management
- Multi-user / auth / cloud sync
- MS Project import
- Mobile-optimized Gantt

**MVP size target:** ~8 weeks of development (see Build Plan for sprint breakdown)

---

## 3. Suggested Prompts for Future Iterations

Use these prompts in future development sessions to expand the app phase by phase.

### Phase 2: Enhanced Scheduling

```
Implement all four dependency types (FS, FF, SS, SF) with lag/lead support
in the scheduling engine. Update the scheduler.ts forward/backward pass logic,
add UI for selecting dependency type and lag in the predecessor editor,
and write unit tests covering each type. Also add working calendar
customization: a holidays editor in Project Settings that excludes specific
dates from working day calculations.
```

```
Add baseline snapshot functionality. When the user clicks "Set Baseline" in
Project Overview, freeze a copy of all task planned dates and budget amounts
into a Baseline object. Show baseline ghost bars behind actual bars on the Gantt.
Add a "Baseline vs. Actual" column pair to the Task Table showing schedule variance
in days.
```

### Phase 2: Gantt Polish

```
Add row virtualization to the Gantt chart so it renders smoothly with 500+ tasks.
The current approach renders all rows in the SVG. Switch to a windowed rendering
approach using the viewport scroll position to only render visible rows + a buffer.
```

```
Add a "link creation mode" to the Gantt: when the user hovers over a task bar
end handle and drags to another bar, create a new FS dependency. Show a live
preview arrow during the drag. On drop, validate no cycle is created before
committing the dependency.
```

### Phase 3: Resource Depth

```
Build the resource histogram chart on the Resources tab. For each resource, compute
their daily allocation as a percentage of capacity across all tasks for the next
12 weeks. Render a stacked bar chart (Recharts) showing allocation by week.
Highlight bars in red where over-allocated. Add a simple leveling suggestion:
identify tasks that could be delayed (have float > 0) to resolve the conflict.
```

```
Implement Earned Value Management. Add EV, PV, AC, CPI, SPI, EAC, and VAC
calculations to budgetCalculator.ts. Display these metrics on the Budget tab
in a summary table. Write unit tests against a known EVM example (use the
standard PMI EVM formulas).
```

### Phase 4: Collaboration

```
Add Supabase integration for multi-user support. Replace the localStorage
persistence middleware with a Supabase sync adapter. Implement email/password
auth with a Login page. Scope all data reads/writes to the authenticated user.
Projects should support inviting collaborators by email with viewer or editor
roles. Keep the local-first data model intact so the app still works offline
and syncs when reconnected.
```

### Phase 5: Advanced

```
Build an MS Project XML importer. MS Project exports a .mpp file as XML via
File > Save As > XML. Parse the XML to extract tasks, dependencies (predecessors),
resources, and assignments. Map them to our AppStore data model and import as a
new project. Handle the main edge cases: summary tasks, milestones, all four
dependency types, lag values, and resource cost rates.
```

```
Add AI-powered status report generation using the Claude API. When the user
clicks "Generate Draft" on the Status Report form, send the current project
state (% complete, schedule variance, budget variance, overdue tasks, upcoming
milestones) as context to the Claude API and request a draft narrative for each
section (scope, schedule, budget, risks, next steps). Let the user edit before
saving. Cache the last generated draft per report date.
```

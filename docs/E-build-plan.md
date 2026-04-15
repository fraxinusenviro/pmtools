# E. Build Plan — Phased Implementation

---

## Assumptions
- Small team (1–3 developers).
- Each sprint = 1 week.
- MVP target = ~8 weeks of development.
- TypeScript + React + Vite is agreed upon (see Technical Spec).

---

## Phase 1 — MVP (Weeks 1–8)

### Sprint 1: Project Foundation
**Goal:** Running app shell with navigation, routing, and a project CRUD form.

- [ ] Initialize Vite + React + TypeScript project (`npm create vite`)
- [ ] Configure Tailwind CSS, shadcn/ui, ESLint, Prettier
- [ ] Set up React Router v6 with placeholder pages for all routes
- [ ] Implement Zustand store with `projectSlice` and localStorage persistence middleware
- [ ] Build: Dashboard page — project card list, "+ New Project" modal
- [ ] Build: Project create/edit form (name, dates, budget, description)
- [ ] Build: Project sidebar navigation
- [ ] Build: Global top bar with project picker dropdown
- [ ] Write tests: project CRUD actions in store

**Deliverable:** You can create projects and navigate between placeholder tabs.

---

### Sprint 2: Task Table (WBS)
**Goal:** Full task editing in a spreadsheet-style table.

- [ ] Implement `taskSlice` and `dependencySlice` in Zustand
- [ ] Build TanStack Table wrapper with inline-editable cells
- [ ] Support: add task, add subtask, add milestone, delete task
- [ ] Support: indent/outdent (reparent task in hierarchy)
- [ ] Implement WBS number auto-generation from tree structure
- [ ] Row drag-and-drop for reordering (same parent)
- [ ] Columns: Name, Duration, Status, % Complete, Assignee picker, Predecessors, Budget, Actual
- [ ] Implement `progressCalculator.ts` — leaf % rollup to summary tasks
- [ ] Keyboard navigation: Tab between cells, Enter to next row
- [ ] Write tests: hierarchy rollup, WBS numbering

**Deliverable:** You can build a full task list with hierarchy.

---

### Sprint 3: Scheduling Engine + Gantt Foundation
**Goal:** Auto-scheduling works; basic Gantt bars render.

- [ ] Implement `cycleDetector.ts` — Kahn's topological sort
- [ ] Implement `scheduler.ts` — forward pass, backward pass, float, critical path
- [ ] Integrate scheduler into `scheduleSlice`; recompute triggered on task/dependency change (debounced 300ms)
- [ ] Implement `dateUtils.ts` — working day arithmetic using date-fns
- [ ] Build: Gantt SVG container with scrollable two-panel layout
- [ ] Build: `GanttGrid.tsx` — time axis, header (month / week), vertical lines
- [ ] Build: `GanttBar.tsx` — colored bars per task, positioned by earlyStart/earlyFinish
- [ ] Build: `GanttMilestone.tsx` — diamond at date
- [ ] Build: Today line
- [ ] Write tests: scheduler forward/backward pass, float calculation, cycle detection

**Deliverable:** Tasks auto-schedule from dependencies; bars appear on Gantt.

---

### Sprint 4: Gantt Interactions + Dependency Arrows
**Goal:** Gantt is interactive; dependencies visible.

- [ ] Implement `useGanttDrag.ts` — drag-to-move (shifts start/end), drag right edge to resize
- [ ] Dispatch `updateTask` on drop; reschedule fires
- [ ] Build: `GanttDependencyArrow.tsx` — SVG cubic Bezier path from predecessor finish to successor start
- [ ] Critical path arrows in red; other arrows in grey
- [ ] Zoom controls (day/week/month/quarter), scroll to today
- [ ] Task row hover tooltip (name, dates, %, assignee)
- [ ] Click task → Task Detail slide-over panel (read-only for now)
- [ ] Gantt left panel sync with right panel vertical scroll
- [ ] Write tests: drag date calculation, dependency arrow coordinate math

**Deliverable:** Fully interactive Gantt with working drag and dependency arrows.

---

### Sprint 5: Resources + Assignments
**Goal:** Users can assign people to tasks and see workload.

- [ ] Implement `resourceSlice` and `assignmentSlice`
- [ ] Build: Resource management page — add/edit/delete resources
- [ ] Resource picker popover in Task Table (assignee column)
- [ ] Build: `ResourceList.tsx` — cards per person with total allocation %
- [ ] Build: `LoadBar.tsx` — per-person allocation bar (green → red at 100%)
- [ ] Build: Assignment list table (per task: who, %, effort)
- [ ] Implement `useResourceLoad.ts` — compute daily allocation by aggregating assignments
- [ ] Over-allocation warning badge on resource cards
- [ ] Write tests: allocation percentage calculation

**Deliverable:** You can assign people to tasks and see if anyone is over-allocated.

---

### Sprint 6: Budget
**Goal:** Budget tracking fully works with burn chart.

- [ ] Implement `budgetSlice` (budget lines, actual cost entries)
- [ ] Build: Budget tab layout — summary cards + table
- [ ] Inline edit actual cost cells in task table and budget table
- [ ] Implement `budgetCalculator.ts` — totals, variance, per-task
- [ ] Build: `BurnChart.tsx` — Recharts line chart (planned vs. actual spend by month)
- [ ] Over-budget flag (>105%): red highlight on summary card and budget rows
- [ ] Write tests: budget rollup, variance calculation

**Deliverable:** Budget planned vs. actual tracked with visual burn chart.

---

### Sprint 7: Reports, Calendar, and Project Overview
**Goal:** All remaining views working; app feels complete.

- [ ] Build: Project Overview page — summary gauges, milestone list, budget donut, team avatars
- [ ] Build: Calendar view — month grid, task chips on finish dates, milestone diamonds
- [ ] Build: Reports page — left picker + right preview
- [ ] Build: Status Report form (narrative fields + auto-populated tables)
- [ ] Build: Critical Path report view (table of critical tasks)
- [ ] Build: `ProjectHealthBadge.tsx` (RAG badge, auto-computed from schedule/budget)
- [ ] Write tests: health badge logic (green/amber/red rules)

**Deliverable:** All main views are functional.

---

### Sprint 8: Export, Polish, Seed Data, and Deployment
**Goal:** Ship-ready MVP deployed to Vercel.

- [ ] Implement `exportCsv.ts` — task list CSV via PapaParse
- [ ] Implement `exportJson.ts` — full project JSON backup/restore
- [ ] Implement `exportPdf.ts` — status report PDF via jsPDF + html2canvas
- [ ] Implement Gantt PNG export (serialize SVG → canvas → PNG download)
- [ ] Add `seedData.ts` with 2 demo projects for first-run experience
- [ ] Import/export JSON flow in Settings page
- [ ] Responsive layout adjustments (tablet/mobile)
- [ ] Error boundary component for graceful failures
- [ ] Load seed data on first launch (if store is empty)
- [ ] GitHub Actions CI: lint + test + build
- [ ] Deploy to Vercel; verify all routes work

**Deliverable:** MVP shipped and deployed.

---

## Phase 2 — Enhanced Scheduling (Weeks 9–14)

- [ ] All dependency types: FF, SS, SF (update scheduler to handle type-based date rules)
- [ ] Lag/lead support (positive/negative day offset on dependencies)
- [ ] Baseline snapshots: freeze, compare, ghost bars on Gantt
- [ ] Schedule variance display (against baseline)
- [ ] Working calendar editor (pick holidays, custom non-working days)
- [ ] Auto-schedule vs. manual toggle per task
- [ ] Drag-and-drop row reordering across hierarchy levels
- [ ] Task constraint types (SNET, SNLT, MFO, MSO)
- [ ] Migrate localStorage to IndexedDB (Dexie.js) for projects with 200+ tasks

---

## Phase 3 — Resource & Budget Depth (Weeks 15–20)

- [ ] Resource capacity calendar (vacation, part-time schedules)
- [ ] Over-allocation leveling (manual drag suggestions)
- [ ] Earned Value Management: EV, PV, AC, CPI, SPI, EAC, VAC
- [ ] Budget categories with approval stub
- [ ] Cost breakdown by category (pie/bar chart)
- [ ] Resource histogram chart (stacked bar by week)
- [ ] Multi-project resource view (Phase 3)

---

## Phase 4 — Collaboration & Cloud (Weeks 21–30)

- [ ] Supabase integration: auth (email/password + Google)
- [ ] Postgres persistence replacing localStorage
- [ ] Real-time updates (Supabase Realtime channels)
- [ ] Task comments with @mentions
- [ ] Activity log (who changed what, when)
- [ ] Notification system (in-app + email stubs)
- [ ] Role-based access: Owner, Editor, Viewer per project
- [ ] Shareable read-only project link

---

## Phase 5 — Advanced (Weeks 31+)

- [ ] Portfolio / program view (roll up multiple projects)
- [ ] MS Project XML import parser
- [ ] iCal export for task deadlines
- [ ] Risk register (probability × impact matrix)
- [ ] AI-assisted status report generation (via Claude API)
- [ ] Jira / Linear integration stubs

---

## Critical Path of the Build Plan Itself

```
Sprint 1 (Foundation)
  → Sprint 2 (Tasks)
    → Sprint 3 (Scheduler + Gantt Foundation)
      → Sprint 4 (Gantt Interactions)   ─── can parallelize with Sprint 5
      → Sprint 5 (Resources)
      → Sprint 6 (Budget)
    → Sprint 7 (Reports + Calendar + Overview)
      → Sprint 8 (Export + Deploy)
```

Sprints 4, 5, and 6 can be partially parallelized with one developer on Gantt interactions and another on Resources/Budget.

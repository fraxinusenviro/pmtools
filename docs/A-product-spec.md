# A. Product Specification

## App Name: PMTools — Browser-Based Project Management Suite

---

## 1. User Goals

| Persona | Primary Goal |
|---|---|
| **Project Manager** | Plan projects with tasks, dependencies, and timelines; track schedule health; report to stakeholders |
| **Team Lead** | Assign work to team members, view workload distribution, flag blockers |
| **Executive / Sponsor** | See high-level status, budget burn, milestone progress at a glance |
| **Individual Contributor** | Know what they own, when it's due, and what's blocking them |

---

## 2. Primary Workflows

1. **Project Setup** — Create a project, define start/end dates, add team members, set a budget.
2. **Work Breakdown** — Add tasks/subtasks in a hierarchical list; set durations, assignees, and dependencies.
3. **Scheduling** — View timeline on a Gantt chart; drag bars to adjust dates; auto-schedule from dependencies.
4. **Progress Tracking** — Mark tasks complete or partial; system recalculates project % complete and schedule variance.
5. **Resource Management** — Assign resources (people or roles) to tasks; view load by person; spot over-allocation.
6. **Budget Tracking** — Enter planned vs. actual cost; view burn rate; compare to baseline.
7. **Reporting** — Generate status report snapshots; view critical path; export to PDF or CSV.
8. **Calendar View** — See tasks laid out by week/month on a calendar to understand daily commitments.

---

## 3. Major Screens

| Screen | Purpose |
|---|---|
| **Dashboard / Home** | Portfolio overview — all projects, status indicators, upcoming milestones |
| **Project Overview** | Single project summary: health, key dates, budget donut, milestone list |
| **Task Table (WBS)** | Editable spreadsheet-style list of all tasks with inline editing |
| **Gantt Chart** | Timeline bars per task, dependency arrows, critical path highlight, today line |
| **Calendar** | Month/week calendar with task chips on due dates |
| **Budget** | Planned vs. actual cost table; burn chart; cost breakdown by category |
| **Resources** | Team member cards; per-person workload bar; over-allocation warnings |
| **Reports** | Status report builder; export controls |
| **Settings** | Project settings (name, dates, team), app preferences |

---

## 4. Domain Entities

| Entity | Description |
|---|---|
| **Project** | Top-level container with name, dates, budget, status, and team |
| **Task** | Unit of work with duration, assignee, dates, completion %, dependencies |
| **Milestone** | Zero-duration task marking a key event; appears as diamond on Gantt |
| **Dependency** | Directed link between tasks defining sequencing (FS, FF, SS, SF types) |
| **Resource** | A person or role that can be assigned to tasks with a daily capacity |
| **Assignment** | Link between Resource and Task with hours/effort allocated |
| **Budget Line** | A planned cost item scoped to a task or category |
| **Actual Cost** | Recorded actual spend tied to a budget line or task |
| **Baseline** | A frozen snapshot of the schedule and budget for variance comparison |
| **Status Report** | A timestamped project health snapshot with narrative fields |

---

## 5. Business Rules

1. A task's **Earliest Start** = latest Finish date of all predecessor tasks (respecting lag).
2. A task with no predecessors inherits the project start date as its Earliest Start.
3. **Total Float** = Late Start − Early Start. Tasks with Float = 0 are on the **Critical Path**.
4. **% Complete** of a summary/parent task = weighted average of child task % completes, weighted by duration.
5. **Project % Complete** = weighted average of all leaf task completions weighted by planned duration.
6. A task cannot start before its earliest start unless the user explicitly overrides (hard constraint).
7. **Budget** burn = sum of all actual costs entered; over-budget flag fires when actuals > 105% of planned.
8. A **Milestone** has duration = 0 and cannot have effort or cost assigned directly.
9. Resources cannot exceed 100% allocation on a single day unless explicitly allowed per-project.
10. Deleting a task removes all its outgoing and incoming dependency links.

---

## 6. Scheduling Logic

### Forward Pass (Early dates)
```
for each task in topological order:
  earlyStart = max(predecessor.earlyFinish + lag) or projectStart
  earlyFinish = earlyStart + duration (skipping non-working days)
```

### Backward Pass (Late dates)
```
for each task in reverse topological order:
  lateFinish = min(successor.lateStart - lag) or projectEnd
  lateStart = lateFinish - duration
```

### Float
```
totalFloat = lateStart - earlyStart
freeFloat  = min(successor.earlyStart) - earlyFinish
```

### Critical Path
A task is critical when `totalFloat <= 0`.

### Working Calendar
- Default: Mon–Fri, no weekends.
- Holidays: optional array of excluded dates per project.
- Duration units: **days** (MVP), hours in future phase.
- When computing finish from start+duration, skip non-working days.

### Lag / Lead
- Lag: positive integer days added to dependency gap.
- Lead: negative lag (task can start before predecessor finishes).

---

## 7. Progress Calculation Logic

```
leafCompletion(t)       = t.percentComplete  (0–100, user-entered)
summaryCompletion(t)    = Σ(child.duration × leafCompletion(child)) / Σ(child.duration)
projectCompletion       = summaryCompletion(rootTasks)

scheduleVariance(t)     = earnedValue(t) - plannedValue(t)
earnedValue(t)          = t.budgetAtCompletion × (t.percentComplete / 100)
plannedValue(t)         = budgetAtCompletion × (plannedPercent at statusDate)
```

---

## 8. Critical Path Assumptions

- Only **Finish-to-Start (FS)** dependencies are required for MVP; FF, SS, SF are supported data-structurally but not auto-scheduled until Phase 2.
- Critical path is recomputed on every schedule change (debounced 300ms in UI).
- If the project has no explicit end date constraint, the critical path end = the latest early-finish of any leaf task.
- Circular dependency detection is performed before every recalculation; if a cycle is found, the user is shown an error and the offending link is highlighted.

---

## 9. Reporting Capabilities

| Report | Contents |
|---|---|
| **Status Report** | Date, overall RAG status, narrative (scope/schedule/budget/risks), milestone table, % complete |
| **Gantt Snapshot** | Print/export-ready Gantt image or PDF |
| **Budget Report** | Planned vs. actual table, variance columns, burn chart |
| **Resource Report** | Per-person allocation by week; over-allocation flag |
| **Critical Path Report** | List of critical tasks, float values, driving predecessors |
| **Task Export** | Full task list with all fields |

---

## 10. Export Formats

| Format | Contents |
|---|---|
| **CSV** | Task list with all fields (ID, name, start, finish, duration, %, assignee, predecessors, cost) |
| **PDF** | Status report with narrative and Gantt screenshot (via browser print/canvas) |
| **PNG/SVG** | Gantt chart image exported from canvas/SVG rendering |
| **JSON** | Full project data for backup/restore |

---

## 11. MVP vs Future-Phase Features

### MVP (Phase 1)
- Create/edit projects and tasks
- Gantt chart with drag-to-adjust bars
- Finish-to-Start dependency arrows
- Critical path highlighting
- % complete tracking, project rollup
- Basic budget (planned vs. actual per task)
- Resource assignment (person → task)
- CSV and JSON export
- Status report (form-based, exportable to PDF via browser print)
- Calendar view (month, read-only)
- Local storage persistence

### Phase 2 — Enhanced Scheduling
- All dependency types (FF, SS, SF) with lag/lead
- Baseline snapshots and variance reporting
- Working calendar customization (holidays)
- Auto-schedule / manual schedule toggle per task
- Drag-and-drop task reordering in WBS

### Phase 3 — Resource & Budget Depth
- Resource capacity calendar (days-off, part-time)
- Over-allocation leveling suggestions
- Earned Value Management (CPI, SPI, EAC)
- Budget categories and approval workflow stubs
- Cost breakdown by phase/category chart

### Phase 4 — Collaboration & Cloud
- Multi-user with user auth (Supabase or Firebase)
- Real-time collaborative editing
- Comments and @mentions on tasks
- Notification emails
- Cloud sync and offline mode

### Phase 5 — Advanced
- Program/portfolio rollup across projects
- MS Project import (XML)
- iCal export
- Risk register
- Automated status report generation via AI

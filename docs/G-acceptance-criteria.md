# G. Acceptance Criteria

Each criterion is testable: either via automated unit/integration test or via a defined manual test procedure.

---

## Module 1: Project Management

### AC-PM-01: Create a project
- **Given** the user is on the Dashboard
- **When** they click "+ New Project" and fill in: name, start date, end date, budget
- **Then** the project appears on the Dashboard with the correct name, a green status badge, 0% complete, and the entered budget

### AC-PM-02: Edit a project
- **Given** a project exists
- **When** the user opens Project Settings and changes the name and end date, then saves
- **Then** the Dashboard card and all project headers reflect the new name and date

### AC-PM-03: Delete a project
- **Given** a project exists
- **When** the user clicks "Delete Project" in Settings and confirms
- **Then** the project is removed from the Dashboard and all its tasks, dependencies, resources, and assignments are removed from the store

### AC-PM-04: Persist across page refresh
- **Given** a project with tasks has been created
- **When** the browser is hard-refreshed (F5)
- **Then** all projects, tasks, and assignments are still present and unchanged

---

## Module 2: Task Table (WBS)

### AC-WBS-01: Add and edit tasks
- **Given** a project is open on the Tasks tab
- **When** the user clicks "+ Add Task" and types a name, duration, and start date
- **Then** a new row appears with the correct WBS number and the task is stored

### AC-WBS-02: Task hierarchy (subtasks)
- **Given** a parent task exists
- **When** the user adds a subtask under it
- **Then** the parent task becomes bold (summary), the subtask is indented one level, and the WBS number is e.g. "1.1"

### AC-WBS-03: Indent and outdent
- **Given** a task at WBS level 1.2
- **When** the user selects it and clicks Indent
- **Then** it becomes a child of the task above it (WBS 1.1.1) and WBS numbers update

### AC-WBS-04: % Complete rollup
- **Given** a parent task has two children: child A at 50% (3 day duration), child B at 100% (1 day duration)
- **When** the parent row is viewed
- **Then** the parent's % complete = (3×50 + 1×100) / (3+1) = 62.5%, rounded to nearest integer: 63%

### AC-WBS-05: Milestone
- **Given** the user adds a milestone
- **Then** its duration cell is locked at 0, the row type shows "milestone", and the task cannot have effort assigned

### AC-WBS-06: Delete task removes dependencies
- **Given** task B depends on task A
- **When** task A is deleted
- **Then** task B's predecessors field is empty and the dependency no longer appears on the Gantt

---

## Module 3: Scheduling Engine

### AC-SCH-01: Forward pass — simple chain
- **Given** tasks A (3 days), B (2 days) with dependency A→B (FS), project start 2024-01-02 (Monday)
- **When** schedule is computed
- **Then** A earlyStart=2024-01-02, earlyFinish=2024-01-04 (3 working days); B earlyStart=2024-01-05, earlyFinish=2024-01-08 (skipping weekend: Fri Jan 5 → Mon Jan 8 finish)

  *Precise calculation:*
  - A: Jan 2 (Mon), Jan 3 (Tue), Jan 4 (Wed) → earlyFinish = Jan 4
  - B: starts Jan 5 (Thu), runs Thu+Fri = 2 days → earlyFinish = Jan 8 (Mon, skipping weekend)
  - Wait: Jan 5 and Jan 8 — Jan 5 is Thu, Jan 6 is Fri (day 2) → earlyFinish = Jan 6.
  
  *Corrected: B starts Jan 5 (Thu), 2 working days: Jan 5 + Jan 6 → earlyFinish = Jan 6.*

### AC-SCH-02: Critical path identification
- **Given** a network with a critical path (longest path) through tasks A→B→C and a parallel path A→D→C where D has 5 days of float
- **When** the schedule is computed
- **Then** A, B, C are marked `isCritical: true`; D is marked `isCritical: false` with `totalFloat: 5`

### AC-SCH-03: Cycle detection
- **Given** tasks A, B, C with dependencies A→B, B→C, C→A (cycle)
- **When** the scheduler runs
- **Then** it throws a `CycleDetectedError` and does NOT update the schedule; the UI shows an error banner identifying the cycle

### AC-SCH-04: Working day arithmetic
- **Given** a task that starts Friday 2024-01-05 with duration 3 days
- **When** the scheduler computes earlyFinish
- **Then** earlyFinish = Wednesday 2024-01-10 (Fri + Mon + Tue = 3 working days)

### AC-SCH-05: Project with no dependencies
- **Given** all tasks have no predecessors
- **Then** all tasks get earlyStart = project start date; critical path includes only the longest-duration task chain

### AC-SCH-06: Scheduler recomputes on change
- **Given** task A has a duration of 3 days and task B depends on A
- **When** the user edits task A's duration to 5 days
- **Then** within 300ms, task B's earlyStart shifts by 2 days and the Gantt bars reposition

---

## Module 4: Gantt Chart

### AC-GANTT-01: Bars render at correct positions
- **Given** a project with scheduled tasks
- **When** the Gantt tab is opened
- **Then** each task bar's left edge aligns with earlyStart and right edge aligns with earlyFinish on the timeline

### AC-GANTT-02: Critical path highlight
- **Given** the schedule has been computed with a critical path
- **When** the Gantt is displayed
- **Then** critical task bars are red; non-critical bars are blue (or status color)

### AC-GANTT-03: Drag to move task
- **Given** a task bar in auto-schedule mode
- **When** the user drags it 3 days to the right
- **Then** the task's plannedStart updates +3 working days; the schedule recomputes; all successor bars shift accordingly

### AC-GANTT-04: Drag to resize
- **Given** a task bar with duration 5 days
- **When** the user drags the right edge 2 days to the right
- **Then** the task duration becomes 7 days; successors shift accordingly

### AC-GANTT-05: Dependency arrow rendering
- **Given** task A precedes task B (FS dependency)
- **When** the Gantt is displayed
- **Then** an arrow is drawn from the right edge of A's bar to the left edge of B's bar

### AC-GANTT-06: Zoom controls
- **Given** the Gantt is at Week zoom
- **When** the user clicks Zoom In
- **Then** the view switches to Day zoom; column width increases; the same date range is still visible near the scroll position

### AC-GANTT-07: Today line
- **Given** today's date falls within the project date range
- **When** the Gantt is displayed
- **Then** a vertical line appears at today's date position labeled "Today"

---

## Module 5: Resource Management

### AC-RES-01: Assign resource to task
- **Given** a resource "Alice" exists in the project
- **When** the user assigns Alice to task T1 at 100% allocation
- **Then** the assignment appears in the Resources tab under Alice; Alice's total allocation includes T1's dates

### AC-RES-02: Over-allocation warning
- **Given** Alice is assigned 100% to task T1 (Jan 1–5) and 100% to task T2 (Jan 3–7) which overlap
- **When** the Resources tab is viewed
- **Then** Alice's load bar exceeds 100% for Jan 3–5 and shows red; an over-allocation warning badge appears on her card

### AC-RES-03: Remove assignment
- **Given** Alice is assigned to task T1
- **When** the user removes the assignment
- **Then** Alice no longer appears as assignee on T1; her load bar updates

---

## Module 6: Budget

### AC-BUD-01: Budget line creation
- **Given** a project with a planned budget of $10,000
- **When** the user adds a budget line "Labor" of $6,000 to task T1
- **Then** the budget table shows task T1 with $6,000 planned; project total budget card shows ≥ $6,000

### AC-BUD-02: Actual cost entry
- **Given** task T1 has a planned budget of $5,000
- **When** the user enters $3,000 as actual cost
- **Then** the variance column shows $2,000 positive variance; the burn chart reflects the new actual

### AC-BUD-03: Over-budget flag
- **Given** the project has a total budget of $10,000
- **When** the total actual costs exceed $10,500 (105% threshold)
- **Then** the budget summary card turns red; the project health badge turns amber or red

### AC-BUD-04: Burn chart accuracy
- **Given** costs are entered across multiple months
- **When** the burn chart is viewed
- **Then** the actual spend line plots each month's cumulative actual costs correctly

---

## Module 7: Reports and Export

### AC-REP-01: Status report saves and loads
- **Given** the user fills in a status report with RAG = Amber and narrative text
- **When** they save and then refresh the page
- **Then** the status report is visible in Reports with all narrative fields intact

### AC-REP-02: CSV export
- **Given** a project with 5 tasks
- **When** the user exports the task list as CSV
- **Then** a `.csv` file downloads with one row per task, headers matching the Task Table columns, and all values correctly serialized (no data corruption, dates in YYYY-MM-DD format)

### AC-REP-03: JSON export and import
- **Given** a project with tasks, dependencies, and resources
- **When** the user exports to JSON and then imports that JSON on a fresh app instance
- **Then** all projects, tasks, dependencies, and resources are restored exactly (IDs preserved)

### AC-REP-04: PDF status report
- **Given** a status report with narrative and milestone snapshot
- **When** the user clicks "Export PDF"
- **Then** a PDF file downloads containing: report date, RAG status, all narrative sections, and the milestone table (no blank pages, no JavaScript errors)

### AC-REP-05: Gantt PNG export
- **Given** the Gantt is displaying tasks with dependency arrows
- **When** the user clicks "Export PNG"
- **Then** a PNG image downloads showing the visible portion of the Gantt (bars, arrows, grid, today line), at minimum 1x resolution

---

## Module 8: Calendar View

### AC-CAL-01: Tasks appear on correct dates
- **Given** task T1 finishes on 2024-03-15
- **When** the Calendar is on March 2024
- **Then** a chip for T1 appears in the March 15 cell

### AC-CAL-02: Milestone appears as diamond
- **Given** a milestone on 2024-04-01
- **When** the Calendar is on April 2024
- **Then** a diamond icon appears in the April 1 cell (distinct from regular task chips)

---

## Module 9: Data Persistence and Migration

### AC-DATA-01: Schema version check
- **Given** localStorage contains data from schema version 1
- **When** the app is loaded with schema version 2 code
- **Then** the migration function runs and upgrades the data without data loss (as per migration guide)

### AC-DATA-02: Graceful empty state
- **Given** localStorage is empty (first launch)
- **When** the app loads
- **Then** seed data is loaded automatically and 2 demo projects are visible on the Dashboard

### AC-DATA-03: Corrupt data recovery
- **Given** localStorage contains malformed JSON
- **When** the app loads
- **Then** an error boundary catches the failure; the user is shown a "Reset App" option; no crash/white screen

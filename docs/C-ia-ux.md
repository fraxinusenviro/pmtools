# C. Information Architecture and UX Structure

---

## 1. Navigation Model

The app uses a **two-level navigation** structure:

- **Level 1 — Global sidebar:** Switches between the portfolio Dashboard and individual projects; houses app-level Settings.
- **Level 2 — Project tab bar:** Once inside a project, a horizontal tab bar provides access to all project views.

Users move linearly through their mental model: Dashboard → select project → work within project using tabs.

```
┌─────────────────────────────────────────────────────────┐
│ [PMTools]  [Projects ▾]                      [Settings] │  ← Top nav
├──────────┬──────────────────────────────────────────────┤
│          │ Overview │ Tasks │ Gantt │ Calendar │         │  ← Project tabs
│ Sidebar  │ Budget   │ Resources │ Reports    │          │
│          │                                              │
│ Project  │                                              │
│ list     │         Main content area                    │
│          │                                              │
│ + New    │                                              │
│ Project  │                                              │
└──────────┴──────────────────────────────────────────────┘
```

---

## 2. Main Screens

### 2.1 Dashboard / Home (`/`)

**Layout:** Card grid (3 columns on desktop, 1 on mobile)

**Contents per card:**
- Project name + status badge (RAG: green/amber/red)
- Overall % complete (progress bar)
- Next milestone + date
- Days until end / overdue indicator
- Budget health icon

**Actions:**
- Click card → open project Overview tab
- "+ New Project" button → Project create modal

---

### 2.2 Project Overview (`/projects/:id/overview`)

**Layout:** Two-column split

**Left column:**
- Project name, description, sponsor
- Date range (planned start → end)
- Overall % complete (large gauge or progress ring)
- Schedule variance badge

**Right column:**
- Budget donut chart (planned vs. actual)
- Key milestones list with status chips
- Team member avatars

**Actions:**
- Edit button → inline edit mode for project metadata
- "Baseline" button → freeze current schedule as baseline

---

### 2.3 Task Table / WBS (`/projects/:id/tasks`)

**Layout:** Full-width editable table, left-to-right scroll for extra columns

**Columns (left to right):**
1. # (WBS number, auto-generated)
2. Name (editable, indentable for hierarchy)
3. Duration (editable input, days)
4. Start (computed or manual date)
5. Finish (computed or manual date)
6. % Complete (editable progress input)
7. Assignee (resource picker)
8. Predecessors (dependency picker — comma list of task IDs)
9. Budget (editable number)
10. Actual Cost (editable number)
11. Status (dropdown: Not Started / In Progress / Complete / On Hold)

**Toolbar:**
- Add Task / Add Subtask / Add Milestone
- Indent / Outdent
- Delete
- Column visibility toggle

**Interactions:**
- Click any cell → inline edit
- Enter key → save and move to next row
- Tab → move to next cell
- Drag handle on row left edge → reorder (within siblings)
- Right-click row → context menu (add subtask, delete, set constraint)

---

### 2.4 Gantt Chart (`/projects/:id/gantt`)

**Layout:** Resizable split: left WBS list (~35%) + right SVG timeline (~65%)

**Timeline features:**
- Header: two rows (months top, weeks/days bottom depending on zoom)
- Today vertical line (blue)
- Task bars: color-coded by status; red on critical path
- Milestone diamonds
- Dependency arrows (grey for normal, red for critical path links)
- Baseline ghost bars (muted, behind actual bars — when baseline exists)

**Controls (toolbar):**
- Zoom in / Zoom out / Fit to project
- Show/hide: dependencies, critical path, baseline, resource labels
- Scroll to today
- Export Gantt (PNG, PDF)

**Interactions:**
- Drag bar left/right → move task dates
- Drag right edge of bar → extend/shrink duration
- Drag from task bar end → drag to another bar to create dependency
- Click task name in left panel → open Task Detail slide-over
- Hover bar → tooltip with name, dates, %, assignee

---

### 2.5 Calendar View (`/projects/:id/calendar`)

**Layout:** Standard month calendar grid

**Contents:**
- Task chips on their finish date (color by assignee or status)
- Milestone diamonds on milestone dates
- Week number column on far left

**Controls:**
- Previous/Next month navigation
- Toggle: show tasks / show milestones only
- Click chip → Task Detail slide-over

**MVP note:** Calendar is read-only; tasks are not created or edited here in Phase 1.

---

### 2.6 Budget (`/projects/:id/budget`)

**Layout:** Top charts + bottom table

**Top section:**
- Summary cards: Total Budget, Total Actual, Variance, Burn %
- Burn chart (Recharts line: planned spend curve vs. actual spend by month)

**Bottom section — table columns:**
1. Task name
2. Category (Labor / Materials / Travel / Other)
3. Planned cost
4. Actual cost
5. Variance ($ and %)
6. EV / SPI (Phase 2)

**Actions:**
- Click any Actual Cost cell → inline edit
- Add budget line (top-level category lines)
- Export to CSV

---

### 2.7 Resources (`/projects/:id/resources`)

**Layout:** Top team grid + bottom assignment table

**Top section:**
- Resource cards (avatar, name, role, total allocation %)
- Allocation bar per person (fills green up to 100%, red beyond)

**Bottom section — assignment list:**
- Task name | Resource | Effort (hours) | Start | Finish | Allocation %

**Actions:**
- Add resource to project
- Click resource card → filter assignment list to that person
- Click task link → jump to task in Task Table

---

### 2.8 Reports (`/projects/:id/reports`)

**Layout:** Left picker + right preview

**Left — report picker:**
- Status Report
- Critical Path Report
- Budget Report
- Resource Load Report
- Gantt Snapshot

**Right — live preview:**
- Renders the selected report
- Export button (PDF, CSV, or PNG depending on report type)

**Status Report fields:**
- Report date
- Overall RAG status (dropdown)
- Narrative: Scope health, Schedule health, Budget health, Risks, Next steps
- Auto-populated milestone table
- Auto-populated % complete

---

### 2.9 App Settings (`/settings`)

- Default working days (checkboxes Mon–Sun)
- Default hours per day
- Theme (light / dark)
- Data: Export all projects (JSON), Import from JSON, Clear all data

---

## 3. Modal and Dialog Patterns

| Trigger | Pattern |
|---|---|
| "+ New Project" | **Full modal** with form: name, description, start date, end date, budget |
| Task detail (click from Gantt/Calendar) | **Slide-over panel** (right side, 400px wide) — shows all task fields, notes, dependencies |
| Add dependency | **Inline modal** — predecessor picker with search |
| Delete task/project | **Confirmation dialog** (small modal) |
| Baseline snapshot | **Confirmation dialog** with name field |
| Export | **Inline dropdown menu** — no modal needed for simple exports |
| Import JSON | **File picker dialog** |
| Resource picker (in task row) | **Popover dropdown** with avatar list |

---

## 4. Key User Interaction Flows

### Flow 1: Create a Project and First Tasks
1. Dashboard → click "+ New Project"
2. Fill in project modal → Submit → redirected to **Tasks tab**
3. Click "+ Add Task" → type task name in first empty row
4. Press Tab to fill duration, assignee, etc.
5. Press Enter to create next task

### Flow 2: Build a Gantt with Dependencies
1. Task Table: add tasks, set durations
2. In Predecessors column, type predecessor task IDs (e.g., "1, 2")
3. Switch to **Gantt tab** → bars auto-position from dependencies
4. Critical path highlighted in red
5. Drag bars to adjust manually if needed

### Flow 3: Track Progress
1. Task Table: update "% Complete" for each task as work proceeds
2. Project Overview: rollup gauge updates automatically
3. Reports tab: generate Status Report, update narrative, export PDF

### Flow 4: Check Budget
1. Budget tab: review planned vs. actual column
2. Click actual cost cells to enter spend
3. Burn chart shows trajectory
4. Over-budget tasks highlighted in red

### Flow 5: Export and Share
1. Reports tab → select "Gantt Snapshot" → Export PNG
2. Reports tab → select "Status Report" → Export PDF (browser print dialog)
3. Task Table toolbar → Export CSV

---

## 5. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| ≥ 1280px (desktop) | Full two-panel layouts; sidebar always visible |
| 768–1279px (tablet) | Sidebar collapses to icon rail; Gantt scrollable |
| < 768px (mobile) | Single column; Gantt tab replaced with "Gantt not available on mobile" message; tables scroll horizontally |

---

## 6. Color and Status Conventions

| Status | Color |
|---|---|
| Not Started | Grey |
| In Progress | Blue |
| Complete | Green |
| On Hold | Orange |
| Critical Path | Red |
| Over Budget | Red |
| Milestone | Purple diamond |
| Baseline ghost bar | Light grey, dashed border |

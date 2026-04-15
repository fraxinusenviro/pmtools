# F. File and Folder Structure

---

## Top-Level Layout

```
pmtools/
├── public/
│   ├── favicon.ico
│   └── og-image.png
├── src/
│   ├── components/         # Reusable UI components (no page logic)
│   ├── pages/              # Route-level page components
│   ├── engine/             # Pure scheduling / calculation logic (no React)
│   ├── store/              # Zustand store slices
│   ├── export/             # CSV / PDF / JSON export utilities
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript interfaces (single source of truth)
│   ├── utils/              # Pure utility functions (dates, IDs, etc.)
│   ├── seed/               # Demo data loader
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/                   # Project documentation (this folder)
├── .github/
│   └── workflows/
│       └── ci.yml          # Lint + test + build
├── .eslintrc.json
├── .prettierrc
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

---

## Detailed Source Tree

```
src/
├── App.tsx                          # Router setup, providers, error boundary
├── main.tsx                         # ReactDOM.createRoot entry point
├── index.css                        # Tailwind directives + global overrides
│
├── types/
│   └── index.ts                     # All exported TypeScript interfaces (single file)
│                                    # (Split into domain files if file grows > 400 lines)
│
├── utils/
│   ├── dateUtils.ts                 # addWorkingDays, diffWorkingDays, isWorkingDay
│   ├── idGenerator.ts               # generateId() wrapping nanoid
│   ├── constants.ts                 # DEFAULT_WORKING_DAYS, ROW_HEIGHT, etc.
│   ├── wbsUtils.ts                  # Generate WBS numbers from tree
│   └── colorUtils.ts                # Status → color mapping
│
├── engine/
│   ├── scheduler.ts                 # Forward pass, backward pass, float, critical path
│   ├── scheduler.test.ts            # Unit tests for scheduling logic
│   ├── cycleDetector.ts             # Topological sort (Kahn's algorithm), cycle detection
│   ├── cycleDetector.test.ts
│   ├── progressCalculator.ts        # Weighted rollup of % complete up the tree
│   ├── progressCalculator.test.ts
│   ├── budgetCalculator.ts          # EV, PV, CPI, SPI, variance
│   └── budgetCalculator.test.ts
│
├── store/
│   ├── index.ts                     # Combined useStore hook (Zustand create)
│   ├── projectSlice.ts              # Project CRUD + activeProjectId
│   ├── taskSlice.ts                 # Task CRUD, reorder, indent/outdent
│   ├── dependencySlice.ts           # Dependency CRUD, cycle guard
│   ├── resourceSlice.ts             # Resource CRUD
│   ├── assignmentSlice.ts           # Assignment CRUD
│   ├── budgetSlice.ts               # BudgetLine and ActualCostEntry CRUD
│   ├── baselineSlice.ts             # Baseline snapshot create/read
│   ├── statusReportSlice.ts         # Status report create/update
│   ├── scheduleSlice.ts             # Derived: ScheduledTask map, recompute()
│   └── uiSlice.ts                   # ganttZoom, ganttScrollDate, selectedTaskIds
│
├── hooks/
│   ├── useSchedule.ts               # Returns scheduleSlice data for current project
│   ├── useProjectTasks.ts           # Returns ordered task tree for a project
│   ├── useResourceLoad.ts           # Computes per-day load per resource
│   ├── useBudgetSummary.ts          # Aggregated budget stats for a project
│   └── useExport.ts                 # Triggers CSV/JSON/PDF export flows
│
├── export/
│   ├── exportCsv.ts                 # PapaParse serialization
│   ├── exportJson.ts                # JSON.stringify full project
│   └── exportPdf.ts                 # jsPDF + html2canvas
│
├── seed/
│   └── seedData.ts                  # Two complete demo projects with tasks/deps/resources
│
├── components/
│   │
│   ├── ui/                          # shadcn/ui generated components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx                # Slide-over panel (for Task Detail)
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── tooltip.tsx
│   │
│   ├── shared/
│   │   ├── ProjectHealthBadge.tsx   # RAG badge: green/amber/red chip
│   │   ├── ProgressRing.tsx         # SVG ring progress indicator
│   │   ├── ProgressBar.tsx          # Horizontal progress bar
│   │   ├── DatePicker.tsx           # shadcn Popover wrapping a calendar input
│   │   ├── ResourceAvatar.tsx       # Avatar circle with initials fallback
│   │   ├── EmptyState.tsx           # Illustration + CTA for empty views
│   │   └── ConfirmDialog.tsx        # Reusable "Are you sure?" modal
│   │
│   ├── layout/
│   │   ├── AppShell.tsx             # Top nav + sidebar + main content area
│   │   ├── Sidebar.tsx              # Project list nav
│   │   ├── ProjectTabBar.tsx        # Tab bar: Overview | Tasks | Gantt | ...
│   │   └── TopBar.tsx               # Logo, project picker, settings link
│   │
│   ├── dashboard/
│   │   ├── ProjectCard.tsx          # Summary card on dashboard grid
│   │   └── NewProjectModal.tsx      # Create project form modal
│   │
│   ├── overview/
│   │   ├── ProjectSummaryPanel.tsx  # Left column: name, dates, % complete ring
│   │   ├── BudgetDonut.tsx          # Recharts PieChart: planned vs. actual
│   │   ├── MilestoneList.tsx        # Milestone rows with status chips
│   │   └── TeamAvatarGroup.tsx      # Row of resource avatars
│   │
│   ├── task-table/
│   │   ├── TaskTable.tsx            # TanStack Table wrapper (full WBS table)
│   │   ├── TaskRow.tsx              # Single row with inline editing
│   │   ├── TaskNameCell.tsx         # Indented name cell with expand/collapse
│   │   ├── TaskIndentControls.tsx   # Indent / outdent toolbar buttons
│   │   ├── PredecessorCell.tsx      # Comma-list editor with task search popover
│   │   ├── AssigneeCell.tsx         # Resource picker popover
│   │   ├── columns.tsx              # TanStack column definitions
│   │   └── TaskTableToolbar.tsx     # Add task/subtask/milestone, delete, export
│   │
│   ├── gantt/
│   │   ├── GanttPage.tsx            # Outer container with toolbar
│   │   ├── GanttChart.tsx           # Two-panel split: name list + SVG timeline
│   │   ├── GanttGrid.tsx            # Header (months/weeks), vertical grid lines
│   │   ├── GanttBar.tsx             # Task bar rect, drag handles
│   │   ├── GanttMilestone.tsx       # Diamond shape
│   │   ├── GanttDependencyArrow.tsx # SVG path with arrowhead
│   │   ├── GanttTodayLine.tsx       # Vertical blue today indicator
│   │   ├── GanttToolbar.tsx         # Zoom, export, toggles
│   │   ├── GanttTaskList.tsx        # Left panel: indented task names (synced scroll)
│   │   ├── TaskDetailSheet.tsx      # Slide-over with full task details
│   │   └── useGanttDrag.ts          # Drag state machine hook
│   │
│   ├── calendar/
│   │   ├── ProjectCalendar.tsx      # Month grid
│   │   ├── CalendarDay.tsx          # Single day cell with task chips
│   │   └── TaskChip.tsx             # Colored chip showing task name
│   │
│   ├── budget/
│   │   ├── BudgetSummaryCards.tsx   # Total / Actual / Variance / Burn % cards
│   │   ├── BudgetTable.tsx          # Task-level planned vs. actual table
│   │   ├── BurnChart.tsx            # Recharts line chart
│   │   └── AddBudgetLineModal.tsx
│   │
│   ├── resources/
│   │   ├── ResourceList.tsx         # Cards grid
│   │   ├── ResourceCard.tsx         # Per-person card with load bar
│   │   ├── LoadBar.tsx              # Allocation % bar
│   │   ├── AssignmentTable.tsx      # Full list of assignments
│   │   └── AddResourceModal.tsx
│   │
│   └── reports/
│       ├── ReportsLayout.tsx        # Left picker + right preview
│       ├── StatusReportForm.tsx     # Narrative fields form
│       ├── StatusReportPreview.tsx  # Printable view of status report
│       ├── CriticalPathReport.tsx   # Table of critical tasks
│       ├── BudgetReport.tsx         # Variance report view
│       └── ExportControls.tsx       # PDF / CSV / PNG export buttons
│
└── pages/
    ├── DashboardPage.tsx
    ├── ProjectShell.tsx             # Wraps all /projects/:id/* routes with tab bar
    ├── ProjectOverviewPage.tsx
    ├── TaskTablePage.tsx
    ├── GanttPage.tsx
    ├── CalendarPage.tsx
    ├── BudgetPage.tsx
    ├── ResourcesPage.tsx
    ├── ReportsPage.tsx
    └── AppSettingsPage.tsx
```

---

## Configuration Files

```
.github/workflows/ci.yml
  - on: push / pull_request
  - jobs: lint (eslint), test (vitest --run), build (vite build)

vite.config.ts
  - plugins: [react()]
  - test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' }

tsconfig.json
  - target: ES2020
  - lib: [ES2020, DOM, DOM.Iterable]
  - strict: true
  - paths: { "@/*": ["./src/*"] }  // path alias for clean imports

.eslintrc.json
  - extends: [eslint:recommended, plugin:@typescript-eslint/recommended, plugin:react-hooks/recommended]
```

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Component file | PascalCase.tsx | `GanttBar.tsx` |
| Hook file | camelCase.ts (use prefix) | `useGanttDrag.ts` |
| Utility/pure module | camelCase.ts | `dateUtils.ts` |
| Store slice | camelCase + Slice suffix | `taskSlice.ts` |
| Test file | co-located, `.test.ts` | `scheduler.test.ts` |
| CSS module | ComponentName.module.css | (prefer Tailwind; modules only for Gantt SVG) |
| Constants | SCREAMING_SNAKE_CASE in `constants.ts` | `DEFAULT_ROW_HEIGHT` |

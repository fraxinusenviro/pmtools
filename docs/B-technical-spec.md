# B. Technical Specification

---

## 1. Technology Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React 18 + TypeScript** | Dominant ecosystem; hooks-first; excellent typing |
| Build Tool | **Vite** | Fast HMR, zero-config TypeScript, easy SVG/worker imports |
| State Management | **Zustand** | Minimal boilerplate; supports slices; easy persistence middleware |
| Routing | **React Router v6** | File-friendly nested routing |
| UI Components | **shadcn/ui** (Radix primitives + Tailwind CSS) | Accessible, unstyled base + utility classes |
| Tables | **TanStack Table v8** | Headless, virtual rows, sorting/filtering |
| Charts | **Recharts** | React-native charts for budget burn, resource load |
| Gantt/Timeline | **Custom SVG renderer** (in-house) | Full control over layout, dependencies, drag |
| Date Handling | **date-fns** | Immutable, tree-shakeable, no timezone surprises |
| Export — CSV | **papaparse** | Battle-tested CSV serialization |
| Export — PDF | **jsPDF + html2canvas** | Browser-native; captures DOM/canvas for Gantt |
| Export — JSON | Native `JSON.stringify` | No library needed |
| Persistence | **localStorage** (MVP) → IndexedDB via **Dexie.js** (Phase 2) | localStorage for simplicity; Dexie for large data |
| Testing | **Vitest + React Testing Library** | Fast, Vite-native, RTL for component tests |
| Linting | **ESLint + Prettier** | Standard setup |

---

## 2. Frontend Architecture

```
App
├── Router (React Router v6)
│   ├── /                        → DashboardPage
│   ├── /projects/new            → ProjectCreatePage
│   ├── /projects/:id            → ProjectShell (layout with tabs)
│   │   ├── overview             → ProjectOverviewPage
│   │   ├── tasks                → TaskTablePage
│   │   ├── gantt                → GanttPage
│   │   ├── calendar             → CalendarPage
│   │   ├── budget               → BudgetPage
│   │   ├── resources            → ResourcesPage
│   │   └── reports              → ReportsPage
│   └── /settings                → AppSettingsPage
└── Providers
    ├── ThemeProvider (light/dark)
    ├── ToastProvider
    └── StoreProvider (Zustand)
```

### Key Architectural Decisions

1. **Single-page app** with client-side routing. No server required for MVP.
2. **Zustand stores** are organized by domain slice (projects, tasks, resources, ui).
3. **Scheduling engine** runs in a plain TypeScript module (`engine/scheduler.ts`) with no React dependencies — pure function, easily testable.
4. **Computed values** (critical path, project % complete, float) are derived in Zustand selectors, never stored redundantly.
5. **Gantt SVG component** owns its own internal state for viewport (scroll offset, zoom level) but reads task/dependency data from the store.
6. The app is **statically deployable** (Vercel, Netlify, GitHub Pages) — no backend required for Phase 1.

---

## 3. State Management Approach

### Zustand Store Slices

```typescript
// store/projectSlice.ts
interface ProjectSlice {
  projects: Record<string, Project>;
  activeProjectId: string | null;
  createProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, changes: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
}

// store/taskSlice.ts
interface TaskSlice {
  tasks: Record<string, Task>;         // keyed by task id
  createTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, changes: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTask: (id: string, newParentId: string | null, newIndex: number) => void;
}

// store/dependencySlice.ts
interface DependencySlice {
  dependencies: Record<string, Dependency>;
  addDependency: (dep: Omit<Dependency, 'id'>) => void;
  removeDependency: (id: string) => void;
}

// store/resourceSlice.ts
interface ResourceSlice {
  resources: Record<string, Resource>;
  assignments: Record<string, Assignment>;
  // ...CRUD actions
}

// store/scheduleSlice.ts (computed, not persisted)
interface ScheduleSlice {
  schedule: Record<string, ScheduledTask>; // earlyStart/finish, lateStart/finish, float, isCritical
  recompute: (projectId: string) => void;
}

// store/uiSlice.ts
interface UISlice {
  ganttZoom: number;           // pixels per day
  ganttScrollDate: string;     // ISO date of left edge
  selectedTaskIds: string[];
  sidebarOpen: boolean;
}
```

### Persistence Middleware
```typescript
// Zustand persist middleware writes entire store to localStorage on change
// Key: 'pmtools-store-v1'
// On startup: hydrate from localStorage; then run scheduler.recompute() for each project
```

---

## 4. Persistence Strategy

| Phase | Storage | Details |
|---|---|---|
| MVP | `localStorage` | Entire store JSON, ~5MB limit, sufficient for dozens of small projects |
| Phase 2 | `IndexedDB` via Dexie.js | Handles large task counts (1000+); stores tasks, projects, attachments separately |
| Phase 3 | Optional Supabase | Postgres + realtime; auth via Supabase Auth; add when multi-user needed |

**Schema versioning:** A `schemaVersion` field in the root store object enables migration functions when the data model changes.

**Backup:** Users can export the full store as JSON and re-import it. This is the primary backup/migration path for MVP.

---

## 5. Component Structure

```
src/
├── components/
│   ├── gantt/
│   │   ├── GanttChart.tsx          # SVG container, zoom/scroll
│   │   ├── GanttGrid.tsx           # Time axis + vertical grid lines
│   │   ├── GanttBar.tsx            # Single task bar (draggable)
│   │   ├── GanttMilestone.tsx      # Diamond shape at finish date
│   │   ├── GanttDependencyArrow.tsx # SVG path between bars
│   │   ├── GanttTodayLine.tsx      # Vertical "today" indicator
│   │   └── useGanttDrag.ts         # Drag-to-resize/move hook
│   ├── task-table/
│   │   ├── TaskTable.tsx           # TanStack Table wrapper
│   │   ├── TaskRow.tsx             # Inline-editable row
│   │   ├── TaskIndentControls.tsx  # Indent/outdent for hierarchy
│   │   └── columns.tsx             # Column definitions
│   ├── budget/
│   │   ├── BudgetTable.tsx
│   │   └── BurnChart.tsx           # Recharts line chart
│   ├── resources/
│   │   ├── ResourceList.tsx
│   │   └── LoadBar.tsx             # Per-person allocation bar
│   ├── reports/
│   │   ├── StatusReportForm.tsx
│   │   └── CriticalPathTable.tsx
│   ├── calendar/
│   │   └── ProjectCalendar.tsx     # Month grid with task chips
│   ├── ui/                         # shadcn/ui components (Button, Modal, etc.)
│   └── shared/
│       ├── ProjectHealthBadge.tsx  # RAG indicator
│       ├── ProgressBar.tsx
│       └── DatePicker.tsx
├── pages/
│   ├── DashboardPage.tsx
│   ├── ProjectShell.tsx
│   ├── ProjectOverviewPage.tsx
│   ├── TaskTablePage.tsx
│   ├── GanttPage.tsx
│   ├── CalendarPage.tsx
│   ├── BudgetPage.tsx
│   ├── ResourcesPage.tsx
│   └── ReportsPage.tsx
├── engine/
│   ├── scheduler.ts               # Forward/backward pass, critical path
│   ├── scheduler.test.ts
│   ├── cycleDetector.ts           # Topological sort + cycle check
│   ├── progressCalculator.ts      # Rollup % complete
│   └── budgetCalculator.ts        # EV calculations
├── store/
│   ├── index.ts                   # Combined store
│   ├── projectSlice.ts
│   ├── taskSlice.ts
│   ├── dependencySlice.ts
│   ├── resourceSlice.ts
│   ├── scheduleSlice.ts
│   └── uiSlice.ts
├── export/
│   ├── exportCsv.ts
│   ├── exportJson.ts
│   └── exportPdf.ts
├── hooks/
│   ├── useSchedule.ts
│   ├── useProjectTasks.ts
│   └── useResourceLoad.ts
├── types/
│   └── index.ts                   # All TypeScript interfaces
├── utils/
│   ├── dateUtils.ts               # Working-day arithmetic using date-fns
│   ├── idGenerator.ts             # nanoid wrapper
│   └── constants.ts
└── seed/
    └── seedData.ts                # Demo data
```

---

## 6. Gantt/Timeline Rendering Approach

### Design Principles
- Rendered as a **single SVG element** inside a scrollable container.
- Two-panel layout: **left panel** (task name list, fixed) + **right panel** (timeline SVG, scrollable horizontally).
- Left panel is a plain HTML div synchronized in scroll with the SVG right panel.

### Coordinate System
```
x = (date - viewportStartDate) * pixelsPerDay
y = taskIndex * rowHeight + rowPadding
```

### Zoom Levels
| Level | Pixels/Day | Column Header |
|---|---|---|
| Day | 40 | Day number |
| Week | 20 | Week number |
| Month | 6 | Month name |
| Quarter | 2 | Quarter label |

### Bar Dragging
- `mousedown` on a bar sets drag state: `{ taskId, dragType: 'move' | 'resize-left' | 'resize-right', startX, originalStart, originalEnd }`.
- `mousemove` computes delta pixels → delta days → candidate new dates.
- On `mouseup`, dispatch `updateTask` with snapped dates (round to nearest day).
- Drag causes `recompute()` to fire (debounced 300ms).

### Dependency Arrows
- Computed as SVG `<path>` elements with cubic Bezier curves.
- Source: right edge of predecessor bar; Target: left edge of successor bar.
- Critical path arrows rendered in red; others in grey.

---

## 7. Dependency Engine Logic

```typescript
// engine/scheduler.ts

export function computeSchedule(
  tasks: Task[],
  deps: Dependency[],
  projectStart: Date,
  holidays: Date[] = []
): Record<string, ScheduledTask> {

  // 1. Build adjacency list
  // 2. Topological sort (Kahn's algorithm) — abort with error if cycle detected
  // 3. Forward pass: compute earlyStart / earlyFinish
  // 4. Backward pass: compute lateStart / lateFinish
  // 5. Compute totalFloat and freeFloat
  // 6. Mark critical tasks (float <= 0)
  // 7. Return map of taskId → ScheduledDates
}

function addWorkingDays(start: Date, days: number, holidays: Date[]): Date {
  // Iterate day by day, skip weekends and holidays
}
```

### Topological Sort (Kahn's Algorithm)
1. Build in-degree map for all tasks.
2. Initialize queue with tasks having in-degree 0.
3. While queue non-empty: pop task, add to sorted list, decrement successors' in-degrees, enqueue any that reach 0.
4. If sorted list length < task count → cycle detected.

### Manual vs. Auto-Schedule
- Each task has a `schedulingMode: 'auto' | 'manual'` flag.
- Manual tasks have their `plannedStart` used as a hard constraint; the scheduler respects it even if predecessors finish later (but shows a warning).

---

## 8. Budget Model

```
Budget structure per project:
  budgetTotal          = sum of all task.budgetAmount
  actualTotal          = sum of all task.actualCost recorded

Per task:
  budgetAtCompletion   = task.budgetAmount
  earnedValue          = budgetAtCompletion * (percentComplete / 100)
  plannedValue         = budgetAtCompletion * (plannedPercentAtStatusDate / 100)
  costVariance         = earnedValue - actualCost
  scheduleVariance     = earnedValue - plannedValue
  CPI                  = earnedValue / actualCost
  SPI                  = earnedValue / plannedValue

Health flags:
  - Over budget:     actualTotal > budgetTotal * 1.05
  - At risk:         actualTotal > budgetTotal * 0.85 AND completion < 80%
  - On track:        otherwise
```

Budget entries are stored as `BudgetLine[]` per task, allowing multiple cost categories (labor, materials, travel, etc.).

---

## 9. Export Pipeline

### CSV Export
```typescript
import Papa from 'papaparse';
const rows = tasks.map(t => ({ id, name, start, finish, duration, pct, assignee, ... }));
const csv = Papa.unparse(rows);
downloadBlob(csv, 'tasks.csv', 'text/csv');
```

### JSON Export
```typescript
const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
downloadBlob(blob, 'project-backup.json');
```

### PDF Export (Status Report)
```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// 1. Render StatusReportView into a hidden DOM node
// 2. html2canvas captures it as a canvas
// 3. jsPDF embeds the canvas image
// 4. For Gantt: capture the SVG viewport, embed as PNG in PDF
```

### PNG/SVG Gantt Export
```typescript
// SVG element: serialize to string, create Blob, trigger download
// PNG: draw SVG to offscreen canvas using drawImage or canvg, then toDataURL('image/png')
```

---

## 10. Deployment Approach

### MVP (Static)
- `npm run build` → `dist/` folder of static files.
- Deploy to **Vercel** (drag-and-drop or GitHub integration), **Netlify**, or **GitHub Pages**.
- No server, no database — entirely client-side.
- CI: GitHub Actions runs `npm test && npm run build` on every push.

### Phase 2 (Optional Backend)
- Add **Supabase** for PostgreSQL persistence and auth.
- Keep the app mostly the same; swap the Zustand persistence middleware for a Supabase sync adapter.
- Still deployable to Vercel/Netlify.

### Environment Config
```
VITE_APP_VERSION=1.0.0
VITE_SUPABASE_URL=...        # only needed in Phase 2+
VITE_SUPABASE_ANON_KEY=...   # only needed in Phase 2+
```

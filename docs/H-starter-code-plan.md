# H. Starter Code Plan — Stack, Libraries, and Implementation Order

---

## 1. Recommended Stack

### Core Framework
| Library | Version | Purpose |
|---|---|---|
| `react` | 18.x | UI framework |
| `react-dom` | 18.x | DOM rendering |
| `typescript` | 5.x | Type safety |
| `vite` | 5.x | Build tool + dev server |
| `react-router-dom` | 6.x | Client-side routing |

### State and Persistence
| Library | Version | Purpose |
|---|---|---|
| `zustand` | 4.x | Global state management |
| `zustand/middleware` | (bundled) | `persist` middleware for localStorage |

### UI and Styling
| Library | Version | Purpose |
|---|---|---|
| `tailwindcss` | 3.x | Utility-first CSS |
| `@tailwindcss/typography` | 0.5.x | Prose styles for reports |
| `@radix-ui/react-*` | latest | Headless accessible primitives (via shadcn) |
| `shadcn/ui` | (CLI-generated) | Pre-built accessible components |
| `lucide-react` | latest | Icon library |
| `class-variance-authority` | latest | Variant classnames (used by shadcn) |
| `clsx` + `tailwind-merge` | latest | Conditional classname utilities |

### Tables
| Library | Version | Purpose |
|---|---|---|
| `@tanstack/react-table` | 8.x | Headless, performant, virtualization-ready |

### Charts
| Library | Version | Purpose |
|---|---|---|
| `recharts` | 2.x | React-native SVG charts (burn, donut, load) |

### Date Handling
| Library | Version | Purpose |
|---|---|---|
| `date-fns` | 3.x | Immutable date math, working day arithmetic |

### IDs
| Library | Version | Purpose |
|---|---|---|
| `nanoid` | 5.x | Tiny, URL-safe unique IDs |

### Export
| Library | Version | Purpose |
|---|---|---|
| `papaparse` | 5.x | CSV serialization/parsing |
| `jspdf` | 2.x | PDF generation |
| `html2canvas` | 1.x | DOM → Canvas capture for PDF embedding |

### Testing
| Library | Version | Purpose |
|---|---|---|
| `vitest` | 1.x | Vite-native test runner |
| `@testing-library/react` | 14.x | React component testing |
| `@testing-library/user-event` | 14.x | Simulated user interactions |
| `@testing-library/jest-dom` | 6.x | Extended DOM matchers |
| `jsdom` | 24.x | DOM environment for tests |

### Dev Tooling
| Library | Version | Purpose |
|---|---|---|
| `eslint` | 8.x | Linting |
| `@typescript-eslint/parser` | 7.x | TypeScript ESLint support |
| `eslint-plugin-react-hooks` | 4.x | Hooks linting |
| `prettier` | 3.x | Code formatting |
| `@types/react` | 18.x | React TypeScript types |
| `@types/node` | 20.x | Node types for Vite config |

---

## 2. What NOT to Use

| Rejected Option | Reason |
|---|---|
| Redux / Redux Toolkit | Too much boilerplate for this scale |
| MobX | Requires class-based patterns; harder to test |
| React Query | No server needed in MVP; overkill |
| Ant Design / MUI | Too opinionated; large bundle; harder to customize Gantt |
| D3.js (for Gantt) | Steep React integration friction; SVG by hand is more predictable at this scale |
| Moment.js | Deprecated; heavy; date-fns is superior |
| react-beautiful-dnd | Deprecated (abandoned by Atlassian) |
| @dnd-kit | Excellent library but adds ~30kb; roll simple drag for Gantt bars first |
| Webpack | Slower than Vite; no reason to choose it for a greenfield project |

---

## 3. Initial Implementation Order

Follow this sequence for lowest-risk, highest-value delivery:

### Step 1: Project Initialization
```bash
npm create vite@latest pmtools -- --template react-ts
cd pmtools
npm install

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui init
npx shadcn-ui@latest init
# Select: TypeScript, default style, CSS variables

# Core deps
npm install zustand react-router-dom date-fns nanoid
npm install @tanstack/react-table recharts
npm install papaparse jspdf html2canvas
npm install lucide-react clsx tailwind-merge class-variance-authority

# Dev + test
npm install -D vitest @testing-library/react @testing-library/user-event
npm install -D @testing-library/jest-dom jsdom
npm install -D eslint @typescript-eslint/parser eslint-plugin-react-hooks prettier
```

### Step 2: shadcn Components to Generate First
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add select
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add label
npx shadcn-ui@latest add table
```

### Step 3: Vite Config
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

### Step 4: Build and Test the Engine First
Before building any UI, implement and fully test:
1. `src/utils/dateUtils.ts` — `addWorkingDays`, `diffWorkingDays`, `isWorkingDay`
2. `src/engine/cycleDetector.ts` — Kahn's topological sort
3. `src/engine/scheduler.ts` — forward/backward pass
4. `src/engine/progressCalculator.ts` — rollup %

This gives you confidence the core logic is correct before building UI on top of it.

### Step 5: Store Setup
```typescript
// src/store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      schemaVersion: 1,
      ...createProjectSlice(set, get),
      ...createTaskSlice(set, get),
      ...createDependencySlice(set, get),
      ...createResourceSlice(set, get),
      ...createBudgetSlice(set, get),
      ...createScheduleSlice(set, get),
      ...createUISlice(set, get),
    }),
    {
      name: 'pmtools-store-v1',
      // Exclude non-serializable / derived state
      partialize: (state) => omit(state, ['scheduleSlice']),
      onRehydrateStorage: () => (state) => {
        // After hydration, recompute all schedules
        if (state) {
          Object.keys(state.projects).forEach((id) => state.recomputeSchedule(id))
        }
      },
    }
  )
)
```

### Step 6: Routing Shell
```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects/:id" element={<ProjectShell />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ProjectOverviewPage />} />
            <Route path="tasks" element={<TaskTablePage />} />
            <Route path="gantt" element={<GanttPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
          <Route path="settings" element={<AppSettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### Step 7: Key Implementation Patterns to Follow

#### Inline Cell Editing Pattern (Task Table)
```typescript
// Use a controlled input that only commits on blur/Enter
const [editing, setEditing] = useState(false)
const [draft, setDraft] = useState(value)

const commit = () => {
  if (draft !== value) onChange(draft)
  setEditing(false)
}

return editing
  ? <input value={draft} onChange={e => setDraft(e.target.value)}
           onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} autoFocus />
  : <span onDoubleClick={() => setEditing(true)}>{value}</span>
```

#### Gantt SVG Coordinate Calculation
```typescript
// Pure function — no React state
export function dateToX(date: Date, viewStart: Date, pixelsPerDay: number): number {
  const days = differenceInCalendarDays(date, viewStart)
  return days * pixelsPerDay
}

export function xToDate(x: number, viewStart: Date, pixelsPerDay: number): Date {
  const days = Math.round(x / pixelsPerDay)
  return addDays(viewStart, days)
}
```

#### Store Slice Pattern
```typescript
// Each slice is a function that receives set/get and returns actions + initial state
export const createTaskSlice = (set: SetState, get: GetState): TaskSlice => ({
  tasks: {},
  createTask: (task) => set((state) => {
    const id = generateId()
    const now = new Date().toISOString()
    state.tasks[id] = { ...task, id, createdAt: now, updatedAt: now }
    get().recomputeSchedule(task.projectId)  // trigger derived update
  }),
  // ...
})
```

---

## 4. Gantt Rendering Notes

The Gantt SVG element should be structured as:
```
<svg>
  <GanttGrid />          {/* background rect + column lines */}
  <GanttTodayLine />     {/* single vertical rect */}
  {tasks.map(t => (
    <>
      <GanttBar key={t.id} task={t} scheduled={schedule[t.id]} />
      {t.isMilestone && <GanttMilestone />}
    </>
  ))}
  {deps.map(d => <GanttDependencyArrow key={d.id} dep={d} />)}
</svg>
```

Render order matters: grid first (background), then bars, then arrows (on top of bars so they're always visible).

---

## 5. CI Configuration

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --run
      - run: npm run build
```

---

## 6. package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src"
  }
}
```

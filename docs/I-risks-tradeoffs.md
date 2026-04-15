# I. Risks and Tradeoffs

---

## Risk 1: Scheduling Engine Complexity

**Risk:** The forward/backward pass CPM algorithm appears simple in isolation but becomes tricky when:
- Tasks have multiple predecessors with different types (FS, FF, SS, SF)
- Lag/lead are combined with non-working days
- Manual-mode tasks act as constraints that can break float symmetry
- Summary tasks need scheduling (roll up from children vs. schedule independently)

**Likelihood:** Medium-High (this is the most bug-prone module)

**Impact:** High (wrong dates cascade everywhere — Gantt, reports, critical path are all downstream)

**Mitigations:**
1. Build the engine as a pure function with zero React dependencies — 100% unit testable.
2. Write tests first against known correct schedules (e.g., from MS Project reference data).
3. For MVP, **only support Finish-to-Start dependencies**. Other types are stored in the data model but treated as FS in the scheduler. Document this clearly.
4. For summary tasks in MVP: do not schedule them independently. Compute their dates as `min(children.earlyStart)` and `max(children.earlyFinish)`.
5. Add a "schedule debug view" (dev mode only) that prints the full forward/backward pass for inspection.

---

## Risk 2: Dependency Recalculation Performance

**Risk:** Every time any task is updated, the entire schedule is recomputed. With 500+ tasks and complex dependency networks, this could cause noticeable lag on every keystroke.

**Likelihood:** Low for MVP (typical projects have <100 tasks), Medium for Phase 2

**Impact:** Medium (sluggish typing in Task Table; dragging on Gantt feels choppy)

**Mitigations:**
1. **Debounce** `recompute()` calls: 300ms delay after the last change. This collapses rapid keystrokes into a single recompute.
2. The scheduling algorithm is O(V + E) (topological sort + single pass), so it's fast even at 500 tasks. Benchmark target: < 20ms for 200 tasks.
3. Move `recompute()` to a **Web Worker** in Phase 2 if performance degrades. The engine is already isolated as a pure function — worker migration is straightforward.
4. Use `useMemo` for derived data (sorted task list, resource load aggregation) to avoid re-renders when unrelated state changes.

---

## Risk 3: Critical Path Correctness

**Risk:** Users often misunderstand or misuse critical path. Common foot-guns:
- A project with no explicit deadline has critical path = longest chain (correct behavior, but confusing)
- Manual-mode tasks break the backward pass (they have fixed dates regardless of predecessors)
- Milestones at the project end have float = 0 trivially (not meaningful)
- Parallel paths with equal duration both appear critical (correct but unexpected)

**Likelihood:** Medium

**Impact:** Medium (incorrect CP highlighting erodes user trust in the tool)

**Mitigations:**
1. Document the algorithm clearly in `scheduler.ts` with inline comments.
2. Show total float in the Task Table as an optional column (hidden by default) so power users can verify.
3. In Phase 2, add a "critical path explained" tooltip explaining why a task is critical.
4. For MVP: if no project end date is set, use the maximum earlyFinish of all leaf tasks as the pseudo-end date for the backward pass.

---

## Risk 4: Browser PDF Export Quality

**Risk:** `html2canvas` captures the DOM as a raster image, which can produce:
- Blurry text at standard screen resolution (1x pixel ratio)
- Missing custom fonts if not loaded by canvas
- Gantt SVG rendering issues in some browsers
- Page breaks cutting through content unexpectedly

**Likelihood:** High (html2canvas is known to be imperfect)

**Impact:** Medium (users need to share reports; low-quality PDFs reflect poorly on the tool)

**Mitigations:**
1. For the Status Report, design the printable view as a **plain HTML/CSS page** that works well with the browser's native `window.print()`. This produces higher-quality output than html2canvas for text-heavy content.
2. For the Gantt PNG, use `scale: 2` in html2canvas options to capture at 2x resolution.
3. Alternatively, serialize the Gantt SVG directly to a string and embed it in the PDF via jsPDF's `addSvgAsImage()`.
4. Test on Chrome, Firefox, and Safari. Document known limitations.
5. Consider `@react-pdf/renderer` for Phase 2 as a pure-JS PDF renderer that avoids DOM capture entirely.

---

## Risk 5: localStorage Limits

**Risk:** localStorage has a hard ~5MB limit per origin. A large project with 500 tasks, multiple baselines, and status reports could approach this limit.

**Likelihood:** Low for MVP (typical small projects are well under 1MB), Medium for power users

**Impact:** Medium (silent data loss if storage quota is exceeded; app may crash on save)

**Mitigations:**
1. Monitor storage usage via `navigator.storage.estimate()` and warn users when > 80% used.
2. Design the data model with sparse optional fields (don't store nulls unnecessarily).
3. The JSON export/import path means users can manually manage storage by exporting and clearing.
4. In Phase 2, migrate to **IndexedDB via Dexie.js** which has no practical size limit.
5. Set a soft MVP limit: recommend ≤ 10 projects and ≤ 200 tasks total; display a warning beyond this.

---

## Risk 6: Gantt Drag Interaction Complexity

**Risk:** Implementing robust drag-to-move and drag-to-resize in raw SVG is more complex than it appears:
- Touch support requires separate touch event handlers
- Snapping to working days requires correct rounding
- Dragging a task in auto-schedule mode should propagate to successors (or raise a warning)
- Concurrent drags (user drags while debounced recompute is running) can produce race conditions

**Likelihood:** Medium

**Impact:** Medium (bad drag UX is frustrating; but the core functionality still works via Task Table)

**Mitigations:**
1. Implement drag using `mousedown/mousemove/mouseup` on the SVG — not pointer events (browser support edge cases).
2. Always snap to nearest whole day; round to closest day on `mouseup`.
3. When dragging a task in auto-schedule mode, switch it to `schedulingMode: 'manual'` for the duration of the drag, then offer "Restore auto-schedule" after.
4. Cancel any pending debounce timer when a new drag starts.
5. MVP does not need to support touch/mobile Gantt — document this explicitly.
6. As a fallback, users can always edit start/finish dates directly in the Task Table — the Gantt is an enhancement, not the only data entry path.

---

## Risk 7: Data Model Evolution

**Risk:** As the app evolves through phases, the data model will change. Users who stored data in Phase 1's schema will have problems with Phase 2's code.

**Likelihood:** High (data model evolution is inevitable)

**Impact:** Medium (stored data becomes unreadable; users lose work)

**Mitigations:**
1. `schemaVersion: number` is in the root store from day one.
2. On app startup, compare stored `schemaVersion` to app's `CURRENT_SCHEMA_VERSION`. If different, run migration chain.
3. Each migration is a pure function: `migrate_v1_to_v2(storeData) → storeData`.
4. Before any migration runs, export a JSON backup automatically (offer download).
5. Keep all migrations in `src/store/migrations.ts`, tested with Vitest.

---

## Risk 8: Concurrent Multi-Tab Usage

**Risk:** If the user has the app open in two browser tabs, they'll have two independent copies of the Zustand store in memory. Changes in one tab won't be reflected in the other. When the second tab writes to localStorage, it will overwrite the first tab's changes.

**Likelihood:** Low (most users won't use two tabs simultaneously in MVP)

**Impact:** Low-Medium (data could be partially overwritten)

**Mitigations:**
1. Add a `storage` event listener that reloads the store from localStorage when another tab writes. Zustand's persist middleware supports this via `storageEventListener` option.
2. Show a toast: "Changes detected from another tab — click to reload" rather than silently overriding.
3. This becomes a non-issue in Phase 4 (cloud persistence with optimistic locking).

---

## Risk 9: Date/Timezone Edge Cases

**Risk:** If users in different timezones use the app (Phase 4), ISO date strings stored without timezone information can shift by ±1 day when parsed in different timezones.

**Likelihood:** Low for Phase 1 (single user, single timezone)

**Impact:** High if it occurs in Phase 4 (wrong dates across timezone boundaries)

**Mitigations:**
1. Store all dates as **`YYYY-MM-DD` strings without time component** (no timestamps for task dates). This is timezone-neutral.
2. Parse all dates with `parseISO()` from date-fns which treats date-only strings as local midnight.
3. For status report and audit timestamps, use UTC ISO-8601 with timezone offset (`toISOString()`).
4. Document this convention explicitly in `dateUtils.ts`.

---

## Tradeoffs Summary Table

| Decision | Chosen Approach | Alternative | Why Chosen |
|---|---|---|---|
| Gantt rendering | Custom SVG | D3, vis-timeline, DHTMLX Gantt | Full control; no licensing; integrates naturally with React |
| State management | Zustand | Redux, Jotai, Context | Low boilerplate; excellent DevTools; built-in persist middleware |
| Persistence | localStorage (MVP) | IndexedDB, Supabase | Simplest possible; no server; sufficient for small datasets |
| Tables | TanStack Table | AG Grid, react-table v7 | Headless, free, great TypeScript support, virtual rows for scale |
| PDF export | html2canvas + jsPDF | @react-pdf/renderer, Puppeteer | No server needed; works in browser; Puppeteer requires backend |
| Date library | date-fns | Luxon, Day.js | Tree-shakeable; immutable; large ecosystem; best typing |
| Charts | Recharts | Victory, Chart.js | React-native; easy integration; good docs |
| Dependency types (MVP) | FS only | All four types | Complexity reduction; >80% of real-world projects use only FS |

/**
 * D. Data Model — TypeScript Interfaces
 *
 * Assumptions:
 *  - All IDs are nanoid strings (e.g. "V1StGXR8_Z5jdHi6B-myT")
 *  - All dates stored as ISO-8601 date strings ("YYYY-MM-DD") for serialization safety
 *  - Monetary values stored as numbers (USD cents or whole dollars — whole dollars for MVP)
 *  - Optional fields marked with `?`; the comment lists the default if omitted
 */

// ─────────────────────────────────────────────
// ENUMERATIONS
// ─────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export type DependencyType =
  | 'FS'  // Finish-to-Start  (default, most common)
  | 'FF'  // Finish-to-Finish
  | 'SS'  // Start-to-Start
  | 'SF'; // Start-to-Finish

export type SchedulingMode = 'auto' | 'manual';

export type RAGStatus = 'green' | 'amber' | 'red';

export type BudgetCategory = 'labor' | 'materials' | 'travel' | 'equipment' | 'other';

export type ResourceType = 'person' | 'role' | 'equipment';

// ─────────────────────────────────────────────
// PROJECT
// ─────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;        // Free text project description
  status: ProjectStatus;       // default: 'planning'
  ragStatus: RAGStatus;        // default: 'green'; can be manually overridden

  plannedStart: string;        // ISO date — project start (also constraints Forward Pass)
  plannedEnd: string;          // ISO date — project target end
  actualStart?: string;        // ISO date — when work actually began
  actualEnd?: string;          // ISO date — when project actually finished

  budgetTotal: number;         // Total planned budget in dollars
  sponsor?: string;            // Sponsor name (free text for MVP)
  owner?: string;              // Project manager name (free text for MVP)

  teamMemberIds: string[];     // Resource IDs of people on this project
  baselineIds: string[];       // Baseline snapshot IDs (ordered, most recent last)

  workingDays: number[];       // 0=Sun,1=Mon,...,6=Sat — default: [1,2,3,4,5]
  holidays: string[];          // ISO date strings of non-working days
  hoursPerDay: number;         // Default: 8

  tags?: string[];
  createdAt: string;           // ISO datetime
  updatedAt: string;           // ISO datetime
}

// ─────────────────────────────────────────────
// TASK
// ─────────────────────────────────────────────

export interface Task {
  id: string;
  projectId: string;

  name: string;
  description?: string;
  wbsNumber?: string;          // e.g. "1.2.3" — auto-computed from tree position
  isMilestone: boolean;        // default: false; milestones have duration = 0
  isSummary?: boolean;         // true if this task has children (auto-detected)

  parentId: string | null;     // null = root-level task
  childIds: string[];          // ordered list of direct child IDs
  sortOrder: number;           // position among siblings

  // Scheduling
  schedulingMode: SchedulingMode;    // default: 'auto'
  plannedDuration: number;           // working days; 0 for milestones
  plannedStart: string;              // ISO date (constrained or computed)
  plannedEnd: string;                // ISO date (constrained or computed)
  constraintDate?: string;           // ISO date for 'Start No Earlier Than' or hard pin
  constraintType?: 'SNET' | 'SNLT' | 'MFO' | 'MSO'; // Schedule constraint type

  // Actuals
  actualStart?: string;
  actualEnd?: string;
  percentComplete: number;           // 0–100, user-entered for leaf tasks
  status: TaskStatus;                // default: 'not_started'

  // Assignments and cost
  assigneeIds: string[];             // Resource IDs (one per task in MVP)
  budgetAmount: number;              // Planned cost in dollars; default: 0
  actualCost: number;                // Sum of actuals; default: 0

  // Metadata
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// DEPENDENCY
// ─────────────────────────────────────────────

export interface Dependency {
  id: string;
  projectId: string;
  predecessorId: string;   // Task ID of the predecessor (from)
  successorId: string;     // Task ID of the successor   (to)
  type: DependencyType;    // default: 'FS'
  lagDays: number;         // positive = lag, negative = lead; default: 0
}

// ─────────────────────────────────────────────
// RESOURCE
// ─────────────────────────────────────────────

export interface Resource {
  id: string;
  name: string;
  email?: string;
  role?: string;           // Job title / role description
  type: ResourceType;      // default: 'person'
  avatarUrl?: string;
  dailyCapacityHours: number;   // default: 8
  costPerHour?: number;         // For auto cost calculation (Phase 2)
  color?: string;               // Hex color for Gantt / calendar display
  createdAt: string;
}

// ─────────────────────────────────────────────
// ASSIGNMENT (Resource ↔ Task link)
// ─────────────────────────────────────────────

export interface Assignment {
  id: string;
  projectId: string;
  taskId: string;
  resourceId: string;
  allocationPercent: number;  // 0–100; how much of daily capacity on this task; default: 100
  effortHours?: number;       // Total planned hours; optional (can be derived)
  notes?: string;
}

// ─────────────────────────────────────────────
// BUDGET LINE
// ─────────────────────────────────────────────

export interface BudgetLine {
  id: string;
  projectId: string;
  taskId?: string;             // Optional: scoped to a task; null = project-level line
  category: BudgetCategory;
  description: string;
  plannedAmount: number;       // Dollars
  createdAt: string;
}

// ─────────────────────────────────────────────
// ACTUAL COST ENTRY
// ─────────────────────────────────────────────

export interface ActualCostEntry {
  id: string;
  projectId: string;
  taskId?: string;
  budgetLineId?: string;       // Optional link back to budget line
  category: BudgetCategory;
  description: string;
  amount: number;              // Dollars (positive = cost)
  date: string;                // ISO date the cost was incurred
  createdAt: string;
}

// ─────────────────────────────────────────────
// BASELINE SNAPSHOT
// ─────────────────────────────────────────────

export interface Baseline {
  id: string;
  projectId: string;
  name: string;                // e.g. "Baseline 1 — approved 2024-03-01"
  createdAt: string;
  tasks: BaselineTask[];       // Frozen copy of task schedule data
  budgetTotal: number;
}

export interface BaselineTask {
  taskId: string;
  plannedStart: string;
  plannedEnd: string;
  plannedDuration: number;
  budgetAmount: number;
}

// ─────────────────────────────────────────────
// STATUS REPORT
// ─────────────────────────────────────────────

export interface StatusReport {
  id: string;
  projectId: string;
  reportDate: string;          // ISO date
  overallStatus: RAGStatus;
  percentCompleteSnapshot: number;

  // Narrative sections
  scopeNarrative: string;
  scheduleNarrative: string;
  budgetNarrative: string;
  risksNarrative: string;
  nextStepsNarrative: string;

  // Auto-populated snapshots at time of report generation
  milestoneSnapshot: MilestoneSnapshot[];
  budgetSnapshot: { planned: number; actual: number; variance: number };

  createdAt: string;
}

export interface MilestoneSnapshot {
  taskId: string;
  name: string;
  plannedDate: string;
  status: TaskStatus;
}

// ─────────────────────────────────────────────
// COMPUTED / DERIVED (not persisted)
// ─────────────────────────────────────────────

/**
 * Result of the scheduling engine for a single task.
 * Stored in the scheduleSlice but NOT persisted to localStorage.
 * Recomputed on every schedule change.
 */
export interface ScheduledTask {
  taskId: string;

  // Forward pass
  earlyStart: string;          // ISO date
  earlyFinish: string;         // ISO date

  // Backward pass
  lateStart: string;           // ISO date
  lateFinish: string;          // ISO date

  // Float
  totalFloat: number;          // working days
  freeFloat: number;           // working days

  // Critical path
  isCritical: boolean;         // totalFloat <= 0

  // Display
  computedDuration: number;    // actual working days between earlyStart and earlyFinish
}

/**
 * Per-day resource load entry used by the resource allocation view.
 */
export interface ResourceLoadEntry {
  resourceId: string;
  date: string;                // ISO date
  allocatedHours: number;
  capacityHours: number;
  isOverAllocated: boolean;
}

// ─────────────────────────────────────────────
// ROOT STORE SHAPE (for persistence)
// ─────────────────────────────────────────────

export interface AppStore {
  schemaVersion: number;       // Increment on breaking data model changes; current: 1
  projects: Record<string, Project>;
  tasks: Record<string, Task>;
  dependencies: Record<string, Dependency>;
  resources: Record<string, Resource>;
  assignments: Record<string, Assignment>;
  budgetLines: Record<string, BudgetLine>;
  actualCosts: Record<string, ActualCostEntry>;
  baselines: Record<string, Baseline>;
  statusReports: Record<string, StatusReport>;
  activeProjectId: string | null;
}

// ─────────────────────────────────────────────
// RELATIONSHIPS SUMMARY
// ─────────────────────────────────────────────
//
//  Project (1) ──< Task (many)           via Task.projectId
//  Task    (1) ──< Task (many)           via Task.parentId (hierarchy)
//  Task    (1) ──< Dependency (many)     via Dependency.predecessorId / successorId
//  Task    (1) ──< Assignment (many)     via Assignment.taskId
//  Resource (1) ──< Assignment (many)    via Assignment.resourceId
//  Task    (1) ──< BudgetLine (many)     via BudgetLine.taskId
//  BudgetLine (1) ──< ActualCostEntry    via ActualCostEntry.budgetLineId
//  Project (1) ──< Baseline (many)       via Baseline.projectId
//  Project (1) ──< StatusReport (many)   via StatusReport.projectId

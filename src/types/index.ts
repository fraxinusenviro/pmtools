// ─── Enums ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold'
export type DependencyType = 'FS' | 'FF' | 'SS' | 'SF'
export type SchedulingMode = 'auto' | 'manual'
export type RAGStatus = 'green' | 'amber' | 'red'
export type BudgetCategory = 'labor' | 'materials' | 'travel' | 'equipment' | 'other'
export type ResourceType = 'person' | 'role' | 'equipment'

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  ragStatus: RAGStatus
  plannedStart: string
  plannedEnd: string
  actualStart?: string
  actualEnd?: string
  budgetTotal: number
  sponsor?: string
  owner?: string
  teamMemberIds: string[]
  baselineIds: string[]
  workingDays: number[]
  holidays: string[]
  hoursPerDay: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  projectId: string
  name: string
  description?: string
  wbsNumber?: string
  isMilestone: boolean
  isSummary?: boolean
  parentId: string | null
  childIds: string[]
  sortOrder: number
  schedulingMode: SchedulingMode
  plannedDuration: number
  plannedStart: string
  plannedEnd: string
  constraintDate?: string
  constraintType?: 'SNET' | 'SNLT' | 'MFO' | 'MSO'
  actualStart?: string
  actualEnd?: string
  percentComplete: number
  status: TaskStatus
  assigneeIds: string[]
  budgetAmount: number
  actualCost: number
  notes?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// ─── Dependency ───────────────────────────────────────────────────────────────

export interface Dependency {
  id: string
  projectId: string
  predecessorId: string
  successorId: string
  type: DependencyType
  lagDays: number
}

// ─── Resource ─────────────────────────────────────────────────────────────────

export interface Resource {
  id: string
  name: string
  email?: string
  role?: string
  type: ResourceType
  avatarUrl?: string
  dailyCapacityHours: number
  costPerHour?: number
  color?: string
  createdAt: string
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export interface Assignment {
  id: string
  projectId: string
  taskId: string
  resourceId: string
  allocationPercent: number
  effortHours?: number
  notes?: string
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface BudgetLine {
  id: string
  projectId: string
  taskId?: string
  category: BudgetCategory
  description: string
  plannedAmount: number
  createdAt: string
}

export interface ActualCostEntry {
  id: string
  projectId: string
  taskId?: string
  budgetLineId?: string
  category: BudgetCategory
  description: string
  amount: number
  date: string
  createdAt: string
}

// ─── Baseline ─────────────────────────────────────────────────────────────────

export interface BaselineTask {
  taskId: string
  plannedStart: string
  plannedEnd: string
  plannedDuration: number
  budgetAmount: number
}

export interface Baseline {
  id: string
  projectId: string
  name: string
  createdAt: string
  tasks: BaselineTask[]
  budgetTotal: number
}

// ─── Status Report ────────────────────────────────────────────────────────────

export interface MilestoneSnapshot {
  taskId: string
  name: string
  plannedDate: string
  status: TaskStatus
}

export interface StatusReport {
  id: string
  projectId: string
  reportDate: string
  overallStatus: RAGStatus
  percentCompleteSnapshot: number
  scopeNarrative: string
  scheduleNarrative: string
  budgetNarrative: string
  risksNarrative: string
  nextStepsNarrative: string
  milestoneSnapshot: MilestoneSnapshot[]
  budgetSnapshot: { planned: number; actual: number; variance: number }
  createdAt: string
}

// ─── Computed (not persisted) ─────────────────────────────────────────────────

export interface ScheduledTask {
  taskId: string
  earlyStart: string
  earlyFinish: string
  lateStart: string
  lateFinish: string
  totalFloat: number
  freeFloat: number
  isCritical: boolean
  computedDuration: number
}

// ─── Root Store ───────────────────────────────────────────────────────────────

export interface AppStore {
  schemaVersion: number
  projects: Record<string, Project>
  tasks: Record<string, Task>
  dependencies: Record<string, Dependency>
  resources: Record<string, Resource>
  assignments: Record<string, Assignment>
  budgetLines: Record<string, BudgetLine>
  actualCosts: Record<string, ActualCostEntry>
  baselines: Record<string, Baseline>
  statusReports: Record<string, StatusReport>
  activeProjectId: string | null
}

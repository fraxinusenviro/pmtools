import type { StoreState } from '@/store'
import { downloadText } from './exportCsv'

export function exportStoreJson(state: StoreState, filename = 'pmtools-backup.json'): void {
  const data = {
    schemaVersion: state.schemaVersion,
    projects: state.projects,
    tasks: state.tasks,
    dependencies: state.dependencies,
    resources: state.resources,
    assignments: state.assignments,
    budgetLines: state.budgetLines,
    actualCosts: state.actualCosts,
    baselines: state.baselines,
    statusReports: state.statusReports,
    activeProjectId: state.activeProjectId,
  }
  downloadText(JSON.stringify(data, null, 2), filename, 'application/json')
}

import request from './index'

export type ExportTaskType = 'USERS' | 'ORDERS' | 'REWARDS' | 'WITHDRAWS' | 'LEDGER' | 'RISK'

export function getUserAssetsReport(params?: Record<string, unknown>) {
  return request.get('/reports/user-assets', { params })
}

export function getDashboardOverview() {
  return request.get('/reports/dashboard-overview')
}

export function getNodeSalesReport(params?: Record<string, unknown>) {
  return request.get('/reports/node-sales', { params })
}

export function getRewardsReport(params?: Record<string, unknown>) {
  return request.get('/reports/rewards', { params })
}

export function getWithdrawsReport(params?: Record<string, unknown>) {
  return request.get('/reports/withdraws', { params })
}

export function createExportTask(data: { taskType: ExportTaskType; filters?: Record<string, unknown> }) {
  return request.post('/reports/export', data)
}

export function getExportTasks(params?: Record<string, unknown>) {
  return request.get('/reports/exports', { params })
}

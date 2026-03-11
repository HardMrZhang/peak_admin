import request from './index'

export function getAuditLogs(params?: Record<string, unknown>) {
  return request.get('/audit/logs', { params })
}

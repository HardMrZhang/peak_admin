import request from './index'

export function getWithdraws(params?: Record<string, unknown>) {
  return request.get('/withdraw', { params })
}

export function getWithdrawDetail(id: string) {
  return request.get(`/withdraw/${id}`)
}

export function approveWithdraw(id: string) {
  return request.post(`/withdraw/${id}/approve`)
}

export function rejectWithdraw(id: string, reason: string) {
  return request.post(`/withdraw/${id}/reject`, { reason })
}

export function markWithdrawRisk(id: string, riskReason: string) {
  return request.post(`/withdraw/${id}/risk`, { riskReason })
}

export function batchApproveWithdraws(requestIds: string[]) {
  return request.post('/withdraw/batch-approve', { requestIds })
}

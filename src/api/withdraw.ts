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

export function confirmWithdrawSend(id: string, txHash: string, feeTxHash?: string) {
  return request.post(`/withdraw/${id}/confirm`, { txHash, feeTxHash })
}

export function batchApproveWithdraws(requestIds: string[]) {
  return request.post('/withdraw/batch-approve', { requestIds })
}

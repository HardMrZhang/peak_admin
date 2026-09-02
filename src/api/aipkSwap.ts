import request from './index'

export type AipkSwapStatus = 'PENDING_TX' | 'PENDING_REVIEW' | 'APPROVED' | 'SUCCESS' | 'REJECTED' | 'EXPIRED'

export interface AipkSwapRow {
  id: string
  requestNo: string
  userId: string
  walletAddress: string
  aipkAmount: string
  rateUsdt: string
  usdtAmount: string
  feeUsdt: string
  receiveAddress: string
  receiveAta: string
  depositTxHash: string | null
  payoutTxHash: string | null
  refundTxHash: string | null
  status: AipkSwapStatus
  remark: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  paidAt: string | null
  expiresAt: string
  createdAt: string
  user?: { id: string; walletAddress: string }
}

export function getAipkSwaps(params?: Record<string, unknown>) {
  return request.get('/aipk-swap', { params })
}

export function getAipkSwapDetail(id: string) {
  return request.get(`/aipk-swap/${id}`)
}

export function approveAipkSwap(id: string) {
  return request.post(`/aipk-swap/${id}/approve`)
}

export function rejectAipkSwap(id: string, remark: string) {
  return request.post(`/aipk-swap/${id}/reject`, { remark })
}

/** 管理员钱包已把 USDT 打给用户后提交 txHash，服务端验链后置 SUCCESS */
export function confirmAipkSwapSend(id: string, txHash: string) {
  return request.post(`/aipk-swap/${id}/confirm-send`, { txHash })
}

/** 驳回单人工退回 Aipk 后登记 */
export function markAipkSwapRefund(id: string, refundTxHash: string) {
  return request.post(`/aipk-swap/${id}/refund`, { refundTxHash })
}

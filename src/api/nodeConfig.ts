import request from './index'

export type NodeConfigStatus = 'NOT_STARTED' | 'ON_SALE' | 'PAUSED' | 'ENDED'

export interface ReferralSettings {
  rewardPerNodeUsdt: number
  maxLevelNodeHolder: number
  maxLevelNormalUser: number
  updatedAt?: string | null
}

export function getNodeConfigs(params?: Record<string, unknown>) {
  return request.get('/node-config', { params })
}

export function getActiveNodeConfig() {
  return request.get('/node-config/active')
}

export function createNodeConfig(data: {
  totalNodes: number
  nodePriceUsdt: number
  saleStartAt?: string | null
  saleEndAt?: string | null
  status?: NodeConfigStatus
}) {
  return request.post('/node-config', data)
}

export function updateNodeConfig(id: string, data: Record<string, unknown>) {
  return request.put(`/node-config/${id}`, data)
}

export function updateNodeConfigStatus(id: string, status: NodeConfigStatus) {
  return request.patch(`/node-config/${id}/status`, { status })
}

export function getReferralSettings() {
  return request.get<ReferralSettings>('/node-config/referral-settings')
}

export function updateReferralSettings(data: ReferralSettings) {
  return request.put<ReferralSettings>('/node-config/referral-settings', data)
}

import request from './index'

export function getContractCoverage() {
  return request.get('/contract-core/coverage')
}

export function getContractInventory() {
  return request.get('/contract-core/inventory')
}

export function settleDaily(day: number) {
  return request.post('/contract-core/settle-daily', { day })
}

export function claimReward(data: { userId: string; nodeIndex: number; assetAddress: string; upToDay?: number }) {
  return request.post('/contract-core/claim-reward', data)
}

export function claimReferral() {
  return request.post('/contract-core/claim-referral')
}

export function updateContractConfig(data: Record<string, unknown>) {
  return request.post('/contract-core/update-config', data)
}

export function updateEmission(segments: Array<{ startOffset: number; endOffset: number; dailyEmission: number }>) {
  return request.post('/contract-core/update-emission', { segments })
}

export function transferContractAdmin(newAdmin: string) {
  return request.post('/contract-core/transfer-admin', { newAdmin })
}

export function revokeGrant(grantId: number) {
  return request.post('/contract-core/revoke-grant', { grantId })
}

export function adminTransferNode(receiverWallet: string) {
  return request.post('/contract-core/admin-transfer-node', { receiverWallet })
}

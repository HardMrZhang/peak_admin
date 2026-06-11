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

// ===== PEAK DApp（operator 记账 / admin 治理）=====

/** 给用户链上账本写可提额度；bucket: 1=airdrop 2=promo 3=t7 */
export function creditUser(data: { user: string; bucket: number; amount: string }) {
  return request.post('/contract-core/credit-user', data)
}

/** 手动更新链上 PriceFeed（peakPriceUsdt：1 PEAK 的 USDT 价，6 位精度 raw） */
export function updateDappPrice(data: { peakPriceUsdt: string; maxStaleSecs?: number }) {
  return request.post('/contract-core/update-dapp-price', data)
}

/** 给质押仓位补写待领收益（用户随后单签领取） */
export function creditStakeReward(data: {
  periodDays: number
  positionOwner: string
  positionId: string
  amount: string
}) {
  return request.post('/contract-core/stake/credit-reward', data)
}

/** 读取 DApp 链上配置全量（admin / operator / 全部钱包与比例） */
export function getDappConfig() {
  return request.get('/contract-core/dapp-config')
}

/** 修改 DApp 链上配置（传哪个字段改哪个；admin 签名，链上复核不变量） */
export function updateDappConfig(data: Record<string, string | number>) {
  return request.post('/contract-core/update-dapp-config', data)
}

/** 移交 DApp 治理 admin（建议 Squads 多签） */
export function transferDappAdmin(newAdmin: string) {
  return request.post('/contract-core/transfer-dapp-admin', { newAdmin })
}

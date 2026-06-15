import request from './index'

export type StakeStatus = 'STAKING' | 'REDEEMABLE' | 'REDEEMED'

export function getStakeOrders(params?: Record<string, unknown>) {
  return request.get('/stake', { params })
}

export function getStakeOrderDetail(id: string) {
  return request.get(`/stake/${id}`)
}

// 实时读取该质押订单的链上 StakePosition 状态
export function getStakeOnchain(id: string) {
  return request.get(`/stake/${id}/onchain`)
}

import request from './index'

export type AirdropStatus = 'AIRING' | 'FINISHED'

export function getAirdropOrders(params?: Record<string, unknown>) {
  return request.get('/airdrop', { params })
}

export function getAirdropOrderDetail(id: string) {
  return request.get(`/airdrop/${id}`)
}

// 实时读取该空投订单的链上 AirdropEntry 状态
export function getAirdropOnchain(id: string) {
  return request.get(`/airdrop/${id}/onchain`)
}

// 链上记账一笔每日空投发放（operator 签名上链）
export function recordAirdropRelease(id: string, body: { day: number; amount: string | number }) {
  return request.post(`/airdrop/${id}/record-release`, body)
}

// 链上一次性直推加速记账
export function recordAirdropAccel(id: string, body: { accelId: string | number; amount: string | number }) {
  return request.post(`/airdrop/${id}/record-accel`, body)
}

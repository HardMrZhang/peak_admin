import request from './index'

export type AirdropStatus = 'AIRING' | 'FINISHED'

export function getAirdropOrders(params?: Record<string, unknown>) {
  return request.get('/airdrop', { params })
}

export function getAirdropOrderDetail(id: string) {
  return request.get(`/airdrop/${id}`)
}

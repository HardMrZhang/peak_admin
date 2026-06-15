import request from './index'

// 创世节点销售统计（总量/已售/剩余/营收/空投/已铸造等）
export function getGenesisStats() {
  return request.get('/genesis/stats')
}

// 当前生效的创世销售配置
export function getGenesisActiveConfig() {
  return request.get('/genesis/configs/active')
}

// 创世订单列表
export function getGenesisOrders(params?: Record<string, unknown>) {
  return request.get('/genesis/orders', { params })
}

// 创世订单详情（含 NFT 明细）
export function getGenesisOrderDetail(id: string) {
  return request.get(`/genesis/orders/${id}`)
}

// 创世 NFT 记录列表
export function getGenesisNfts(params?: Record<string, unknown>) {
  return request.get('/genesis/nfts', { params })
}

export type GenesisStatus = 'NOT_STARTED' | 'ON_SALE' | 'PAUSED' | 'ENDED'

// 全部销售配置
export function getGenesisConfigs() {
  return request.get('/genesis/configs')
}

// 修改销售配置
export function updateGenesisConfig(id: string, body: Record<string, unknown>) {
  return request.put(`/genesis/configs/${id}`, body)
}

// 上下架 / 切换销售状态
export function toggleGenesisStatus(id: string, status: GenesisStatus) {
  return request.patch(`/genesis/configs/${id}/status`, { status })
}

import request from './index'

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED'

export function getOrders(params?: Record<string, unknown>) {
  return request.get('/orders', { params })
}

export function getOrderDetail(id: string) {
  return request.get(`/orders/${id}`)
}

import request from './index'

export function getNftRecords(params?: Record<string, unknown>) {
  return request.get('/nft', { params })
}

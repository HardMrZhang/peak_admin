import request from './index'

export function getPlatformBalances(params?: Record<string, unknown>) {
  return request.get('/platform-wallet/balances', { params })
}

export function getPlatformLedger(params?: Record<string, unknown>) {
  return request.get('/platform-wallet/ledger', { params })
}

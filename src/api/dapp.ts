import request from './index'

export type DividendKey = 'promo' | 't7' | '15' | '30' | '90' | '150'

// 给用户写入链上可提额度（提币合约 credit_user）
export function creditWithdraw(body: { userId: string; amount: string | number }) {
  return request.post('/dapp/credit-withdraw', body)
}

// 给用户写入链上分红可领额度（分红合约 credit_user）
export function creditDividend(body: { userId: string; key: DividendKey; amount: string | number }) {
  return request.post('/dapp/credit-dividend', body)
}

// 更新链上 PEAK/USDT 价格源
export function updateDappPrice(body: { peakPriceUsdt: string | number; maxStaleSecs?: number }) {
  return request.post('/dapp/update-price', body)
}

// 触发链上对账（扫描链上账户回写 DB 镜像）
export function triggerChainSync() {
  return request.post('/dapp/chain-sync')
}

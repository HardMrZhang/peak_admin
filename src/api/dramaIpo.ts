import request from './index'

export type DramaProjectStatus = 'DRAFT' | 'PENDING' | 'OPEN' | 'SOLD_OUT' | 'CLOSED'

export interface DramaPlatform {
  id?: string
  name: string
  logoUrl?: string | null
  sortOrder?: number
}

export interface DramaProject {
  id: string
  serialNo: string
  serialNum: string
  name: string
  grade?: string | null
  genre?: string | null
  seriesNo: number
  synopsisHtml?: string | null
  posterUrl?: string | null
  totalInvestUsdt: string
  sharePriceUsdt: string
  totalShares: number
  soldShares: number
  remainingShares: number
  screenwriter?: string | null
  director?: string | null
  artDirector?: string | null
  producer?: string | null
  totalEpisodes?: number | null
  runtimeMinutes?: number | null
  premiereAt?: string | null
  status: DramaProjectStatus
  confirmedAt?: string | null
  openAt?: string | null
  closeAt?: string | null
  soldOutAt?: string | null
  chainSaleAddr?: string | null
  chainTxHash?: string | null
  platforms: DramaPlatform[]
  subscriptionCount?: number
  createdAt: string
  updatedAt: string
}

export interface DramaSubscriptionRow {
  id: string
  subNo: string
  serialNo: string
  projectName: string
  userId: string
  walletAddress: string
  shares: number
  amountUsdt: string
  primaryAmountUsdt: string
  secondaryAmountUsdt: string
  peakPriceUsdt: string
  airdropTotal: string
  airdropReleased: string
  releasedDays: number
  isOut: boolean
  principalPaidUsdt: string
  dividendPaidUsdt: string
  txHash?: string | null
  chainSubAddr?: string | null
  startDate: string
  status: string
  createdAt: string
}

export interface DramaRevenueEntry {
  id: string
  periodNo: number
  platformId: string
  revenueUsdt: string
  proofUrl?: string | null
  remark?: string | null
}

export interface DramaDividendPeriod {
  id: string
  periodNo: number
  totalRevenueUsdt: string
  dividendPoolUsdt: string
  totalShares: number
  proofUrl?: string | null
  status: 'CONFIRMED' | 'SETTLED'
  confirmedAt?: string | null
  settledAt?: string | null
}

export interface DramaRevenueView {
  projectId: string
  serialNo: string
  name: string
  totalPeriods: number
  dividendRatioBps: number
  platforms: DramaPlatform[]
  entries: DramaRevenueEntry[]
  periods: DramaDividendPeriod[]
}

export interface DramaPrincipalRow {
  id: string
  serialNo: string
  projectName: string
  subNo: string
  shares: number
  walletAddress: string
  monthNo: number
  amountUsdt: string
  dueDate: string
  status: string
  paidAt?: string | null
  proofUrl?: string | null
  chainTxHash?: string | null
  errorMessage?: string | null
}

export function getDramaOverview() {
  return request.get('/drama-ipo/overview')
}

export function getDramaProjects(params?: Record<string, unknown>) {
  return request.get('/drama-ipo/projects', { params })
}

export function getDramaProject(id: string) {
  return request.get(`/drama-ipo/projects/${id}`)
}

export function createDramaProject(body: Record<string, unknown>) {
  return request.post('/drama-ipo/projects', body)
}

export function updateDramaProject(id: string, body: Record<string, unknown>) {
  return request.put(`/drama-ipo/projects/${id}`, body)
}

/** 确认上架：开盘时间 = 确认时间 + 24 小时 */
export function confirmDramaProject(id: string) {
  return request.post(`/drama-ipo/projects/${id}/confirm`)
}

export function setDramaProjectStatus(id: string, status: DramaProjectStatus) {
  return request.put(`/drama-ipo/projects/${id}/status`, { status })
}

export function deleteDramaProject(id: string) {
  return request.delete(`/drama-ipo/projects/${id}`)
}

export function getDramaSubscriptions(params?: Record<string, unknown>) {
  return request.get('/drama-ipo/subscriptions', { params })
}

export function getDramaRevenue(projectId: string) {
  return request.get(`/drama-ipo/projects/${projectId}/revenue`)
}

export function upsertDramaRevenue(body: Record<string, unknown>) {
  return request.post('/drama-ipo/revenue', body)
}

export function deleteDramaRevenue(id: string) {
  return request.delete(`/drama-ipo/revenue/${id}`)
}

/** 确认某期：合计各平台收益 × 40% 落分红池，等定时任务按份数分摊入账 */
export function confirmDividendPeriod(body: {
  projectId: string
  periodNo: number
  proofUrl?: string | null
}) {
  return request.post('/drama-ipo/dividend-periods/confirm', body)
}

export function getDramaPrincipalReturns(params?: Record<string, unknown>) {
  return request.get('/drama-ipo/principal-returns', { params })
}

export function updatePrincipalProof(id: string, proofUrl: string) {
  return request.put(`/drama-ipo/principal-returns/${id}/proof`, { proofUrl })
}

export type UploadScope = 'drama-poster' | 'drama-platform' | 'drama-proof'

/** 图片上传，返回可直接存库的公开 URL */
export function uploadDramaFile(file: File, scope: UploadScope) {
  const form = new FormData()
  form.append('file', file)
  return request.post(`/drama-ipo/upload?scope=${scope}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

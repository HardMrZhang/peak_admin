import request from './index'

export function getBanners(params?: Record<string, unknown>) {
  return request.get('/content/banners', { params })
}

export function createBanner(data: {
  langCode?: string
  title?: string
  mediaType?: 'IMAGE' | 'VIDEO'
  mediaUrl: string
  targetUrl?: string
  sortOrder?: number
  isEnabled?: 0 | 1
  startAt?: string
  endAt?: string
}) {
  return request.post('/content/banners', data)
}

export function updateBanner(id: string, data: Record<string, unknown>) {
  return request.put(`/content/banners/${id}`, data)
}

export function deleteBanner(id: string) {
  return request.delete(`/content/banners/${id}`)
}

export function toggleBanner(id: string, isEnabled: boolean) {
  return request.patch(`/content/banners/${id}/toggle`, { isEnabled })
}

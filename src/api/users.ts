import request from './index'

export function getUsers(params?: Record<string, unknown>) {
  return request.get('/users', { params })
}

export function getUserDetail(id: string) {
  return request.get(`/users/${id}`)
}

export function getUserReferrals(id: string) {
  return request.get(`/users/${id}/referrals`)
}

export function updateUserStatus(id: string, status: 0 | 1) {
  return request.patch(`/users/${id}/status`, { status })
}

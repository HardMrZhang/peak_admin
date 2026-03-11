import request from './index'

export function login(data: { username: string; password: string }) {
  return request.post('/auth/login', data)
}

export function getProfile() {
  return request.get('/auth/profile')
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.post('/auth/change-password', data)
}

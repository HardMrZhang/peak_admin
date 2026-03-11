import request from './index'

export function getRoles(params?: Record<string, unknown>) {
  return request.get('/rbac/roles', { params })
}

export function createRole(data: { roleCode: string; roleName: string }) {
  return request.post('/rbac/roles', data)
}

export function updateRole(id: string, data: { roleName?: string; status?: 0 | 1 }) {
  return request.put(`/rbac/roles/${id}`, data)
}

export function assignPermissions(roleId: string, permissionIds: string[]) {
  return request.post(`/rbac/roles/${roleId}/permissions`, { permissionIds })
}

export function getPermissions(params?: Record<string, unknown>) {
  return request.get('/rbac/permissions', { params })
}

export function getAdminUsers(params?: Record<string, unknown>) {
  return request.get('/rbac/users', { params })
}

export function createAdminUser(data: {
  username: string
  password: string
  displayName?: string
  email?: string
  mobile?: string
}) {
  return request.post('/rbac/users', data)
}

export function assignRoles(userId: string, roleIds: string[]) {
  return request.post(`/rbac/users/${userId}/roles`, { roleIds })
}

export function updateAdminStatus(userId: string, status: 0 | 1) {
  return request.patch(`/rbac/users/${userId}/status`, { status })
}

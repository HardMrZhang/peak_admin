import request from './index'

export type CalcStatus = 'PENDING' | 'DONE' | 'FAILED'

export function getSnapshots(params?: Record<string, unknown>) {
  return request.get('/settlement/snapshots', { params })
}

export function triggerSettle() {
  return request.post('/settlement/trigger-settle')
}

export function triggerRelease() {
  return request.post('/settlement/trigger-release')
}

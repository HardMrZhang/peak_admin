import request from './index'

export type CalcStatus = 'PENDING' | 'DONE' | 'FAILED'

export function getSnapshots(params?: Record<string, unknown>) {
  return request.get('/settlement/snapshots', { params })
}

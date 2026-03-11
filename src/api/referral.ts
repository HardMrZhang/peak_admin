import request from './index'

export function getReferralRelationships(params?: Record<string, unknown>) {
  return request.get('/referral/relationships', { params })
}

export function getReferralRewards(params?: Record<string, unknown>) {
  return request.get('/referral/rewards', { params })
}

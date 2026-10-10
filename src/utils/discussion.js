import { normalizeCarModel } from '../data/carModels'

export const DISCUSSION_TOPICS = [
  { name: '用车求助', key: 'help', icon: 'message-circle' },
  { name: '通勤骑行', key: 'commute', icon: 'location' },
  { name: '保养经验', key: 'care', icon: 'gear' },
  { name: '晒车分享', key: 'share', icon: 'sparkles' },
]

export function normalizeTopic(value) {
  return typeof value === 'string' ? value.trim().replace(/^#+\s*/, '').trim().slice(0, 80) : ''
}

export function discussionRoute({ carModel = '', topic = '', from = 'plaza' } = {}) {
  const model = normalizeCarModel(carModel) || normalizeCarModel(topic)
  const tag = normalizeCarModel(topic) ? '' : normalizeTopic(topic)
  return {
    path: '/discover',
    query: { tab: 'dynamic', discussion: tag ? 'topic' : 'model', ...(model ? { carModel: model } : {}), ...(tag ? { topic: tag } : {}), from },
  }
}

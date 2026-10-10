import { normalizeCarModel } from '../data/carModels'

export const DISCUSSION_TOPICS = [
  { name: '用车求助', key: 'help', icon: 'message-circle-question-mark' },
  { name: '通勤骑行', key: 'commute', icon: 'route' },
  { name: '保养经验', key: 'care', icon: 'wrench' },
  { name: '晒车分享', key: 'share', icon: 'camera' },
]

// Existing public topic names stay unchanged; the icon follows their meaning.
const topicIconRules = [
  [/求助|提问|问题|help|question/i, 'message-circle-question-mark'],
  [/改装|升级|tuning|upgrade/i, 'sliders-horizontal'],
  [/夜骑|night/i, 'moon'],
  [/晨骑|morning|sunrise/i, 'sunrise'],
  [/电池|battery/i, 'battery'],
  [/充电|charging/i, 'battery-charging'],
  [/续航|range/i, 'gauge'],
  [/三电|智能|electronics/i, 'cpu'],
  [/安全|safety/i, 'shield-check'],
  [/上牌|政策|registration|policy/i, 'file-badge'],
  [/保养|维修|care|maintenance/i, 'wrench'],
  [/晒车|照片|开箱|photo/i, 'camera'],
  [/通勤|最后一公里|commut/i, 'route'],
  [/周末|露营|camp|weekend/i, 'tent'],
  [/骑行|助力|自行车|cycling|ride|bicycle/i, 'bike'],
  [/电摩|滑板车|scooter/i, 'gauge'],
  [/品牌|颜值|专利|brand|style/i, 'sparkles'],
  [/科普|攻略|总结|guide/i, 'book-open'],
  [/新手|beginner/i, 'graduation-cap'],
  [/制造|工厂|工艺|溯源|ODM|OEM/i, 'factory'],
  [/合作|亲子|cooperat/i, 'handshake'],
  [/生活|咖啡|life|coffee/i, 'coffee'],
  [/舒适|comfort/i, 'armchair'],
  [/选购|探店|shopping/i, 'shopping-bag'],
  [/新品|配件|accessor|new product/i, 'package'],
  [/省钱|优惠|discount/i, 'ticket-percent'],
  [/图片|\d+图|photo layout/i, 'images'],
  [/排布|布局|layout/i, 'layout-grid'],
  [/城市|city/i, 'map-pin'],
  [/出海|展会|global/i, 'globe'],
  [/海边|自然|nature/i, 'leaf'],
  [/冬季|山|mountain/i, 'mountain'],
]
const extraTopicIcons = ['hash', 'lightbulb', 'heart', 'leaf', 'map-pin', 'sparkles']
export function topicIcon(name = '') {
  const value = normalizeTopic(name)
  const catalog = DISCUSSION_TOPICS.find(topic => topic.name === value)
  if (catalog) return catalog.icon
  const match = topicIconRules.find(([pattern]) => pattern.test(value))
  if (match) return match[1]
  const hash = Array.from(value).reduce((n, char) => (n * 31 + char.codePointAt(0)) >>> 0, 0)
  return extraTopicIcons[hash % extraTopicIcons.length]
}

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

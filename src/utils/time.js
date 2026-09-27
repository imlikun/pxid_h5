// 把 ISO/时间戳格式化为相对时间：刚刚 / N分钟前 / N小时前 / N天前 / 日期
export function formatTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return String(iso)
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 10) return '刚刚'
  if (sec < 60) return sec + '秒前'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + '分钟前'
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr + '小时前'
  const day = Math.floor(hr / 24)
  if (day < 7) return day + '天前'
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 内容时间统一格式，兼容秒/毫秒时间戳；详情保留精确到分钟的发布时间。
function parseFeedDate(value) {
  if (!value) return null
  const number = typeof value === 'number' ? value : /^\d{10,13}$/.test(String(value)) ? Number(value) : null
  const date = new Date(number === null ? value : number < 1e12 ? number * 1000 : number)
  return Number.isNaN(date.getTime()) ? null : date
}
export function formatPublishedTime(value) {
  const date = parseFeedDate(value)
  if (!date) return value ? String(value) : ''
  const pad = n => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
}
export function formatFeedTime(value, language = 'zh') {
  const date = parseFeedDate(value)
  if (!date) return value ? String(value) : ''
  const seconds = (Date.now() - date.getTime()) / 1000
  if (seconds >= 0 && seconds < 60) return { zh: '刚刚', en: 'Just now', pt: 'Agora' }[language] || 'Just now'
  if (seconds >= 60 && seconds < 86400 * 7) {
    const unit = seconds < 3600 ? 'minute' : seconds < 86400 ? 'hour' : 'day'
    const divisor = unit === 'minute' ? 60 : unit === 'hour' ? 3600 : 86400
    return new Intl.RelativeTimeFormat(language, { numeric: 'always' }).format(-Math.floor(seconds / divisor), unit)
  }
  return formatPublishedTime(value).slice(0, 10)
}

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

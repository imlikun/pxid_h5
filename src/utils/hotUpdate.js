// ============================================================
// 热更新检测（样式/逻辑改动 = 新构建产物 hash 变化）
// ------------------------------------------------------------
// 背景：App WebView 里下拉刷新原本只重拉数据，不重载 JS/CSS 包，
//       导致样式修改看不到，必须退出重进。
// 方案：把「下拉刷新」扩展为——先对比线上 index.html 引用的
//       JS 包 hash 与当前页面加载的是否一致：
//         · 不一致 → 线上有新版本（样式/逻辑），调用方 location.reload()
//                    整页重载 → 拉新 index.html → 下载新 hash 的 JS/CSS
//         · 一致   → 走原来的纯数据刷新（快，不重载页面）
// 依赖线上 index.html 带 no-cache 头（部署时已保证），fetch 再叠加
// no-store + 时间戳防 WebView 缓存兜底。
// ============================================================

// 当前页面加载的 JS 包 hash（如 index-DH5Qn0yf.js → DH5Qn0yf）
export function currentBundleId() {
  const el = document.querySelector('script[src*="index-"][src$=".js"]')
  const m = el && el.getAttribute('src').match(/index-([\w-]+)\.js/)
  return m ? m[1] : ''
}

// 线上 index.html 引用的最新 JS 包 hash
export async function fetchLatestBundleId() {
  const res = await fetch('./index.html?t=' + Date.now(), { cache: 'no-store' })
  const html = await res.text()
  const m = html.match(/assets\/index-([\w-]+)\.js/)
  return m ? m[1] : ''
}

// 是否存在热更新（检测失败视为无更新，不打断正常刷新）
export async function hasHotUpdate() {
  try {
    const cur = currentBundleId()
    if (!cur) return false
    const latest = await fetchLatestBundleId()
    return !!(latest && latest !== cur)
  } catch (e) {
    return false
  }
}

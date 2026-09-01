// 精选商品数据层：对接后端 /mall-api/products（Shopify 代理）
// 多店路由：region 不再由 Flutter 单独注入，而是由当前界面语言映射（2026-08-31 定）
//   zh→CN，pt→BR，en→US。见 src/i18n/index.js 的 regionFromLocale。
import { locale, regionFromLocale } from '../i18n'

// 地区随语言自动映射：中文看中国店，葡语看巴西店，英文看全球店
export async function initRegion() {
  return regionFromLocale(locale.value)
}

export const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

// ⚠️ 必须用 reactive：FeaturedView 里 `const all = computed(() => getProducts())` 依赖本模块的导出数据。
// 旧实现是 `let _cache = {...}` 重新赋值整个对象，Vue 无法追踪非响应式的闭包变量读取，
// 导致 computed 只在 setup 时求值一次（拿到初始空数组），fetchProducts 异步回填后视图永不刷新 → 精选商城整片空白。
import { reactive } from 'vue'
const _cache = reactive({ region: null, list: [], store: '', currency: 'USD' })
let _loading = null
let _lastError = ''

export function getRegion() {
  return regionFromLocale(locale.value)
}

export async function fetchProducts(region = getRegion()) {
  if (_loading) return _loading
  _loading = (async () => {
    try {
      const url = `${API_BASE}/mall-api/products?region=${region}`
      console.log('[shop] fetching', url)
      const r = await fetch(url)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      const payload = json.data || json
      const list = Array.isArray(payload.list) ? payload.list : []
      // 原地修改 reactive 字段（不要整体重赋值 _cache，否则 computed 不会刷新）
      _cache.region = region
      _cache.list = list
      _cache.store =
        payload.store || (json.data && json.data.store) || _cache.store || ''
      _cache.currency = payload.currency || _cache.currency
      _lastError = ''
      console.log('[shop] got', list.length, 'products, store=', _cache.store)
    } catch (e) {
      _lastError = String(e.message || e)
      console.error('[shop] fetch failed:', _lastError)
      // 不覆盖旧缓存（如果有缓存数据就继续展示旧的）
    } finally {
      _loading = null
    }
    return _cache
  })()
  return _loading
}

export function getProducts() {
  return _cache.list
}

/** 最后一次错误信息（用于 UI 展示） */
export function getLastError() {
  return _lastError
}

export function getProductByHandle(handle) {
  if (!handle) return null
  return (
    _cache.list.find(
      (p) => p.handle === handle || String(p.id) === String(handle)
    ) || null
  )
}

// 单品详情：按 Shopify 对应链接真拉（/mall-api/products/:handle 服务端代拉 Shopify 商品 JSON）
//   返回完整字段：含 description(body_html 富文本) / vendor / options / images / variants
//   ECS→Shopify 偶发 fetch failed，最多重试 2 次（间隔 600ms）提升稳定性
export async function fetchProductDetail(handle, region = getRegion()) {
  const url = `${API_BASE}/mall-api/products/${encodeURIComponent(handle)}?region=${region}`
  let lastErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      const payload = json.data || json
      return payload.product || null
    } catch (e) {
      lastErr = e
      console.error('[shop] detail fetch failed (attempt ' + (attempt + 1) + '):', String(e.message || e))
      if (attempt < 2) await new Promise((res) => setTimeout(res, 600))
    }
  }
  console.error('[shop] detail fetch finally failed:', String(lastErr && lastErr.message))
  return null
}

export function getStore() {
  return _cache.store
}

export function getCurrency() {
  return _cache.currency
}

// 币种符号映射
export function sym(currency) {
  return (
    { USD: '$', CNY: '¥', EUR: '€', GBP: '£', JPY: '¥' }[currency] ||
    currency ||
    ''
  )
}

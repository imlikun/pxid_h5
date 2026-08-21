// 精选商品数据层：对接后端 /mall-api/products（Shopify 代理）
// 多店路由：region 由 Flutter 原生桥注入（window.PXIDBridge.getRegion），后端 REGION_STORES 已就绪
//   半自动接线：默认 US 兜底；原生注入 getRegion() 后自动生效，无需改此处（见 initRegion/setRegion）
const DEFAULT_REGION = 'US'
let currentRegion = DEFAULT_REGION

// 预留 Flutter 接线位：原生注入 window.PXIDBridge.getRegion() 后自动生效；未注入（H5 预览/mock）保持默认 US
export async function initRegion() {
  try {
    const native = (typeof window !== 'undefined' && window.PXIDBridge) || null
    if (native && typeof native.getRegion === 'function') {
      const r = await native.getRegion()
      if (r) currentRegion = String(r).toUpperCase()
    }
  } catch (e) {
    // bridge 未注入，保持默认
    console.error('[shop] initRegion failed:', e.message || e)
  }
  return currentRegion
}

// 供 Flutter 切地区时调用（§7.1 region 变化通知），触发 H5 重拉对应店商品
export function setRegion(r) {
  if (r) currentRegion = r
  return currentRegion
}

export const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

let _cache = { region: null, list: [], store: '', currency: 'USD' }
let _loading = null
let _lastError = ''

export function getRegion() {
  return currentRegion
}

export async function fetchProducts(region = currentRegion) {
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
      _cache = {
        region,
        list,
        store:
          payload.store || (json.data && json.data.store) || _cache.store || '',
        currency: payload.currency || _cache.currency,
      }
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
export async function fetchProductDetail(handle, region = currentRegion) {
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

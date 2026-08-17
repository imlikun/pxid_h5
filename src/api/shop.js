// ============================================================
// 商城数据层 —— Shopify 直连（每国一店）
// ------------------------------------------------------------
// 后端就是 Shopify（Headless 终态）：商品列表/详情直接 GET 该国店铺的
//   /products.json（公开只读，无需 token，浏览器/WebView 均可直连）。
// 每国一个店铺：域名 + 币种在此按 country 配置（多国定位见
//   docs/PXID_多国定位_i18n_对接规范.md；结账桥接见
//   docs/PXID_Shopify_结账桥接_Flutter版.md）。
// 兜底：网络失败/未配置店铺时回落 mock.products，保证离线可预览。
// ============================================================

import { products as mockProducts } from '../data/mock'

// 每国一店配置：country → { domain, currency }
// 缺省为演示店铺 marsantsx（USD）。上线前按实际国家店铺补全。
const STORES = {
  // 示例：'DE': { domain: 'de.marsantsx.com', currency: 'EUR' },
  // 示例：'US': { domain: 'us.marsantsx.com', currency: 'USD' },
  default: { domain: 'www.marsantsx.com', currency: 'USD' },
}

let localeCache = null
async function getCountry() {
  try {
    if (!localeCache) {
      // 与 bridge.getLocale 一致；未注入时用默认
      const b = window.PXIDBridge
      if (b && b.getLocale) localeCache = await b.getLocale()
      else localeCache = { country: 'CN', currency: 'CNY' }
    }
    return localeCache.country || 'CN'
  } catch (e) {
    return 'CN'
  }
}

function storeFor(country) {
  return STORES[country] || STORES.default
}

// ---- 归一化：Shopify product JSON → 本规范 Product ----
function normalize(p, { domain, currency }) {
  const v0 = (p.variants && p.variants[0]) || {}
  const imgs = (p.images || []).map((i) => i.src).filter(Boolean)
  const type = (p.product_type || '').toLowerCase()
  const tags = (p.tags || []).join(' ').toLowerCase()
  // 分区映射（对齐 mock.collection）：bike/电动自行车 → spring（踏春），其余配件 → p1parts
  const collection = /bike|ebike|scooter|electric/.test(type + ' ' + tags) ? 'spring' : 'p1parts'
  return {
    id: String(p.id),
    handle: p.handle,
    name: p.title,
    price: Number(v0.price) || 0,
    origin: v0.compare_at_price ? Number(v0.compare_at_price) : null,
    currency,
    cover: imgs[0] || (p.featured_image && p.featured_image.src) || '',
    images: imgs,
    tag: (p.tags && p.tags[0]) || p.product_type || '',
    tags: p.tags || [],
    sales: 0, // Shopify 无原生销量，展示用 tag 代替
    collection,
    shopUrl: `https://${domain}/products/${p.handle}`,
    body_html: p.body_html || '',
    options: (p.options || []).map((o) => ({ name: o.name, values: o.values })),
    variants: (p.variants || []).map((v) => ({
      id: String(v.id),
      title: v.title,
      price: Number(v.price) || 0,
      available: v.available !== false,
      sku: v.sku || '',
      option1: v.option1 || '',
    })),
  }
}

// ---- 拉取：优先真实店铺，失败回落 mock ----
let cache = null

export async function fetchProducts() {
  if (cache) return cache
  const country = await getCountry()
  const store = storeFor(country)
  try {
    const res = await fetch(`https://${store.domain}/products.json?limit=250`)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    const list = (data.products || []).map((p) => normalize(p, store))
    if (list.length) {
      cache = list
      return list
    }
    throw new Error('empty')
  } catch (e) {
    // 兜底：mock 数据（离线/未配置店铺时预览仍可用）
    return mockProducts.map((p) => ({ ...p, currency: p.currency || 'CNY' }))
  }
}

export async function fetchProduct(idOrHandle) {
  const list = await fetchProducts()
  const hit = list.find((p) => p.id === String(idOrHandle) || p.handle === idOrHandle)
  if (hit) return hit
  // 列表没命中（比如 handle 直查详情）：尝试真实单商品接口
  const country = await getCountry()
  const store = storeFor(country)
  try {
    const res = await fetch(`https://${store.domain}/products/${idOrHandle}.json`)
    if (res.ok) {
      const data = await res.json()
      if (data.product) return normalize(data.product, store)
    }
  } catch (e) {
    /* ignore */
  }
  return null
}

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
  const base = {
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
    intro: null, // 结构化介绍（Codex 契约 §8）；products.json 公开端点不返回，由 Storefront API metafield 提供
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
  // demo：折叠车（handle=p4）注入一份结构化介绍，验证 H5 渲染流程
  // 上线后由 Shopify 兄弟按 Codex 契约 §8 在 metafield (custom.intro) 提供真实数据
  if (p.handle === 'p4') {
    base.intro = {
      summary: '20 寸轻量折叠电助力车，城市通勤 + 户外骑行一车搞定。',
      highlights: [
        '5 秒折叠，地铁 / 办公室 / 后备箱轻松放',
        '250W 高效电机，48V 锂电池',
        '续航 40-60km，纯电 + 助力双模式',
        'LED 仪表 + 机械碟刹，安全可靠',
      ],
      sections: [
        {
          title: '便携折叠',
          body: '6061 铝合金一体车架，5 秒三步折叠，折叠后体积仅 0.3 m³，地铁、办公室、汽车后备箱轻松放入。',
          image: imgs[1] || imgs[0] || '',
        },
        {
          title: '动力性能',
          body: '250W 高速无刷电机 + 48V 10Ah 可拆卸锂电池，最高时速 25 km/h，纯电续航 40 km，助力续航 60 km。',
          specs: [
            { k: '电机', v: '250W 高速无刷' },
            { k: '电池', v: '48V 10Ah 锂电池' },
            { k: '续航', v: '纯电 40km / 助力 60km' },
            { k: '充电时间', v: '4-6 小时' },
            { k: '最大载重', v: '120 kg' },
            { k: '整车重量', v: '21 kg' },
          ],
        },
        {
          title: '安全配置',
          body: '前后机械碟刹 + EABS 断电刹车，LED 大灯 + 尾灯，夜间骑行更安心。',
          specs: [
            { k: '刹车', v: '前后机械碟刹 + EABS' },
            { k: '灯光', v: 'LED 大灯 + 尾灯' },
            { k: '仪表', v: 'LCD 多功能显示' },
          ],
        },
      ],
    }
  }
  return base
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

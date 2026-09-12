import { getRegion } from '../api/shop'
import { variantForCover, colorOf } from './productPresentation'

const KEY = 'pxid_product_entries_v2'
const TTL = 10 * 60 * 1000
function entries() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(data) ? data.filter((e) => e && Date.now() - e.time < TTL) : []
  } catch { return [] }
}
export function productRoute(product) {
  const handle = String(product.handle || product.id)
  const region = getRegion()
  const cover = product.cover || ''
  const images = product.imageDetails || product.images || []
  const variant = variantForCover({ ...product, images }, cover)
  // 列表已有的完整展示字段一次交给详情；图片元数据不会触发资源加载。
  const snap = { id: product.id, handle, name: product.name, price: product.price, currency: product.currency, cover,
    images, options: product.options || [], variants: product.variants || [], shopUrl: product.shopUrl || '',
    origin: product.origin, vendor: product.vendor || '', tag: product.tag || '', tagline: product.tagline || '',
    description: product.description || '', specs: product.specs || [], sellingPoints: product.sellingPoints || [],
    presentationComplete: true }

  try {
    const list = entries().filter((e) => e.handle !== handle || e.region !== region)
    list.push({ handle, region, time: Date.now(), product: snap })
    localStorage.setItem(KEY, JSON.stringify(list.slice(-20)))
  } catch { /* 存储隔离/禁用时 URL 首图仍可跨 WebView 直出 */ }
  const query = new URLSearchParams({ region })
  if (cover) query.set('cover', cover)
  if (variant) { query.set('variant', String(variant.id)); if (colorOf(variant)) query.set('color', colorOf(variant)) }
  return '/product/' + encodeURIComponent(handle) + '?' + query.toString()
}
export function productEntry(handle, query) {
  const cover = typeof query.cover === 'string' && /^(https?:\/\/|\/)/.test(query.cover) ? query.cover : ''
  if (!cover) return null
  const hit = entries().find((e) => e.handle === String(handle) && e.region === query.region && e.product?.cover === cover)
  return hit?.product || { handle: String(handle), name: '', price: 0, cover, images: [cover], options: [], variants: [] }
}

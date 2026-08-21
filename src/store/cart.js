import { reactive, computed } from 'vue'

// 轻量购物车：reactive + localStorage 持久化（换设备/清缓存才丢，M-MVP0 足够）
// 多店：每个 item 带 region/store，结算时按当前地区拼 Shopify permalink
const LS_KEY = 'pxid_cart_v1'

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.items)) return parsed.items
    }
  } catch (e) {
    /* ignore */
  }
  return []
}

export const cart = reactive({ items: load() })

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ items: cart.items }))
  } catch (e) {
    /* ignore */
  }
}

// 唯一键：商品 id + 变体 id（同一商品不同规格算两行）
export function addToCart(product, opts = {}) {
  const variantId = opts.variantId || 'def'
  const key = `${product.id}__${variantId}`
  const qty = opts.qty || 1
  const found = cart.items.find((i) => i.key === key)
  if (found) {
    found.qty += qty
    found.checked = true
  } else {
    cart.items.push({
      key,
      id: product.id,
      handle: product.handle || product.id,
      name: product.name,
      price: opts.price != null ? opts.price : product.price,
      currency: product.currency || 'USD',
      cover: product.cover || (product.images && product.images[0]) || '',
      shopUrl: product.shopUrl || '',
      variantId,
      variantTitle: opts.variantTitle || '',
      region: opts.region || 'US',
      store: opts.store || '',
      qty,
      checked: true,
    })
  }
  persist()
}

export function removeFromCart(key) {
  const idx = cart.items.findIndex((i) => i.key === key)
  if (idx > -1) {
    cart.items.splice(idx, 1)
    persist()
  }
}

// 结算后清车（Shopify permalink 是"添加"语义，跳转即代表已带到 Shopify 车）
export function clearChecked() {
  const checked = cart.items.filter((i) => i.checked)
  checked.forEach((i) => removeFromCart(i.key))
}

export function changeQty(key, delta) {
  const found = cart.items.find((i) => i.key === key)
  if (!found) return
  found.qty += delta
  if (found.qty <= 0) removeFromCart(key)
  else persist()
}

export function toggleChecked(key) {
  const found = cart.items.find((i) => i.key === key)
  if (found) {
    found.checked = !found.checked
    persist()
  }
}

export function toggleAllChecked(val) {
  cart.items.forEach((i) => (i.checked = val))
  persist()
}

// 总件数（用于购物车角标）
export const cartCount = computed(() =>
  cart.items.reduce((sum, i) => sum + i.qty, 0)
)

// 总金额（单店同币种，直接求和）
export const cartTotal = computed(() =>
  cart.items.reduce((sum, i) => sum + i.price * i.qty, 0)
)

// ---- 勾选相关 ----
export const allChecked = computed(
  () => cart.items.length > 0 && cart.items.every((i) => i.checked)
)

export const checkedItems = computed(() => cart.items.filter((i) => i.checked))

export const checkedCount = computed(() =>
  checkedItems.value.reduce((sum, i) => sum + i.qty, 0)
)

export const checkedTotal = computed(() =>
  checkedItems.value.reduce((sum, i) => sum + i.price * i.qty, 0)
)

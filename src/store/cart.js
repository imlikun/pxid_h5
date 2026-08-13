import { reactive, computed } from 'vue'

// 轻量购物车：用 reactive 即可，无需引入 Pinia / Vuex
export const cart = reactive({ items: [] })

export function addToCart(product, qty = 1) {
  const found = cart.items.find((i) => i.id === product.id)
  if (found) {
    found.qty += qty
    found.checked = true
  } else {
    cart.items.push({ ...product, qty, checked: true })
  }
}

export function removeFromCart(id) {
  const idx = cart.items.findIndex((i) => i.id === id)
  if (idx > -1) cart.items.splice(idx, 1)
}

export function changeQty(id, delta) {
  const found = cart.items.find((i) => i.id === id)
  if (!found) return
  found.qty += delta
  if (found.qty <= 0) removeFromCart(id)
}

export function toggleChecked(id) {
  const found = cart.items.find((i) => i.id === id)
  if (found) found.checked = !found.checked
}

export function toggleAllChecked(val) {
  cart.items.forEach((i) => (i.checked = val))
}

// 总件数（用于购物车角标）
export const cartCount = computed(() =>
  cart.items.reduce((sum, i) => sum + i.qty, 0)
)

// 总金额
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

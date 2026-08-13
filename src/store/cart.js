import { reactive, computed } from 'vue'

// 轻量购物车：用 reactive 即可，无需引入 Pinia / Vuex
export const cart = reactive({ items: [] })

export function addToCart(product, qty = 1) {
  const found = cart.items.find((i) => i.id === product.id)
  if (found) {
    found.qty += qty
  } else {
    cart.items.push({ ...product, qty })
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

// 总件数（用于购物车角标）
export const cartCount = computed(() =>
  cart.items.reduce((sum, i) => sum + i.qty, 0)
)

// 总金额
export const cartTotal = computed(() =>
  cart.items.reduce((sum, i) => sum + i.price * i.qty, 0)
)

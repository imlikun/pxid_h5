<template>
  <div class="pcard press" @click="go">
    <img class="pcard__cover" :src="product.cover" :alt="product.name" />
    <div class="pcard__name">{{ product.name }}</div>
    <div class="pcard__price">
      <span class="price">{{ fmt(product.price) }}</span>
      <span v-if="product.origin" class="origin">{{ fmt(product.origin) }}</span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()

function fmt(v) {
  const c = props.product.currency || 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(v)
  } catch (e) {
    return c + ' ' + v
  }
}

function go() {
  // 商城 Headless：点商品进站内详情页（真实 Shopify 数据），结账才跳 Shopify
  router.push('/product/' + (props.product.handle || props.product.id))
}
</script>

<style scoped>
.pcard {
  background: var(--card);
  border-radius: var(--radius);
  overflow: hidden;
}
.pcard__cover {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}
.pcard__name {
  padding: 10px 10px 4px;
  font-size: 13px;
  line-height: 1.3;
  min-height: 34px;
  color: var(--text);
}
.pcard__price {
  padding: 4px 10px 12px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 16px;
}
.origin {
  color: var(--text-sub);
  font-size: 11px;
  text-decoration: line-through;
}
</style>

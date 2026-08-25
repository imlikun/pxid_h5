<template>
  <div class="pcard press" @click="go">
    <img class="pcard__cover" :src="product.cover" :alt="product.name" loading="lazy" />
    <div class="pcard__name">{{ product.name }}</div>
    <div class="pcard__price">
      <span class="price">{{ sym(product.currency) }}{{ product.price }}</span>
      <span v-if="product.origin" class="origin">{{ sym(product.currency) }}{{ product.origin }}</span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { sym } from '../api/shop'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()

function go() {
  // PRD v2：点商品进入 H5 详情页（展示详情 + 本地购物车 + 结算跳 Shopify）
  const h = props.product.handle || props.product.id
  router.push('/product/' + h)
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

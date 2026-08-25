<template>
  <div class="pcard press" @click="go">
    <div class="pcard__media">
      <img class="pcard__cover" :src="product.cover" :alt="product.name" loading="lazy" />
    </div>
    <div class="pcard__body">
      <div class="pcard__name">{{ product.name }}</div>
      <div class="pcard__price">
        <span class="price">{{ sym(product.currency) }}{{ product.price }}</span>
        <span v-if="product.origin" class="origin">{{ sym(product.currency) }}{{ product.origin }}</span>
      </div>
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
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.pcard:active {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(77, 124, 255, 0.18);
}
.pcard__media {
  position: relative;
  overflow: hidden;
}
.pcard__cover {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}
.pcard__body {
  padding: 12px 12px 14px;
}
.pcard__name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  min-height: 38px;
  color: var(--text);
}
.pcard__price {
  margin-top: 6px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price {
  color: var(--price);
  font-weight: 800;
  font-size: 17px;
}
.origin {
  color: var(--text-sub);
  font-size: 11px;
  text-decoration: line-through;
}
</style>

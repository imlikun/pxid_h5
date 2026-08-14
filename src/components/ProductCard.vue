<template>
  <div class="pcard" @click="go">
    <img class="pcard__cover" :src="product.cover" :alt="product.name" />
    <div class="pcard__name">{{ product.name }}</div>
    <div class="pcard__price">
      <span class="price">¥{{ product.price }}</span>
      <span v-if="product.origin" class="origin">¥{{ product.origin }}</span>
    </div>
  </div>
</template>

<script setup>
import { bridge } from '../bridge'

const props = defineProps({
  product: { type: Object, required: true },
})

function go() {
  // 商城与 Shopify 打通：H5 仅展示，点击跳 Shopify 购买
  bridge.openShopify(props.product.shopUrl)
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

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
import bridge from '../bridge'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()

function go() {
  // PRD v2：点商品进入 H5 详情页（展示详情 + 本地购物车 + 结算跳 Shopify）
  const h = props.product.handle || props.product.id
  // 白名单二级路由优先走全屏右滑通道（2026-09-11，与 FeaturedView.openSecondary 同一契约）：
  // 本组件用在精选根页（根 WebView），H5 内 push 等于把 /product 开在根 WebView 里
  // → 底部露出 Flutter 原生 tab（2026-09-11 截图问题③同类症状）。
  // 根 WebView 下发 ToFlutter_H5OpenFullscreen 交原生全屏打开；
  // 非根 WebView（已在全屏二级页内）/无 channel（浏览器预览）由 openFullscreenRoute 返回 false 自动回退。
  const route = '/product/' + h
  if (bridge.openFullscreenRoute(route)) return
  router.push(route)
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

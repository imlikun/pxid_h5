<template>
  <div class="pcard press" @click="go">
    <div class="pcard__media">
      <img class="pcard__cover" :src="product.cover" :alt="product.name" loading="lazy" />
      <span v-if="badge" class="pcard__badge">{{ badge }}</span>
    </div>
    <div class="pcard__name">{{ product.name }}</div>
    <div class="pcard__price">
      <div class="pcard__prices">
        <span class="price">{{ sym(product.currency) }}{{ product.price }}</span>
        <span v-if="product.origin" class="origin">{{ sym(product.currency) }}{{ product.origin }}</span>
      </div>
      <button type="button" class="pcard__action" :aria-label="`${product.name} · ${actionLabel}`" @click.stop="go">
        <IconSvg name="shopping-cart" :size="18" :stroke="1.9" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { sym } from '../api/shop'
import bridge from '../bridge'
import { productRoute } from '../utils/productNavigation'
import IconSvg from './IconSvg.vue'

const props = defineProps({
  product: { type: Object, required: true },
  badge: { type: String, default: '' },
  actionLabel: { type: String, default: '选择规格' },
})

const router = useRouter()

function go() {
  // PRD v2：点商品进入 H5 详情页（展示详情 + 本地购物车 + 结算跳 Shopify）
  // 白名单二级路由优先走全屏右滑通道（2026-09-11，与 FeaturedView.openSecondary 同一契约）：
  // 本组件用在精选根页（根 WebView），H5 内 push 等于把 /product 开在根 WebView 里
  // → 底部露出 Flutter 原生 tab（2026-09-11 截图问题③同类症状）。
  // 根 WebView 下发 ToFlutter_H5OpenFullscreen 交原生全屏打开；
  // 非根 WebView（已在全屏二级页内）/无 channel（浏览器预览）由 openFullscreenRoute 返回 false 自动回退。
  const route = productRoute(props.product)
  if (bridge.openFullscreenRoute(route)) return
  router.push(route)
}
</script>

<style scoped>
.pcard {
  background: #fff;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(42, 86, 156, .06);
  border: 1px solid #eef2fa;
  min-width: 0;
}
.pcard__media { position: relative; background: #fff; }
.pcard__badge {
  position: absolute;
  top: 7px;
  left: 7px;
  border-radius: 7px;
  padding: 3px 6px;
  background: linear-gradient(110deg, #6a9cff, #3970f9);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.pcard__cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  display: block;
}
.pcard__name {
  padding: 8px 9px 0;
  font-size: 13px;
  line-height: 1.35;
  min-height: 43px;
  color: var(--text);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.pcard__price {
  padding: 6px 9px 10px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2px;
}
.pcard__prices {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
}
.price {
  color: #ee3d48;
  font-weight: 700;
  font-size: 17px;
}
.origin {
  color: #98a3ba;
  font-size: 11px;
  text-decoration: line-through;
}
.pcard__action {
  display: grid;
  place-items: center;
  flex: 0 0 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: #4479fb;
  cursor: pointer;
}
.pcard__action:focus-visible { outline: 2px solid #1d53d8; outline-offset: 2px; }
</style>

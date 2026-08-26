<template>
  <div class="page">
    <!-- 顶部导航：透明浮层在 Hero 图上 -->
    <div class="nav-bar">
      <button class="back press" @click="router.back()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="nav-title">{{ v?.shortName || '车型' }}</span>
      <div class="nav-placeholder"></div>
    </div>

    <!-- 未找到 -->
    <div v-if="!v" class="notfound">
      <p>未找到该车型</p>
      <button class="press back-btn" @click="router.back()">返回</button>
    </div>

    <template v-if="v">
      <!-- ===== Hero 大图区 ===== -->
      <section class="hero">
        <img class="hero-img" :src="heroUrl" :alt="v.name" />
        <div class="hero-overlay">
          <span class="hero-tag">产品配置</span>
        </div>
      </section>

      <!-- 车型名 + slogan -->
      <section class="intro fade-up stagger-1">
        <h1 class="v-name">{{ v.name }}</h1>
        <p class="v-slogan">{{ v.slogan }}</p>
      </section>

      <!-- 车友圈入口条 -->
      <section class="community-bar card fade-up stagger-3" @click="onCommunity">
        <div class="comm-left">
          <div class="comm-avatars">
            <span class="ca a1">骑</span><span class="ca a2">王</span><span class="ca a3">强</span>
          </div>
          <span class="comm-label">车友圈</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </section>

      <!-- ===== 选车配置区（核心） ===== -->
      <section class="config-card card fade-up stagger-4">
        <!-- 标题行：车型 + 价格 -->
        <div class="config-header">
          <div>
            <h2 class="cfg-title">{{ v.name }} {{ selectedConfigName }}</h2>
            <p class="cfg-sub">{{ v.series }} · {{ v.specs[0]?.value || '' }} 续航</p>
          </div>
          <div class="price-block">
            <span class="price-symbol">{{ v.priceUnit }}</span>
            <span class="price-num">{{ currentPrice.toLocaleString() }}</span>
          </div>
        </div>

        <!-- 配置组循环 -->
        <div v-for="group in v.configGroups" :key="group.key" class="cfg-group">
          <div class="cfg-label">{{ group.label }}</div>
          <div class="cfg-options">
            <button
              v-for="opt in group.options"
              :key="opt.id"
              class="cfg-opt press"
              :class="{ on: selections[group.key] === opt.id }"
              @click="selectOption(group.key, opt)"
            >
              <!-- 颜色类：显示色块 -->
              <span v-if="opt.color" class="color-dot" :style="{ background: opt.color }"></span>
              <span class="opt-name">{{ opt.name }}</span>
              <span v-if="opt.desc" class="opt-desc">{{ opt.desc }}</span>
              <span v-if="opt.priceDiff !== 0" class="opt-diff" :class="{ plus: opt.priceDiff > 0 }">
                {{ opt.priceDiff > 0 ? '+' : '' }}{{ opt.priceDiff }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- 核心参数卡片 -->
      <section class="specs-card card fade-up stagger-5">
        <h3 class="sec-title">核心参数</h3>
        <div class="specs-grid">
          <div v-for="s in v.specs" :key="s.label" class="spec-item">
            <span class="spec-l">{{ s.label }}</span>
            <span class="spec-v">{{ s.value }}</span>
          </div>
        </div>
      </section>

      <!-- 车辆描述 -->
      <section class="desc-card card fade-up stagger-6">
        <p class="desc-text">{{ v.description }}</p>
      </section>

      <!-- 车主口碑 -->
      <section class="reviews-card card fade-up stagger-7">
        <div class="sec-header">
          <h3 class="sec-title">车主口碑</h3>
          <span class="sec-more">{{ v.reviews.length }} 条评价</span>
        </div>
        <div v-for="(r, i) in v.reviews" :key="i" class="review-item">
          <div class="rv-head">
            <img class="rv-avatar" :src="avatarUrl(r.avatar)" alt="" loading="lazy" />
            <div class="rv-info">
              <span class="rv-author">{{ r.author }}</span>
              <span class="rv-time">{{ r.time }}</span>
            </div>
            <div class="rv-stars">
              <span v-for="n in 5" :key="n" :class="{ filled: n <= r.rating }">&#9733;</span>
            </div>
          </div>
          <p class="rv-body">{{ r.content }}</p>
          <div class="rv-foot"><span class="rv-like">{{ r.likes }} 赞</span></div>
        </div>
      </section>

      <!-- 热门推荐（横向滚动） -->
      <section class="related-card fade-up stagger-8">
        <h3 class="sec-title" style="padding: 0 12px 10px;">热门推荐</h3>
        <div class="related-scroll">
          <div
            v-for="rid in v.relatedModels"
            :key="rid"
            class="related-item press"
            @click="router.push('/vehicle/' + rid)"
          >
            <img class="rel-cover" :src="relatedCover(rid)" alt="" loading="lazy" />
            <span class="rel-name">{{ relatedName(rid) }}</span>
          </div>
        </div>
      </section>

      <!-- 了解 PXID 品牌区 -->
      <section class="brand-card card fade-up stagger-9">
        <div class="brand-logo">PXID 品向智造</div>
        <p class="brand-text">专注智能出行领域，涵盖电助力自行车、电动滑板车、电摩三条产品线。从城市通勤到全地形越野，PXID 为每一位骑行者提供专业解决方案。</p>
        <div class="brand-tags">
          <span class="btag">自主研发</span>
          <span class="btag">全球销售</span>
          <span class="btag">2 年质保</span>
        </div>
      </section>

      <!-- 底部占位（给 fixed footer 留空间） -->
      <div class="bottom-spacer"></div>
    </template>

    <!-- 底部固定栏 -->
    <div v-if="v" class="footer-bar">
      <div class="f-price">
        <span class="fp-symbol">¥</span><span class="fp-num">{{ currentPrice.toLocaleString() }}</span>
        <span class="fp-hint">起</span>
      </div>
      <button class="f-buy press" @click="onOrder">立即订购</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getVehicleDetail, vehicleCatalog, plazaShowcase } from '../data/mock'
import { bridge } from '../bridge'

const router = useRouter()
const route = useRoute()
const BASE = import.meta.env.BASE_URL

// 当前车型
const v = computed(() => getVehicleDetail(route.params.id))
const heroUrl = computed(() => (v.value ? BASE + v.value.heroImage : ''))

// 选中的配置
const selections = reactive({})
function initSelections() {
  if (!v.value) return
  selections._model = v.value.id
  for (const g of v.value.configGroups) {
    if (!selections[g.key]) selections[g.key] = g.options[0].id
  }
}
initSelections()

function selectOption(groupKey, opt) {
  selections[groupKey] = opt.id
}

// 动态价格计算
const currentPrice = computed(() => {
  if (!v.value) return 0
  let total = v.value.price
  for (const g of v.value.configGroups) {
    const sel = g.options.find((o) => o.id === selections[g.key])
    if (sel) total += sel.priceDiff
  }
  return total
})

const selectedConfigName = computed(() => {
  if (!v.value) return ''
  const parts = []
  for (const g of v.value.configGroups) {
    const sel = g.options.find((o) => o.id === selections[g.key])
    if (sel) parts.push(sel.name)
  }
  return parts.join(' / ')
})

// 头像 URL
function avatarUrl(path) { return path ? BASE + path : '' }

// 相关车型
function relatedCover(id) {
  const detail = vehicleCatalog[id]
  if (detail) return BASE + detail.heroImage
  const item = plazaShowcase.find((c) => c.id === id)
  return item ? BASE + item.cover : ''
}
function relatedName(id) {
  const detail = vehicleCatalog[id]
  if (detail) return detail.shortName || detail.code
  const item = plazaShowcase.find((c) => c.id === id)
  return item ? item.name : id
}

// CTA 操作
function onOrder() {
  const url = v.value?.shopUrl
  if (url) {
    window.open(url, '_blank')
  } else {
    // 无 Shopify 映射时走原生购买流程
    bridge.openNative('buy/order?model=' + v.value.id)
  }
}
function onCommunity() {
  router.push('/discover')
}
</script>

<style scoped>
/* ========== 页面容器 ========== */
.page { min-height: 100vh; background: var(--bg); padding-bottom: calc(72px + env(safe-area-inset-bottom)); }

/* ========== 导航栏（浮在 Hero 上） ========== */
.nav-bar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 8px;
  background: linear-gradient(to bottom, rgba(0,0,0,.45), transparent);
}
.back { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.nav-title { color: #fff; font-size: 15px; font-weight: 600; letter-spacing: .5px; }
.nav-placeholder { width: 36px; }

/* ========== Hero 区 ========== */
.hero { position: relative; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; }
.hero-img { width: 100%; height: 100%; object-fit: cover; }
.hero-overlay {
  position: absolute; bottom: 14px; left: 14px;
  display: flex; align-items: center; gap: 6px;
}
.hero-tag {
  font-size: 11px; color: rgba(255,255,255,.9); background: rgba(0,0,0,.45);
  padding: 3px 10px; border-radius: var(--radius-pill); backdrop-filter: blur(8px);
}

/* ========== 简介 ========== */
.intro { padding: 16px 16px 4px; }
.v-name { font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 6px; line-height: 1.3; }
.v-slogan { font-size: 13px; color: var(--text-hint); margin: 0; line-height: 1.5; }

/* ========== CTA 双按钮 ========== */
.cta-row { display: flex; gap: 10px; padding: 14px 16px 0; }
.cta {
  flex: 1; height: 44px; border-radius: var(--radius-pill);
  font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center;
}
.cta-primary { background: var(--brand-gradient); color: #fff; box-shadow: 0 4px 14px rgba(77,124,255,.35); }
.cta-outline { background: transparent; color: var(--brand); border: 1.5px solid var(--brand); }

/* ========== 车友圈入口 ========== */
.community-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin: 14px 16px 0; padding: 12px 14px;
}
.comm-left { display: flex; align-items: center; gap: 8px; }
.comm-avatars { display: flex; }
.ca {
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #fff; font-weight: 600; border: 2px solid var(--bg); margin-left: -8px;
}
.a1 { background: #4D7CFF; z-index: 3; margin-left: 0; }
.a2 { background: #ff6b35; z-index: 2; }
.a3 { background: #4a5d3e; z-index: 1; }
.comm-label { font-size: 13px; color: var(--text); font-weight: 500; }

/* ========== 通用卡片 ========== */
.card {
  margin: 14px 16px 0; background: var(--card); border-radius: var(--radius-xl);
  overflow: hidden;
}

/* ========== 选车配置卡（核心） ========== */
.config-card { padding: 18px 16px 16px; }
.config-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
.cfg-title { font-size: 17px; font-weight: 700; color: var(--text); margin: 0 0 4px; line-height: 1.3; }
.cfg-sub { font-size: 12px; color: var(--text-hint); margin: 0; }
.price-block { text-align: right; }
.price-symbol { font-size: 14px; color: var(--price); font-weight: 600; }
.price-num { font-size: 24px; color: var(--price); font-weight: 800; }

.cfg-group { margin-bottom: 16px; }
.cfg-group:last-child { margin-bottom: 0; }
.cfg-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 10px; }
.cfg-options { display: flex; flex-wrap: wrap; gap: 8px; }
.cfg-opt {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 8px 12px; border-radius: var(--radius);
  background: var(--bg); border: 1.5px solid var(--line);
  font-size: 13px; color: var(--text-sub); transition: all .18s ease;
}
.cfg-opt.on {
  border-color: var(--brand); background: var(--brand-soft); color: var(--brand); font-weight: 600;
}
.color-dot { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,.08); flex-shrink: 0; }
.opt-name { white-space: nowrap; }
.opt-desc { font-size: 11px; color: var(--text-hint); }
.opt-diff { font-size: 11px; color: var(--price); font-weight: 600; }

/* ========== 核心参数 ========== */
.specs-card { padding: 16px; }
.sec-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0 0 12px; }
.sec-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.sec-header .sec-title { margin-bottom: 0; }
.sec-more { font-size: 12px; color: var(--text-hint); }
.specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.spec-item { display: flex; flex-direction: column; gap: 4px; padding: 10px 8px; background: var(--bg); border-radius: var(--radius); }
.spec-l { font-size: 11px; color: var(--text-hint); }
.spec-v { font-size: 14px; font-weight: 600; color: var(--text); }

/* ========== 描述 ========== */
.desc-card { padding: 16px; }
.desc-text { font-size: 13px; color: var(--text-sub); line-height: 1.75; margin: 0; }

/* ========== 口碑 ========== */
.reviews-card { padding: 16px; }
.review-item { padding: 14px 0; border-bottom: 1px solid var(--line); }
.review-item:last-child { border-bottom: none; padding-top: 0; }
.rv-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rv-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: var(--bg); }
.rv-info { flex: 1; display: flex; flex-direction: column; }
.rv-author { font-size: 13px; font-weight: 600; color: var(--text); }
.rv-time { font-size: 11px; color: var(--text-hint); }
.rv-stars { font-size: 12px; color: #ddd; letter-spacing: 1px; }
.rv-stars .filled { color: #ffb800; }
.rv-body { font-size: 13px; color: var(--text-sub); line-height: 1.6; margin: 0 0 6px; }
.rv-foot { font-size: 12px; color: var(--text-hint); }

/* ========== 热门推荐横向滚动 ========== */
.related-card { margin-top: 20px; }
.related-scroll { display: flex; gap: 12px; padding: 0 16px 16px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
.related-scroll::-webkit-scrollbar { display: none; }
.related-item {
  flex-shrink: 0; width: 140px; scroll-snap-align: start;
  background: var(--card); border-radius: var(--radius-lg); overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}
.rel-cover { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.rel-name { display: block; text-align: center; font-size: 12px; font-weight: 600; color: var(--text); padding: 8px 4px 10px; }

/* ========== 品牌 ========== */
.brand-card { padding: 20px 16px; text-align: center; }
.brand-logo { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: 2px; margin-bottom: 8px; }
.brand-text { font-size: 13px; color: var(--text-sub); line-height: 1.7; margin: 0 0 12px; }
.brand-tags { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.btag { font-size: 11px; color: var(--brand); background: var(--brand-soft); padding: 4px 12px; border-radius: var(--radius-pill); }

/* ========== 底部固定操作栏 ========== */
.footer-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: var(--card); border-top: 1px solid var(--line); box-shadow: 0 -2px 12px rgba(0,0,0,.06);
}
.f-price { display: flex; align-items: baseline; }
.fp-symbol { font-size: 14px; color: var(--price); font-weight: 600; }
.fp-num { font-size: 22px; color: var(--price); font-weight: 800; }
.fp-hint { font-size: 11px; color: var(--text-hint); margin-left: 2px; }
.f-buy {
  flex: 1; height: 42px; border-radius: var(--radius-pill);
  background: var(--brand-gradient); color: #fff; font-size: 15px; font-weight: 600;
  box-shadow: 0 3px 10px rgba(77,124,255,.3);
}

/* ========== 占位 ========== */
.bottom-spacer { height: 20px; }

/* ========== 未找到 ========== */
.notfound { text-align: center; padding: 120px 40px; color: var(--text-hint); }
.notfound p { font-size: 15px; margin-bottom: 20px; }
.back-btn { display: inline-block; padding: 10px 28px; background: var(--brand); color: #fff; border-radius: var(--radius-pill); font-size: 14px; }
</style>

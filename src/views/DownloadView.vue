<template>
  <div class="dl">
    <!-- 顶栏：与 App 内页面一致的 TopBar -->
    <TopBar :title="T.navTitle" :back="goBack" />

    <main class="dl-main">
      <!-- Hero：App 图标（官方 logo 源图直贴，深底变体：白字+红块） -->
      <div class="appicon">
        <img class="ai-logo" :src="A + 'download/pxid-logo.png'" alt="PXID" />
      </div>
      <h1 class="hero">{{ T.title }}</h1>
      <p class="sub">{{ T.subtitle }}</p>
      <p class="req">{{ T.requirement }}</p>

      <!-- 地区切换（segment 控件，对齐 App tab/pill 语言） -->
      <div class="region" role="tablist">
        <button class="rg" :class="{ on: region === 'cn' }" @click="region = 'cn'">{{ T.regionCn }}</button>
        <button class="rg" :class="{ on: region === 'global' }" @click="region = 'global'">{{ T.regionGlobal }}</button>
      </div>

      <!-- 下载按钮：Android 品牌蓝渐变主按钮 / iOS 深色实心 -->
      <div class="btns">
        <button class="dl-btn dl-btn--dark press" @click="go('ios')">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.49.96 1.39 2.1 2.94 3.6 2.88 1.44-.06 1.99-.93 3.73-.93s2.23.93 3.76.9c1.56-.03 2.54-1.41 3.49-2.8 1.1-1.61 1.55-3.17 1.58-3.25-.04-.02-3.02-1.16-3.04-4.59zM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.73-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.62z"/></svg>
          <span>iOS</span>
        </button>
        <button class="dl-btn dl-btn--brand press" @click="go('android')">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.7-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.81 10.81 0 001 18h22a10.81 10.81 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>
          <span>Android</span>
        </button>
      </div>
      <p class="store-hint">{{ androidHint }}</p>
      <p v-if="tip" class="tip">{{ tip }}</p>

      <!-- 手机样机墙：CSS 手机壳 + 真机截图（2026-09-07 坤哥提供 Flutter 真机图）。
           换图 = 替换 public/download/shot-*.vN.jpg（文件名升版本号，防 Nginx 7d 图缓存） -->
      <section class="shots" aria-hidden="true">
        <div class="phone phone--side phone--l">
          <span class="screen"><img :src="A + 'download/shot-vehicle.v2.jpg'" alt="" loading="lazy" decoding="async" /></span>
        </div>
        <div class="phone phone--side phone--r">
          <span class="screen"><img :src="A + 'download/shot-service.v2.jpg'" alt="" loading="lazy" decoding="async" /></span>
        </div>
        <div class="phone phone--main">
          <span class="screen"><img :src="A + 'download/shot-discover.v2.jpg'" alt="" loading="lazy" decoding="async" /></span>
          <span class="island"></span>
        </div>
      </section>

      <!-- 功能三卡（白卡片 + 蓝图标底，对齐 App 卡片语言） -->
      <section class="feats">
        <div class="feat" v-for="f in feats" :key="f.key">
          <span class="fi" v-html="f.icon"></span>
          <div class="ft">{{ f.title }}</div>
          <div class="fd">{{ f.desc }}</div>
        </div>
      </section>
    </main>

    <footer class="dl-foot">© 2026 PXID · {{ T.foot }}</footer>
  </div>
</template>

<script setup>
// ============================================================
// 品向智行 App 下载页（2026-09-07，参考九号/小牛下载页）
// 视觉对齐 ToC App 规范（2026-09-07 坤哥反馈与发现/精选统一）：
// 灰底 var(--bg) + TopBar + 品牌蓝 var(--brand) 主按钮 + 白卡片
// - 链接全部来自后端配置：GET /app-download/links（运营后台可改，国内=应用宝/国际=Google Play）
// - 地区：?region=cn|global 可由 Flutter 直接指定；默认按浏览器语言判断，页内可手动切
// ============================================================
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { locale } from '../i18n'

const route = useRoute()
const router = useRouter()
const FEED_API = 'https://pxid-api.appin.site'
const A = import.meta.env.BASE_URL // './' → 产物相对路径，WebView 任意域名可用

// ---- 文案（zh / en 双语；跟随时区语言，独立于全局 i18n 字典避免膨胀）----
const STR = {
  zh: {
    navTitle: '品向智行 App 下载',
    title: '品向智行 App',
    subtitle: '远程控车 · 车友社区 · 帮助中心',
    requirement: 'App 要求设备支持蓝牙 4.1 及以上；Android 系统需 8.0 及以上、iOS 系统需 13 及以上。安卓手机需卸载当前应用后下载安装该版本。',
    regionCn: '中国大陆',
    regionGlobal: '国际版',
    hintCn: 'Android 将跳转 应用宝 下载',
    hintGlobal: 'Android 将跳转 Google Play 下载',
    linkPending: '下载链接配置中，请稍后再试',
    foot: '品向智造',
    f1t: '远程控车', f1d: '蓝牙解锁、车辆状态与定位，一手掌握',
    f2t: '车友社区', f2d: '骑行动态、官方活动与积分商城',
    f3t: '帮助中心', f3d: '在线客服、附近门店与道路救援',
  },
  en: {
    navTitle: 'Download PXID App',
    title: 'PXID App',
    subtitle: 'Remote Control · Community · Help Center',
    requirement: 'Requires Bluetooth 4.1+; Android 8.0+ or iOS 13+. On Android, uninstall the current version before installing this update.',
    regionCn: 'China',
    regionGlobal: 'Global',
    hintCn: 'Android downloads via Tencent MyApp',
    hintGlobal: 'Android downloads via Google Play',
    linkPending: 'Download links are being configured, please try again later',
    foot: 'by PXID',
    f1t: 'Remote Control', f1d: 'Bluetooth unlock, live status and location',
    f2t: 'Community', f2d: 'Rides, official events and points mall',
    f3t: 'Help Center', f3d: 'Support, nearby stores and roadside rescue',
  },
}
const T = computed(() => STR[locale.value === 'zh' ? 'zh' : 'en'] || STR.en)

const ICON_CONTROL = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.2"/><path d="M7.8 16.2a6 6 0 010-8.4M16.2 7.8a6 6 0 010 8.4M5 19a10 10 0 010-14M19 5a10 10 0 010 14"/></svg>'
const ICON_COMMUNITY = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>'
const ICON_HELP = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'

const feats = computed(() => [
  { key: 'ctrl', icon: ICON_CONTROL, title: T.value.f1t, desc: T.value.f1d },
  { key: 'comm', icon: ICON_COMMUNITY, title: T.value.f2t, desc: T.value.f2d },
  { key: 'help', icon: ICON_HELP, title: T.value.f3t, desc: T.value.f3d },
])

// ---- 地区与链接 ----
const region = ref(/^(zh)/i.test(navigator.language || 'zh') ? 'cn' : 'global')
const links = ref(null) // { cn:{android,ios}, global:{android,ios} }
const tip = ref('')
let tipTimer = null
const androidHint = computed(() => (region.value === 'cn' ? T.value.hintCn : T.value.hintGlobal))

// WebView 直开时可能没有历史：有历史就 back，否则回发现页兜底
function goBack() {
  if (window.history.length > 1) router.back()
  else router.replace('/')
}

onMounted(async () => {
  // Flutter 可用 ?region=cn|global 直接指定（语言判断只是浏览器直开时的兜底）
  const q = String(route.query.region || '').toLowerCase()
  if (q === 'cn' || q === 'global') region.value = q
  try {
    const res = await fetch(FEED_API + '/app-download/links')
    const json = await res.json()
    if (json.code === 0 && json.data) links.value = json.data
  } catch (e) {
    console.log('[download] load links failed', e)
  }
})

function showToast(msg) {
  tip.value = msg
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => (tip.value = ''), 1800)
}

function go(platform) {
  const url = links.value && links.value[region.value] ? links.value[region.value][platform] : ''
  if (!url) return showToast(T.value.linkPending)
  window.location.href = url
}
</script>

<style scoped>
.dl {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom);
}

.dl-main {
  flex: 1;
  padding: 10px 16px 40px;
  text-align: center;
}

/* ---- App 图标：官方 logo 源图直贴（LOGO-03 = 深底专用白字变体，白底会隐身） ---- */
.appicon {
  width: 96px;
  height: 96px;
  margin: 18px auto 0;
  border-radius: 24px;
  background: #101014; /* 与样机墙手机壳同色 */
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-logo {
  display: block;
  width: 82%;
  height: auto;
}

.hero {
  margin: 16px 0 0;
  font-size: 26px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--text);
}
.sub {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-sub);
  letter-spacing: 0.5px;
}
.req {
  margin: 14px auto 0;
  max-width: 340px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-hint);
}

/* ---- 地区 segment（surface-2 底 + 激活白底浮起，同 App 控件语言） ---- */
.region {
  margin: 20px auto 0;
  display: inline-flex;
  padding: 3px;
  background: var(--surface-2);
  border-radius: var(--radius-pill);
}
.rg {
  border: 0;
  background: transparent;
  font-size: 13px;
  color: var(--text-sub);
  padding: 7px 18px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.rg.on {
  background: var(--card);
  color: var(--brand);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ---- 下载按钮：Android 品牌蓝渐变主按钮 / iOS 深色实心 ---- */
.btns {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.dl-btn {
  min-width: 150px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 13px 26px;
  border: none;
  border-radius: var(--radius);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease;
}
.dl-btn:active {
  transform: scale(0.97);
  filter: brightness(0.96);
}
.dl-btn--brand {
  background: var(--brand-gradient);
  box-shadow: 0 4px 12px rgba(77, 124, 255, 0.3);
}
.dl-btn--dark {
  background: var(--text);
}
.store-hint {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--text-hint);
}
.tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--price, #e53935);
}

/* ---- 手机样机墙：CSS 手机壳 + 真实页面截图，两侧出血裁切（九号式） ---- */
.shots {
  position: relative;
  height: 468px;
  margin: 30px -16px 0; /* 抵消 dl-main 左右 padding，全幅出血 */
  overflow: hidden;
}
.phone {
  position: absolute;
  background: #101014;
  border-radius: 34px;
  padding: 7px;
  box-shadow: 0 18px 44px rgba(17, 24, 39, 0.22), 0 2px 8px rgba(17, 24, 39, 0.1);
}
.phone .screen {
  display: block;
  border-radius: 27px;
  overflow: hidden;
  background: var(--surface-2);
}
.phone img {
  display: block;
  width: 100%;
  object-fit: cover;
  object-position: top;
}
/* 主机（发现页）：居中最大，压轴 */
.phone--main {
  width: 216px;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  z-index: 3;
}
.phone--main .screen,
.phone--main img { height: 437px; } /* 屏 202px 宽 × 844/390 比例 */
/* 灵动岛 */
.island {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 62px;
  height: 17px;
  border-radius: 10px;
  background: #101014;
  z-index: 2;
}
/* 侧机（精选/服务）：压在主机后，向屏幕两侧出血 */
.phone--side { width: 178px; top: 34px; z-index: 1; }
.phone--side .screen,
.phone--side img { height: 355px; }
.phone--l { left: -54px; }
.phone--r { right: -54px; }

/* ---- 功能三卡（白卡片 + 浅蓝圆底蓝图标） ---- */
.feats {
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.feat {
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 18px 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.fi {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--brand-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
}
.ft {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.fd {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-hint);
}

/* ---- Footer ---- */
.dl-foot {
  padding: 14px 0 18px;
  text-align: center;
  font-size: 11px;
  color: var(--text-hint);
}

@media (max-width: 360px) {
  .hero { font-size: 22px; }
  .dl-btn { min-width: 132px; padding: 12px 18px; }
}
</style>

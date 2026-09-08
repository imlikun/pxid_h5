<template>
  <div class="ndetail">
    <TopBar :title="t('notice.detailTitle')" :back="onBack" />

    <div v-if="item" class="body">
      <div class="head" :class="[fadeUp(), staggerFor(1)]">
        <span class="tag" :class="'tag--' + item.type">{{ typeLabel(item.type) }}</span>
        <h1 class="title">{{ item.title }}</h1>
        <div class="meta">{{ item.publisher }} · {{ t('notice.publishedAt') }} {{ item.publishTime }}</div>
        <div class="meta">{{ t('notice.effectiveTime') }}{{ item.effectiveTime }}</div>
      </div>
      <div class="content" :class="[fadeUp(), staggerFor(2)]">{{ item.content }}</div>

      <div v-if="item.forceAck && !acked" class="ack-tip" :class="[fadeUp(), staggerFor(3)]">
        {{ t('notice.recallWarn') }}
      </div>
    </div>

    <!-- 召回强提醒：未「已知悉」前底部固定确认按钮并拦截返回（合规强确认，不因点开看过而解除） -->
    <div v-if="item && item.forceAck && !acked" class="footer">
      <button class="ack-btn press" @click="ack">{{ t('notice.ackBtn') }}</button>
    </div>
    <div v-else class="footer">
      <button class="back-btn press" @click="onBack">{{ t('notice.back') }}</button>
    </div>

    <!-- toast -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notices } from '../data/mock'
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'
import { markNoticeRead, markNoticeAck, isNoticeAcked } from '../store/noticeStore'
import { bridge } from '../bridge'

const route = useRoute()
const router = useRouter()

// 入场动画只播一次（2026-09-08，镜像 DiscoverView/FeaturedView 的 enterAnim 模式）：
// fade-up 绑定「元素插入文档」，keep-alive 返回再进时 DOM 重插必重播（探针实测 fadeUp 从 0 重播），
// 二次进入变成「页面滑进来是空的、内容再浮现」，与首次「内容随页面一起滑入」观感割裂。
// 首次进入播完（0.45s + 最大 stagger 0.15s，900ms 上限留余量）自动摘类，之后返回/切回零动画。
const enterAnim = ref(true)
let enterTimer = null
const fadeUp = () => (enterAnim.value ? 'fade-up' : '')
const staggerFor = (i) => (enterAnim.value ? 'stagger-' + Math.min(i, 6) : '')
onMounted(() => {
  enterTimer = setTimeout(() => { enterAnim.value = false }, 900)
})
onUnmounted(() => {
  if (enterTimer) { clearTimeout(enterTimer); enterTimer = null }
})

const id = computed(() => route.params.id)
const item = computed(() => notices.find((n) => n.id === id.value) || null)
// 召回强确认状态（响应式）：未确认前保留横幅与强制确认按钮
const acked = computed(() => isNoticeAcked(id.value))

// 进入详情即标记已读 → 发现页「官方公告」入口红点与列表未读圆点立即消失（产品诉求：读完就消）
// 召回公告同样消除红点，但其强提醒由 ack 状态单独控制，不因点开而解除
watch(id, (v) => { if (v) markNoticeRead(v) }, { immediate: true })

function typeLabel(type) {
  return {
    recall: t('notice.type.recall'),
    version: t('notice.type.version'),
    activity: t('notice.type.activity'),
    safety: t('notice.type.safety'),
    maintain: t('notice.type.maintain'),
  }[type] || t('notice.type.default')
}

// 点击"已知悉"：标记已读 + 已确认（store 持久化），随后返回列表
function ack() {
  if (item.value) markNoticeAck(item.value.id)
  onBack()
}
// 普通公告返回（2026-09-08 全屏右滑对接更新）：本页为全屏 WebView 白名单路由——
// 第一层（无 H5 内部历史）关闭全屏路由回根页；有 H5 历史（/notices 进入的深层）先 back；
// 召回未确认时拦截返回（合规强提醒，正常走底部按钮）；浏览器回退 router.back()，无历史兜底回列表。
function onBack() {
  if (item.value && item.value.forceAck && !acked.value) {
    // 召回未确认：引导先确认（兜底，正常走底部按钮）。给 toast 反馈——
    // 2026-09-08 坤哥反馈排查中实测：拦截无任何提示，用户会以为返回按钮卡死
    showToast(t('notice.recallWarn'))
    return
  }
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    if (bridge.isWebViewFirstPage()) app.postMessage('closeWebView')
    else router.back()
    return
  }
  if (window.history.length > 1) router.back()
  else router.push('/notices')
}

// toast（本地实现，镜像 FeedDetailView——项目 toast 均为组件内函数，无全局模块）
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}
</script>

<style scoped>
.ndetail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(env(safe-area-inset-bottom) + 80px);
}

.body { padding: 16px; }
.head { border-bottom: 1px solid var(--line); padding-bottom: 16px; }
.tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
}
.tag--recall { background: var(--price); }
.tag--version { background: var(--brand); }
.tag--activity { background: #FA8C16; }
.tag--safety { background: #52C41A; }
.tag--maintain { background: #722ED1; }
.title { font-size: 18px; margin: 10px 0 0; line-height: 1.4; }
.meta { font-size: 12px; color: var(--text-hint); margin-top: 8px; }
.content {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  margin-top: 16px;
  white-space: pre-wrap;
}
.ack-tip {
  margin-top: 16px;
  font-size: 13px;
  color: #CF1322;
  background: #FFF1F0;
  border: 1px solid #FFCCC7;
  border-radius: var(--radius);
  padding: 10px 12px;
}
.footer {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid var(--line);
}
.ack-btn {
  width: 100%;
  height: 48px;
  background: var(--brand);
  color: #fff;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
}
.back-btn {
  width: 100%;
  height: 48px;
  background: #2F2F2F;
  color: #fff;
  border-radius: 10px;
  font-size: 16px;
}

/* toast（镜像 FeedDetailView） */
.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 8px;
  z-index: 999;
  max-width: 70vw;
  text-align: center;
}
</style>

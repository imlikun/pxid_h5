<template>
  <div class="ndetail">
    <TopBar :title="t('notice.detailTitle')" :back="onBack" />

    <div v-if="item" class="body">
      <div class="head">
        <span class="tag" :class="'tag--' + item.type">{{ typeLabel(item.type) }}</span>
        <h1 class="title">{{ item.title }}</h1>
        <div class="meta">{{ item.publisher }} · {{ t('notice.publishedAt') }} {{ item.publishTime }}</div>
        <div class="meta">{{ t('notice.effectiveTime') }}{{ item.effectiveTime }}</div>
      </div>
      <div class="content">{{ item.content }}</div>

      <div v-if="item.forceAck && !acked" class="ack-tip">
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
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notices } from '../data/mock'
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'
import { markNoticeRead, markNoticeAck, isNoticeAcked } from '../store/noticeStore'
import { bridge } from '../bridge'

const route = useRoute()
const router = useRouter()

// 入场动画说明（2026-09-08 闪屏修复）：本页曾用 fade-up+stagger 入场（镜像列表页），
// 但内容页与列表页观感完全不同——animation backwards 使正文初始 opacity:0，
// 首次进入变成「空白页滑入 340ms → 内容再浮现」两段式跳变（坤哥报"闪屏"，screencast 帧实锤：
// t=130ms 整屏详情页但正文全透明）。内容页应内容直出、随页面一起滑入（对齐 feed 详情/微信语义），
// 故删除本页全部入场动画；发现/精选列表的 fade-up 是多卡片渐次浮现的设计感，保留不动。

const id = computed(() => route.params.id)
// 「最后有效公告」缓存（2026-09-08 闪屏修复）：item 若直接 computed 依赖 route.params.id，
// 返回列表时参数瞬间变 undefined → item=null → 离场转场进行中正文被 v-if 清空，
// 用户看到「空壳详情页滑出」（screencast t=30ms 帧实锤：滑出页只剩顶栏+按钮）。
// 改为 watch 缓存最后有效对象：离开转场中内容保持完整，切到别的公告时才换内容。
const lastItem = ref(null)
let readTimer = null
watch(
  id,
  (v) => {
    if (!v) return
    const found = notices.find((n) => n.id === v)
    if (found) lastItem.value = found
    // 进入详情标记已读 → 发现页「官方公告」入口红点与列表未读圆点消失（产品诉求：读完就消）。
    // ⚠️ 必须延迟到转场结束后（2026-09-08 坤哥录屏线索「列表会重新加载/闪一下」）：
    //    激活瞬间同步 markNoticeRead 会让列表页在详情推入前就重绘（点击卡片的标题蓝→黑、
    //    红点消失）——推入还没开始列表先闪变。450ms（转场 340ms+余量）后列表已离屏，
    //    重绘发生在离屏 DOM 上不可见，返回时才看到已读态（微信同语义）。
    // 召回公告同样消除红点，但其强提醒由 ack 状态单独控制，不因点开而解除
    clearTimeout(readTimer)
    readTimer = setTimeout(() => { if (v) markNoticeRead(v) }, 450)
  },
  { immediate: true }
)
const item = computed(() => lastItem.value)
onUnmounted(() => clearTimeout(readTimer))
// 召回强确认状态（响应式）：未确认前保留横幅与强制确认按钮。
// 基于 item（缓存版）而非 id：返回转场中 id 已变 undefined，若读 id 会导致
// 已确认状态瞬间回退 false，底部「已知悉/返回」按钮在滑出过程中闪切（同类闪屏源）
const acked = computed(() => (item.value ? isNoticeAcked(item.value.id) : false))

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

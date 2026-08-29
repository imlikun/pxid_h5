<template>
  <div class="hima">
    <!-- 顶栏 -->
    <TopBar sticky title="智能助手" :back="goBack">
      <template #right>
        <span class="more" @click="onMore">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </span>
      </template>
    </TopBar>

    <!-- 对话区 -->
    <div class="chat" ref="chatEl">
      <!-- 欢迎态 -->
      <div v-if="!started" class="welcome">
        <div class="hero">
          <div class="hero__avatar">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="5"/><path d="M12 8V4M9 4h6M9 13h.01M15 13h.01"/></svg>
          </div>
          <div class="hero__hi">你好，我是 HIMA 智能助手</div>
          <div class="hero__sub">你的 PXID 专属出行 AI，查车型、找门店、看公告、解疑问都能问。</div>
        </div>

        <!-- 紫色推荐卡 -->
        <div class="promo">
          <div class="promo__top">
            <span class="promo__badge">PXID 智能出行</span>
            <span class="promo__arrow">&gt;</span>
          </div>
          <div class="promo__title">把车交给更懂你的 AI</div>
          <div class="promo__desc">购车定制、保养提醒、续航优化、道路救援——一句话搞定日常用车。</div>
        </div>

        <!-- 快捷问题 -->
        <div class="quick-title">你可以这样问我</div>
        <div class="quick">
          <div
            v-for="(q, i) in quickQuestions"
            :key="i"
            class="quick__item"
            @click="ask(q)"
          >
            <span class="quick__dot"></span>
            <span class="quick__text">{{ q.q }}</span>
          </div>
        </div>
        <div class="demo-tip">演示版 · 正式版将接入 PXID 智能出行大模型</div>
      </div>

      <!-- 对话气泡 -->
      <template v-else>
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
          <div v-if="m.role === 'hima'" class="msg__avatar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="5"/><path d="M12 8V4M9 4h6"/></svg>
          </div>
          <div class="msg__col">
            <div class="msg__bubble">{{ m.text }}</div>
            <div v-if="m.action" class="msg__action press" @click="runAction(m.action)">
              <span>{{ m.action.label }}</span>
              <span class="arrow">&gt;</span>
            </div>
          </div>
        </div>
        <!-- 正在输入 -->
        <div v-if="typing" class="msg hima">
          <div class="msg__avatar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="5"/><path d="M12 8V4M9 4h6"/></svg>
          </div>
          <div class="msg__bubble typing"><span></span><span></span><span></span></div>
        </div>
      </template>
    </div>

    <!-- 底部输入 -->
    <div class="inputbar">
      <input
        v-model="input"
        class="inputbar__field"
        type="text"
        placeholder="问问 HIMA 关于用车的一切…"
        @keyup.enter="send"
      />
      <button class="inputbar__send" :class="{ on: input.trim() }" @click="send">发送</button>
    </div>

    <transition name="toast-fade">
      <div v-if="toastMsg" class="itoast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import bridge from '../bridge'

const router = useRouter()

const input = ref('')
const messages = ref([])
const chatEl = ref(null)
const typing = ref(false)
const started = computed(() => messages.value.length > 0)
const toastMsg = ref('')
let toastTimer = null

const quickQuestions = [
  { q: '如何预约车辆保养？', a: '可在「服务」页在线预约车辆体检与保养，或到附近门店登记。保养周期建议每 2000km 或 3 个月一次。', action: { type: 'native', path: 'service/check', label: '打开保养预约' } },
  { q: '附近有哪些门店？', a: '进入「服务 → 附近门店」可按距离查看离你最近的 PXID 授权门店与营业时间，支持一键导航。', action: { type: 'native', path: 'service/stores', label: '查看附近门店' } },
  { q: '查看最新官方公告', a: '发现页「官方公告」入口可查看召回、版本、活动与安全提醒，重要公告会带红点提示。', action: { type: 'route', to: '/notices', label: '查看官方公告' } },
  { q: '踏春活动怎么参与？', a: '精选商城踏春装备专场已开启，满 199 减 30，积分可叠加抵扣，点击商品即可进入商城。', action: { type: 'route', to: '/featured', label: '进入踏春专场' } },
  { q: '我的积分怎么用？', a: '积分可在积分商城兑换原厂好物，100 积分抵 1 元，签到、发动态都能赚积分。', action: { type: 'route', to: '/points', label: '进入积分商城' } },
]

// 关键词语义分流：服务类交给原生 service 模块，App 内页直接路由跳转
function smartReply(text) {
  const s = (text || '').toLowerCase().replace(/\s/g, '')
  const has = (...kw) => kw.some((k) => s.includes(k))
  if (has('门店', '附近', '体验店', 'store')) return { a: '附近门店可在「服务 → 附近门店」查看，支持按距离排序与一键导航。', action: { type: 'native', path: 'service/stores', label: '查看附近门店' } }
  if (has('保养', '预约', '体检', '维护', 'maintenance')) return { a: '车辆保养与体检可在「服务」页在线预约，建议每 2000km 或 3 个月一次。', action: { type: 'native', path: 'service/check', label: '打开保养预约' } }
  if (has('救援', '拖车', 'roadside', '抛锚')) return { a: '道路救援可在「服务 → 道路救援」一键呼叫，附近门店接单后会主动联系你。', action: { type: 'native', path: 'service/rescue', label: '呼叫道路救援' } }
  if (has('工单', '报修', '维修', 'workorder')) return { a: '我的工单可在「服务 → 我的工单」查看进度，也可在线提交报修。', action: { type: 'native', path: 'service/workorders', label: '查看我的工单' } }
  if (has('公告', '召回', 'notice')) return { a: '官方公告含召回、版本、活动与安全提醒，重要通知带红点。', action: { type: 'route', to: '/notices', label: '查看官方公告' } }
  if (has('活动', '踏春', 'spring', '优惠')) return { a: '踏春出行季精选装备限时直降，满 199 减 30，积分可叠加抵扣。', action: { type: 'route', to: '/featured', label: '进入踏春专场' } }
  if (has('积分', 'points', '兑换')) return { a: '积分可在积分商城兑换原厂好物，100 积分抵 1 元，签到与发动态都能赚。', action: { type: 'route', to: '/points', label: '进入积分商城' } }
  if (has('发布', '发动态', 'publish')) return { a: '在「发现」页点右下角 + 即可发布动态，用 #车型# 标记更易被同好看到。', action: { type: 'route', to: '/publish', label: '去发布动态' } }
  if (has('关注', '粉丝', '消息', '互动', 'interaction')) return { a: '互动消息（赞/评论/关注/系统）可在「我的 → 消息中心」查看。', action: { type: 'route', to: '/interactions', label: '查看互动消息' } }
  if (has('续航', '电池', '充电', 'battery')) return { a: '电池保养建议：日常保持电量 20%-80%，避免亏电长期存放；冬季室内停放可缓解续航缩水。' }
  if (has('质保', '保修', 'warranty')) return { a: '整车保修 2 年（关键部件 3 年），电池 1-2 年（按车型）；非人为故障免费维修，详情见购车合同。' }
  return { a: '收到～这是 HIMA 的演示回复。当前为前端预览版，正式版将接入 PXID 智能出行大模型，可解答保养、续航、门店与活动等问题。' }
}

function showToast(m) {
  toastMsg.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 1600)
}

function pushHima(text, action) {
  messages.value.push({ role: 'hima', text, action })
  scrollDown()
}

function ask(item) {
  messages.value.push({ role: 'user', text: item.q })
  scrollDown()
  typing.value = true
  setTimeout(() => {
    typing.value = false
    pushHima(item.a, item.action)
  }, 600)
}

function send() {
  const v = input.value.trim()
  if (!v) return
  messages.value.push({ role: 'user', text: v })
  input.value = ''
  scrollDown()
  typing.value = true
  setTimeout(() => {
    typing.value = false
    const r = smartReply(v)
    pushHima(r.a, r.action)
  }, 650)
}

function runAction(action) {
  if (!action) return
  if (action.type === 'route') {
    router.push(action.to)
  } else if (action.type === 'native') {
    try {
      bridge.openNative(action.path)
      showToast('正在打开：' + action.label)
    } catch (e) {
      console.log('[hima] openNative', action.path)
    }
  }
}

function scrollDown() {
  nextTick(() => {
    const el = chatEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onMore() {
  if (!messages.value.length) {
    showToast('对话还是空的')
    return
  }
  messages.value = []
  showToast('对话已清空')
}

// 返回对齐积分页：原生 WebView 打开时关闭回「我的」；浏览器预览退回 router.back()
function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') app.postMessage('closeWebView')
  else if (window.history.length > 1) router.back()
  else router.push('/discover')
}
</script>

<style scoped>
.hima {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg, #f7f8fa);
}
:deep(.tb-bar) { background: var(--card, #fff); }
.more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--text);
}

.chat {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px 8px;
  -webkit-overflow-scrolling: touch;
}

/* 欢迎态 */
.welcome { padding-bottom: 8px; }
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 18px 0 22px;
}
.hero__avatar {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: linear-gradient(135deg, #7C5CFC 0%, #5B3FD6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(124, 92, 252, 0.35);
}
.hero__hi {
  margin-top: 14px;
  font-size: 19px;
  font-weight: 800;
  color: var(--text, #1a1a1a);
}
.hero__sub {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-sub, #666);
  line-height: 1.6;
  max-width: 280px;
}

/* 紫色推荐卡 */
.promo {
  background: linear-gradient(135deg, #7C5CFC 0%, #5B3FD6 100%);
  border-radius: 18px;
  padding: 16px;
  color: #fff;
  box-shadow: 0 8px 20px rgba(124, 92, 252, 0.3);
}
.promo__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.promo__badge {
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 10px;
  border-radius: 20px;
}
.promo__arrow { font-size: 16px; opacity: 0.9; }
.promo__title {
  margin-top: 12px;
  font-size: 17px;
  font-weight: 800;
}
.promo__desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
}

/* 快捷问题 */
.quick-title {
  margin: 22px 4px 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub, #666);
}
.quick {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quick__item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card, #fff);
  border-radius: 14px;
  padding: 13px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.quick__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7C5CFC, #5B3FD6);
  flex: none;
}
.quick__text {
  font-size: 14px;
  color: var(--text, #1a1a1a);
}
.demo-tip {
  margin: 18px 4px 0;
  font-size: 11px;
  color: var(--text-hint, #999);
  text-align: center;
}

/* 对话气泡 */
.msg {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 14px;
}
.msg__avatar {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7C5CFC, #5B3FD6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.msg__col { max-width: 76%; min-width: 0; }
.msg__bubble {
  padding: 11px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}
.msg.hima .msg__bubble {
  background: var(--card, #fff);
  color: var(--text, #1a1a1a);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.msg.user {
  flex-direction: row-reverse;
}
.msg.user .msg__col { margin-left: auto; }
.msg.user .msg__bubble {
  background: linear-gradient(135deg, #7C5CFC, #5B3FD6);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.msg__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 7px 12px;
  background: rgba(124, 92, 252, 0.1);
  color: #5B3FD6;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}
.msg__action .arrow { font-size: 14px; }

/* 正在输入 */
.msg__bubble.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.msg__bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-hint, #bbb);
  animation: blink 1.2s infinite both;
}
.msg__bubble.typing span:nth-child(2) { animation-delay: 0.2s; }
.msg__bubble.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

/* 底部输入 */
.inputbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: var(--card, #fff);
  border-top: 1px solid var(--line, #eee);
}
.inputbar__field {
  flex: 1;
  height: 40px;
  border: none;
  outline: none;
  background: var(--bg, #f2f3f5);
  border-radius: 20px;
  padding: 0 16px;
  font-size: 14px;
  color: var(--text, #1a1a1a);
}
.inputbar__field::placeholder { color: var(--text-hint, #aaa); }
.inputbar__send {
  flex: none;
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: #c9c0f5;
  transition: background 0.2s;
}
.inputbar__send.on {
  background: linear-gradient(135deg, #7C5CFC, #5B3FD6);
}

/* toast */
.itoast {
  position: fixed;
  left: 50%;
  bottom: 16%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 22px;
  z-index: 9999;
  white-space: nowrap;
}
.toast-fade-enter-active,
.toast-fade-leave-active { transition: opacity 0.2s ease; }
.toast-fade-enter-from,
.toast-fade-leave-to { opacity: 0; }
</style>

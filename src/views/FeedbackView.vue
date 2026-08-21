<template>
  <div class="page">
    <TopBar title="在线客服" />

    <div class="history-tip">查看更多历史消息</div>

    <div class="chat-head fade-up stagger-1">
      <img class="avatar" :src="serviceAvatar" alt="客服" />
      <div class="bubble">
        <div class="brand">品向出行</div>
        <div class="tabs">
          <div
            v-for="t in feedbackTabs"
            :key="t"
            class="tab"
            :class="{ active: t === activeTab }"
            @click="activeTab = t"
          >{{ t }}</div>
        </div>
      </div>
    </div>

    <div v-if="filteredFaqs.length" class="faq-list">
      <div v-for="(f, i) in filteredFaqs" :key="f.id" class="faq-wrap fade-up" :class="'stagger-' + (((i + 1) % 10))">
        <div class="faq press" :class="{ on: expandedId === f.id }" @click="toggleFaq(f.id)">
          <span class="faq__no">{{ i + 1 }}</span>
          <span class="faq__q">{{ f.q }}</span>
          <span class="faq__arrow">{{ expandedId === f.id ? '－' : '＋' }}</span>
        </div>
        <transition name="faq">
          <div v-if="expandedId === f.id" class="faq__a">
            <span class="faq__a-q">Q</span>
            <span class="faq__a-qtxt">{{ f.q }}</span>
            <span class="faq__a-a">A</span>
            <span class="faq__a-atxt">{{ f.a }}</span>
          </div>
        </transition>
      </div>
    </div>
    <div v-else class="empty">暂无该分类问题，试试其他分类或输入描述</div>

    <div class="input-bar">
      <span class="grid-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
      </span>
      <input class="input" v-model="text" placeholder="很高兴为您服务，请描述您的问题" @keyup.enter="onSend" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { feedbackTabs, feedbackFaqs } from '../data/mock'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
const serviceAvatar = import.meta.env.BASE_URL + 'unsplash/photo-1494790108377-be9c29b29330_w_80_q_80.jpg'
const activeTab = ref(feedbackTabs[0])
const text = ref('')
const expandedId = ref(null) // 客服 FAQ 内联展开：一次只展开一条

const filteredFaqs = computed(() =>
  feedbackFaqs.filter((f) => f.category === activeTab.value)
)

function onSend() {
  // 真实环境：调用 bridge 发给客服系统
  console.log('[feedback] send:', text.value)
  text.value = ''
}
function toggleFaq(id) {
  // 客服场景：点击行内联展开答案，不再跳详情页（避免反馈/FAQ 数据源错位）
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-bottom: env(safe-area-inset-bottom); display: flex; flex-direction: column; }
.history-tip { text-align: center; font-size: 13px; color: var(--text-hint); padding: 12px 0; }
.chat-head { display: flex; align-items: flex-start; gap: 10px; padding: 0 12px 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex: none; }
.bubble {
  flex: 1;
  background: var(--card);
  border-radius: var(--radius);
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.brand { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
.tabs { display: flex; border-bottom: 1px solid var(--line); }
.tab { flex: 1; text-align: center; padding: 8px 0; font-size: 14px; color: var(--text-sub); position: relative; }
.tab.active { color: var(--brand); font-weight: 600; }
.tab.active::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; width: 32px; height: 2px; background: var(--brand); border-radius: 2px; }
.faq-list { flex: 1; background: var(--card); margin: 0 12px; border-radius: var(--radius); overflow: hidden; }
.faq-wrap { border-bottom: 1px solid var(--line); }
.faq-wrap:last-child { border-bottom: none; }
.faq { display: flex; align-items: center; gap: 12px; padding: 16px 12px; }
.faq.on { background: var(--bg); }
.faq__no { color: var(--text-hint); font-size: 14px; width: 18px; }
.faq__q { flex: 1; font-size: 14px; color: var(--text); }
.faq__arrow { color: var(--brand); font-size: 18px; font-weight: 600; width: 16px; text-align: center; }

/* 内联展开答案 */
.faq__a {
  display: grid;
  grid-template-columns: 18px 1fr;
  column-gap: 10px;
  row-gap: 6px;
  padding: 0 12px 14px;
  background: var(--bg);
  font-size: 13px;
  line-height: 1.7;
}
.faq__a-q, .faq__a-a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  margin-top: 1px;
}
.faq__a-q { background: var(--brand); }
.faq__a-a { background: #d1d5db; }
.faq__a-qtxt, .faq__a-atxt { color: var(--text-sub); }

/* accordion transition */
.faq-enter-active,
.faq-leave-active { transition: opacity 0.18s ease, max-height 0.22s ease; overflow: hidden; }
.faq-enter-from,
.faq-leave-to { opacity: 0; max-height: 0; }
.faq-enter-to,
.faq-leave-from { opacity: 1; max-height: 360px; }
.empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-hint); padding: 40px 20px; text-align: center; }
.input-bar { display: flex; align-items: center; gap: 10px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: var(--card); border-top: 1px solid var(--line); }
.grid-icon { color: var(--text-hint); display: flex; }
.input { flex: 1; border: none; border-radius: var(--radius-xl); padding: 8px 14px; font-size: 14px; background: var(--bg); color: var(--text); outline: none; }
.input::placeholder { color: var(--text-hint); }
</style>

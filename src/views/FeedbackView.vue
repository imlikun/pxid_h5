<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">在线客服</span>
    </div>

    <div class="tabs">
      <div
        v-for="t in feedbackTabs"
        :key="t"
        class="tab"
        :class="{ active: t === activeTab }"
        @click="activeTab = t"
      >{{ t }}</div>
    </div>

    <div class="faq-list">
      <div v-for="(f, i) in feedbackFaqs" :key="f.id" class="faq">
        <span class="faq__no">{{ i + 1 }}</span>
        <span class="faq__q">{{ f.q }}</span>
        <span class="faq__arrow">›</span>
      </div>
    </div>

    <div class="input-bar">
      <input class="input" v-model="text" placeholder="描述您的问题…" @keyup.enter="onSend" />
      <button class="send" @click="onSend">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { feedbackTabs, feedbackFaqs } from '../data/mock'

const router = useRouter()
const activeTab = ref(feedbackTabs[0])
const text = ref('')

function onSend() {
  // 真实环境：调用 bridge 发给客服系统
  console.log('[feedback] send:', text.value)
  text.value = ''
}
</script>

<style scoped>
.page { min-height: 100vh; background: #efefef; padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); display: flex; flex-direction: column; }
.nav { height: 48px; display: flex; align-items: center; justify-content: center; position: relative; background: #fff; }
.back { position: absolute; left: 12px; display: flex; color: #333; }
.title { font-size: 17px; font-weight: 600; color: #333; }
.tabs { display: flex; background: #fff; border-bottom: 1px solid #f0f0f0; }
.tab { flex: 1; text-align: center; padding: 12px 0; font-size: 14px; color: #666; position: relative; }
.tab.active { color: var(--brand); font-weight: 600; }
.tab.active::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; width: 32px; height: 2px; background: var(--brand); border-radius: 2px; }
.faq-list { flex: 1; background: #fff; }
.faq { display: flex; align-items: center; gap: 12px; padding: 16px 12px; border-bottom: 1px solid #f5f5f5; }
.faq__no { color: #999; font-size: 14px; width: 18px; }
.faq__q { flex: 1; font-size: 14px; color: #333; }
.faq__arrow { color: #ccc; font-size: 20px; }
.input-bar { display: flex; gap: 8px; padding: 10px 12px; background: #fff; border-top: 1px solid #f0f0f0; }
.input { flex: 1; border: 1px solid #eee; border-radius: var(--radius-xl); padding: 8px 14px; font-size: 14px; background: #f7f7f7; outline: none; }
.send { background: var(--brand); color: #fff; border: none; border-radius: var(--radius-xl); padding: 0 18px; font-size: 14px; }
</style>

<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">问题详情</span>
    </div>

    <div class="body" v-if="faq">
      <div class="q-block">
        <span class="q">Q</span>
        <h2 class="q-title">{{ faq.q }}</h2>
      </div>
      <div class="a-block">
        <span class="a">A</span>
        <p class="a-text">{{ faq.a }}</p>
      </div>

      <div class="tip">
        如仍未解决，可
        <span class="link" @click="goFeedback">联系在线客服 ›</span>
      </div>
    </div>

    <div class="body empty" v-else>
      <p>该问题不存在或已下架</p>
      <button class="back-btn" @click="router.back()">返回</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { faqs } from '../data/mock'

const route = useRoute()
const router = useRouter()

const faq = computed(() => faqs.find((f) => String(f.id) === String(route.params.id)))

function goFeedback() {
  router.push('/service/feedback')
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); }
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #ffffff;
}
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }

.body { padding: 16px 12px; }
.q-block {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px 14px;
}
.q {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  margin-top: 2px;
}
.q-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); line-height: 1.5; flex: 1; }

.a-block {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px 14px;
  margin-top: 12px;
}
.a {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: #fff3e0;
  color: #ff9500;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  margin-top: 2px;
}
.a-text { margin: 0; font-size: 14px; color: var(--text-sub); line-height: 1.8; flex: 1; }

.tip {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-sub);
  text-align: center;
}
.link { color: var(--brand); font-weight: 600; }

.body.empty { text-align: center; color: #999; padding-top: 80px; }
.back-btn {
  margin-top: 16px;
  padding: 8px 24px;
  border-radius: 20px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 14px;
}
</style>

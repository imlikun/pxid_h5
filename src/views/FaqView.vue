<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">常见问题</span>
    </div>

    <div class="list">
      <div class="row" v-for="f in faqs" :key="f.id" @click="go(f)">
        <span class="q">Q</span>
        <span class="txt">{{ f.q }}</span>
        <span class="arrow">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { faqs } from '../data/mock'

const router = useRouter()
function go(f) {
  router.push('/service/faq/' + f.id)
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

.list {
  background: var(--card);
  margin: 12px;
  border-radius: var(--radius);
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 14px;
  border-bottom: 1px solid #f2f2f2;
}
.row:last-child { border-bottom: none; }
.q {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.txt { flex: 1; font-size: 14px; color: var(--text); }
.arrow { color: #bbb; display: flex; }
.row:active { background: #fafafa; }
</style>

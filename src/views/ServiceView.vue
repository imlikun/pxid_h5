<template>
  <div class="service">
    <!-- 顶部标题 -->
    <div class="topbar">
      <div class="title">服务</div>
    </div>

    <!-- 6 个服务入口 -->
    <div class="grid">
      <div
        v-for="s in serviceEntries"
        :key="s.key"
        class="entry"
        @click="onEntry(s)"
      >
        <IconSvg class="eicon" :name="s.icon" :size="26" />
        <span class="elabel">{{ s.label }}</span>
        <span class="edesc">{{ s.desc }}</span>
      </div>
    </div>

    <!-- 附近门店 -->
    <div class="block-title" @click="goStores">附近门店 <span class="more">更多 ›</span></div>
    <StoreCard :store="nearbyStore" />

    <!-- 常见问题 -->
    <SectionHeader title="常见问题" more="更多" @more="goFaqList" />
    <div class="faq-list">
      <FaqItem v-for="f in faqs" :key="f.id" :faq="f" />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import StoreCard from '../components/StoreCard.vue'
import SectionHeader from '../components/SectionHeader.vue'
import FaqItem from '../components/FaqItem.vue'
import IconSvg from '../components/IconSvg.vue'
import { serviceEntries, nearbyStore, faqs } from '../data/mock'

const router = useRouter()

const entryMap = {
  rescue: '/service/rescue',
  guide: '/service/guide',
  check: '/service/check',
  feedback: '/service/feedback',
  policy: '/service/policy',
  workorders: '/service/workorders',
}

function onEntry(s) {
  router.push(entryMap[s.key] || '/service')
}
function goStores() {
  router.push('/service/stores')
}
function goFaqList() {
  router.push('/service/faq')
}
function goFaqDetail(f) {
  router.push('/service/faq/' + f.id)
}
</script>

<style scoped>
.service {
  padding-top: env(safe-area-inset-top);
}
.topbar {
  padding: 16px 12px 8px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 8px 12px;
}
.entry {
  background: var(--card);
  border-radius: var(--radius);
  padding: 14px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.eicon {
  width: 26px;
  height: 26px;
  color: #333333;
}
.elabel {
  font-size: 13px;
  font-weight: 600;
  margin-top: 2px;
}
.edesc {
  font-size: 11px;
  color: var(--text-sub);
}
.block-title {
  font-size: 14px;
  font-weight: 600;
  padding: 12px 12px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.block-title .more {
  font-size: 12px;
  color: #999999;
  font-weight: 400;
}
.faq-list {
  background: var(--card);
  margin: 0 12px 16px;
  border-radius: var(--radius);
  overflow: hidden;
}
</style>

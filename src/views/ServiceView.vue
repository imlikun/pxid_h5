<template>
  <div class="service">
    <!-- 顶部标题 -->
    <div class="topbar">
      <div class="title">服务</div>
      <span class="headset" @click="goFeedback">
        <IconSvg name="headset" :size="24" />
      </span>
    </div>

    <!-- 6 个服务入口（单张白卡） -->
    <div class="grid">
      <div
        v-for="(s, i) in serviceEntries"
        :key="s.key"
        class="entry fade-up press"
        :class="'stagger-' + ((i % 10) + 1)"
        @click="onEntry(s)"
      >
        <IconSvg class="eicon" :name="s.icon" :size="26" />
        <span class="elabel">{{ s.label }}</span>
      </div>
    </div>

    <!-- 附近门店 -->
    <SectionHeader title="附近门店" more="更多" @more="goStores" />
    <StoreCard :store="nearbyStore" class="fade-up stagger-5" />

    <!-- 常见问题 -->
    <SectionHeader title="常见问题" more="更多" @more="goFaqList" />
    <div class="faq-list">
      <FaqItem
        v-for="(f, i) in faqs.slice(0, 4)"
        :key="f.id"
        :faq="f"
        :class="['fade-up', 'stagger-' + ((i % 10) + 6)]"
        @click="goFaqDetail(f)"
      />
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
function goFeedback() {
  router.push('/service/feedback')
}
</script>

<style scoped>
.service {
  padding-top: env(safe-area-inset-top);
}
.topbar {
  padding: 16px 16px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.headset {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin: 0 12px;
  padding: 18px 0;
  background: var(--card);
  border-radius: var(--radius);
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 4px;
}
.eicon {
  width: 26px;
  height: 26px;
  color: var(--brand);
}
.elabel {
  font-size: 14px;
  color: var(--text);
}
.faq-list {
  background: var(--card);
  margin: 0 12px 16px;
  border-radius: var(--radius);
  overflow: hidden;
}
</style>

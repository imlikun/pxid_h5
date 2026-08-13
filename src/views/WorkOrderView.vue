<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">我的工单</span>
    </div>

    <!-- 状态 tab -->
    <div class="tabs">
      <div
        v-for="t in tabs"
        :key="t"
        class="tab"
        :class="{ active: activeTab === t }"
        @click="activeTab = t"
      >{{ t }}</div>
    </div>

    <!-- 工单卡片 -->
    <div class="list">
      <div v-for="o in filtered" :key="o.id" class="card">
        <span class="headset" @click="onHeadset(o)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h2v4H4zM18 14h2v4h-2z"/></svg>
        </span>
        <div class="row1">
          <span class="oid">{{ o.id }}</span>
          <span class="type-status">{{ o.type }} · <i :class="['st', statusClass(o.status)]">{{ o.status }}</i></span>
        </div>
        <div class="time">{{ o.time }}</div>
        <div class="model">车型：{{ o.model }}</div>
        <div class="summary">{{ summaryLabel(o) }}：{{ o.summary }}</div>
        <div class="actions">
          <button
            v-if="o.canCancel"
            class="btn btn-cancel"
            @click="onCancel(o)"
          >取消工单</button>
          <button class="btn btn-detail" @click="onDetail(o)">查看详情</button>
        </div>
      </div>

      <div v-if="filtered.length === 0" class="empty">该分类下暂无工单</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { workOrderTabs, workOrderStatusMap, workOrders } from '../data/mock'
import bridge from '../bridge'

const router = useRouter()
const tabs = workOrderTabs
const activeTab = ref('全部')

const filtered = computed(() => {
  if (activeTab.value === '全部') return workOrders
  const st = workOrderStatusMap[activeTab.value]
  return workOrders.filter((o) => o.status === st)
})

function statusClass(status) {
  // 服务中 / 待受理 → 蓝色；其余 → 灰色
  return status === '服务中' || status === '待受理' ? 'st-blue' : 'st-gray'
}
function summaryLabel(o) {
  if (o.type === '保养') return '保养项目'
  return '报修问题'
}
function onHeadset(o) {
  bridge.call('openNative', { target: 'service.contact', orderId: o.id })
}
function onCancel(o) {
  console.log('cancel order:', o.id)
  bridge.call('openNative', { target: 'service.cancelOrder', orderId: o.id })
}
function onDetail(o) {
  router.push(`/service/workorders/${o.id}`)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}
.back { position: absolute; left: 12px; display: flex; color: #333333; }
.title { font-size: 18px; font-weight: 700; color: #333333; }

.tabs {
  display: flex;
  padding: 0 12px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}
.tab {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #999999;
  padding: 12px 0 10px;
  position: relative;
}
.tab.active {
  color: #000000;
  font-weight: 700;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 2px;
  background: #2563EB;
  border-radius: 2px;
}

.list { padding: 12px; }
.card {
  position: relative;
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.headset {
  position: absolute;
  top: 14px;
  right: 14px;
  color: #999999;
  display: flex;
}
.row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 26px;
}
.oid { font-size: 14px; color: #333333; font-weight: 600; }
.type-status { font-size: 13px; color: #666666; }
.st { font-style: normal; margin-left: 2px; }
.st-blue { color: #2563EB; }
.st-gray { color: #999999; }
.time { font-size: 14px; color: #999999; margin-top: 4px; }
.model { font-size: 13px; color: #666666; margin-top: 12px; }
.summary {
  font-size: 14px;
  color: #333333;
  margin-top: 8px;
  line-height: 1.5;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.btn {
  font-size: 15px;
  border-radius: 8px;
  padding: 8px 18px;
  border: none;
}
.btn-cancel {
  background: #ffffff;
  color: #999999;
  border: 1px solid #dddddd;
}
.btn-detail {
  background: #333333;
  color: #ffffff;
}
.empty {
  text-align: center;
  color: #bbbbbb;
  padding: 60px 0;
  font-size: 14px;
}
</style>

<template>
  <div class="page">
    <TopBar title="我的工单" />

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
          <IconSvg name="headset" :size="20" />
        </span>
        <div class="row-id">工单编号：{{ o.id }}</div>
        <div class="row-meta">
          <span class="time">{{ o.time }}</span>
          <span class="type">{{ o.type }}</span>
          <span class="status" :class="statusClass(o.status)">{{ o.status }}</span>
        </div>
        <div class="row-model">车辆型号：{{ o.model }}</div>
        <div class="row-summary">{{ summaryLabel(o) }}：{{ o.summary }}</div>
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
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'

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
  bridge.openNative('service/contact?orderId=' + o.id)
}
function onCancel(o) {
  console.log('cancel order:', o.id)
  bridge.openNative('service/cancelOrder?orderId=' + o.id)
}
function onDetail(o) {
  router.push(`/service/workorders/${o.id}`)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: env(safe-area-inset-bottom);
}

.tabs {
  display: flex;
  padding: 0 12px;
  background: var(--card);
  border-bottom: 1px solid var(--line);
}
.tab {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: var(--text-hint);
  padding: 12px 0 10px;
  position: relative;
}
.tab.active {
  color: var(--text);
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
  background: var(--brand);
  border-radius: 2px;
}

.list { padding: 12px; }
.card {
  position: relative;
  background: var(--card);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.headset {
  position: absolute;
  top: 14px;
  right: 14px;
  color: var(--text-hint);
  display: flex;
}
.row-id { font-size: 15px; color: var(--text); font-weight: 600; }
.row-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 13px;
}
.row-meta .time { color: var(--text-hint); }
.row-meta .type { color: var(--text-sub); }
.row-meta .status { font-weight: 500; }
.st-blue { color: var(--brand); }
.st-gray { color: var(--text-hint); }
.row-model {
  font-size: 14px;
  color: var(--text-sub);
  margin-top: 12px;
}
.row-summary {
  font-size: 14px;
  color: var(--text);
  margin-top: 6px;
  line-height: 1.5;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.btn {
  flex: 1;
  font-size: 14px;
  border-radius: 8px;
  padding: 10px 0;
  border: none;
}
.btn-cancel {
  background: var(--card);
  color: var(--text-hint);
  border: 1px solid var(--line);
}
.btn-detail {
  background: #2F2F2F;
  color: #ffffff;
}
.empty {
  text-align: center;
  color: var(--text-hint);
  padding: 60px 0;
  font-size: 14px;
}
</style>

<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">工单详情</span>
      <span class="headset" @click="onHeadset">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h2v4H4zM18 14h2v4h-2z"/></svg>
      </span>
    </div>

    <div v-if="detail" class="body">
      <!-- 头部：编号 + 时间 -->
      <div class="head">
        <div class="oid">工单编号：{{ detail.id }}</div>
        <div class="ctime">创建时间 {{ detail.time }}</div>
      </div>

      <!-- 进度节点 -->
      <div class="steps">
        <div
          v-for="(s, i) in detail.steps"
          :key="s.name"
          class="step"
          :class="{ done: s.done, current: s.current }"
        >
          <div class="dot">
            <svg v-if="s.done && !s.current" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div class="sname">{{ s.name }}</div>
          <div v-if="i < detail.steps.length - 1" class="line" :class="{ on: s.done }"></div>
        </div>
      </div>

      <!-- 信息字段（动态渲染） -->
      <div class="info">
        <div class="field"><span class="k">车辆型号</span><span class="v">{{ detail.model }}</span></div>
        <div class="field"><span class="k">工单类型</span><span class="v">{{ detail.type }}</span></div>

        <template v-if="detail.faultDesc">
          <div class="field col"><span class="k">故障描述</span><span class="v">{{ detail.faultDesc }}</span></div>
        </template>

        <template v-if="detail.faultImages && detail.faultImages.length">
          <div class="field col">
            <span class="k">故障图片</span>
            <div class="imgs">
              <img v-for="(img, idx) in detail.faultImages" :key="idx" :src="img" class="fimg" alt="故障图片" />
            </div>
          </div>
        </template>

        <template v-if="detail.maintainItems">
          <div class="field col"><span class="k">保养项目</span><span class="v">{{ detail.maintainItems }}</span></div>
        </template>
        <template v-if="detail.maintainAdvice">
          <div class="field col"><span class="k">维护建议</span><span class="v">{{ detail.maintainAdvice }}</span></div>
        </template>

        <div class="field"><span class="k">质保判定</span><span class="v">{{ detail.warranty }}</span></div>
        <div class="field">
          <span class="k">费用</span>
          <span class="v fee">{{ detail.fee }}元</span>
        </div>
        <div class="field"><span class="k">预计完成</span><span class="v">{{ detail.eta }}</span></div>
        <div class="field col">
          <span class="k">报修地址</span>
          <span class="v">{{ detail.address }}</span>
        </div>
      </div>

      <!-- 点赞 -->
      <div class="like" @click="liked = !liked">
        <svg viewBox="0 0 24 24" width="20" height="20" :fill="liked ? '#e53935' : 'none'" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span :class="['like-num', { on: liked }]">{{ detail.likes + (liked ? 1 : 0) }}</span>
      </div>
    </div>

    <div v-else class="notfound">未找到该工单</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { workOrderDetails } from '../data/mock'
import bridge from '../bridge'

const router = useRouter()
const route = useRoute()
const liked = ref(false)

const detail = computed(() => workOrderDetails[route.params.id] || null)

function onHeadset() {
  bridge.call('openNative', { target: 'service.contact', orderId: route.params.id })
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
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.headset { position: absolute; right: 14px; display: flex; color: var(--text-hint); }

.body { padding: 16px 12px; }
.head {
  background: #f7f7f7;
  border-radius: 12px;
  padding: 14px;
}
.oid { font-size: 15px; font-weight: 600; color: var(--text); }
.ctime { font-size: 13px; color: var(--text-hint); margin-top: 4px; }

.steps {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 8px 8px;
}
.step {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #eeeeee;
  color: var(--text-hint);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  z-index: 2;
}
.step.done .dot { background: var(--brand); color: #ffffff; }
.step.current .dot { background: var(--brand); color: #ffffff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15); }
.sname {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 8px;
  text-align: center;
}
.step.done .sname, .step.current .sname { color: var(--brand); }
.line {
  position: absolute;
  top: 13px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #eeeeee;
  z-index: 1;
}
.line.on { background: var(--brand); }

.info {
  margin-top: 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
}
.field {
  display: flex;
  align-items: center;
  padding: 13px 14px;
  border-bottom: 1px solid #f5f5f5;
}
.field:last-child { border-bottom: none; }
.field.col { flex-direction: column; align-items: flex-start; }
.field .k {
  width: 76px;
  flex: none;
  font-size: 13px;
  color: var(--text-hint);
}
.field.col .k { margin-bottom: 6px; }
.field .v { font-size: 14px; color: var(--text); flex: 1; line-height: 1.5; }
.fee { color: #e53935; font-weight: 600; }
.imgs { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; }
.fimg { width: 84px; height: 84px; border-radius: 8px; object-fit: cover; }

.like {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 24px 0 8px;
  color: var(--text-hint);
  font-size: 14px;
}
.like-num.on { color: #e53935; }
.notfound { text-align: center; color: #bbbbbb; padding: 80px 0; }
</style>

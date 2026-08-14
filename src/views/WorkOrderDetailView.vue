<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">工单详情</span>
      <span class="headset" @click="onHeadset">
        <IconSvg name="headset" :size="20" />
      </span>
    </div>

    <div v-if="detail" class="body">
      <!-- 头部：编号 + 时间 -->
      <div class="card head">
        <div class="head-row">
          <span class="oid">工单编号：{{ detail.id }}</span>
          <span class="headset-inline" @click="onHeadset">
            <IconSvg name="headset" :size="18" />
          </span>
        </div>
        <div class="ctime">{{ detail.time }}</div>
      </div>

      <!-- 进度节点 -->
      <div class="card steps">
        <div
          v-for="(s, i) in detail.steps"
          :key="s.name"
          class="step"
          :class="{ done: s.done, current: s.current }"
        >
          <div class="dot">
            <IconSvg :name="s.icon" :size="16" />
          </div>
          <div class="sname">{{ s.name }}</div>
          <div v-if="i < detail.steps.length - 1" class="line" :class="{ on: s.done }"></div>
        </div>
      </div>

      <!-- 信息字段 -->
      <div class="card info">
        <div class="field">
          <span class="k">车辆型号</span>
          <span class="v">{{ detail.model }}</span>
        </div>
        <div class="field">
          <span class="k">工单类型</span>
          <span class="v">{{ detail.type }}</span>
        </div>

        <template v-if="detail.faultDesc">
          <div class="field col">
            <span class="k">故障描述</span>
            <span class="v">{{ detail.faultDesc }}</span>
          </div>
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
          <div class="field col">
            <span class="k">保养项目</span>
            <span class="v">{{ detail.maintainItems }}</span>
          </div>
        </template>
        <template v-if="detail.maintainAdvice">
          <div class="field col">
            <span class="k">维护建议</span>
            <span class="v">{{ detail.maintainAdvice }}</span>
          </div>
        </template>

        <div class="field">
          <span class="k">质保判定</span>
          <span class="v">{{ detail.warranty }}</span>
        </div>
        <div class="field">
          <span class="k">费用</span>
          <span class="v fee">{{ detail.fee }}元</span>
        </div>
        <div class="field">
          <span class="k">预计完成时间</span>
          <span class="v">{{ detail.eta }}</span>
        </div>
        <div class="field address">
          <span class="k">报修地址</span>
          <span class="v">{{ detail.address }}</span>
          <span class="loc-icon" @click="onMap">
            <IconSvg name="location" :size="18" />
          </span>
        </div>
      </div>

      <!-- 点赞 -->
      <div class="like" @click="liked = !liked">
        <IconSvg name="thumbs-up" :size="20" :class="['like-icon', { on: liked }]" />
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
import IconSvg from '../components/IconSvg.vue'

const router = useRouter()
const route = useRoute()
const liked = ref(false)

const detail = computed(() => workOrderDetails[route.params.id] || null)

function onHeadset() {
  bridge.openNative('service/contact?orderId=' + route.params.id)
}
function onMap() {
  if (!detail.value) return
  bridge.openMap({ lat: detail.value.lat, lng: detail.value.lng, name: detail.value.address })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--card);
  border-bottom: 1px solid var(--line);
}
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.headset { position: absolute; right: 14px; display: flex; color: var(--text-hint); }

.body { padding: 12px; }
.card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 12px;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.oid { font-size: 15px; font-weight: 600; color: var(--text); }
.headset-inline { color: var(--text-hint); display: flex; }
.ctime { font-size: 13px; color: var(--text-hint); margin-top: 6px; }

.steps {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 4px 8px;
}
.step {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--text-hint);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.step.done .dot { background: var(--brand-soft); color: var(--brand); }
.step.current .dot { background: var(--brand); color: #ffffff; }
.sname {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 8px;
  text-align: center;
}
.step.done .sname, .step.current .sname { color: var(--text); }
.line {
  position: absolute;
  top: 16px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--line);
  z-index: 1;
}
.line.on { background: var(--brand-light); }

.info { padding: 0 14px; }
.field {
  display: flex;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}
.field:last-child { border-bottom: none; }
.field.col { flex-direction: column; align-items: flex-start; }
.field .k {
  width: 80px;
  flex: none;
  font-size: 14px;
  color: var(--text-hint);
}
.field.col .k { margin-bottom: 6px; }
.field .v { font-size: 14px; color: var(--text); flex: 1; line-height: 1.5; }
.fee { color: var(--price); font-weight: 600; }
.address .v { padding-right: 6px; }
.loc-icon {
  color: var(--brand);
  display: flex;
  flex: none;
}
.imgs { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; }
.fimg { width: 84px; height: 84px; border-radius: 8px; object-fit: cover; }

.like {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 8px 0;
  color: var(--text-hint);
  font-size: 14px;
}
.like-icon { color: var(--text-hint); }
.like-icon.on { color: var(--price); }
.like-num.on { color: var(--price); }
.notfound { text-align: center; color: var(--text-hint); padding: 80px 0; }
</style>

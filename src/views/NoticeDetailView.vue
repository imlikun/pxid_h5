<template>
  <div class="ndetail">
    <div class="nav">
      <span class="back press" @click="onBack">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="title">公告详情</span>
      <span class="right"></span>
    </div>

    <div v-if="item" class="body">
      <div class="head fade-up stagger-1">
        <span class="tag" :class="'tag--' + item.type">{{ typeLabel(item.type) }}</span>
        <h1 class="title">{{ item.title }}</h1>
        <div class="meta">{{ item.publisher }} · 发布于 {{ item.publishTime }}</div>
        <div class="meta">生效时间：{{ item.effectiveTime }}</div>
      </div>
      <div class="content fade-up stagger-2">{{ item.content }}</div>

      <div v-if="item.forceAck && !item.isRead" class="ack-tip fade-up stagger-3">
        该公告涉及您车辆的安全与使用，请阅读并点击"已知悉"后继续。
      </div>
    </div>

    <!-- 召回强提醒：未确认时底部固定"已知悉"，禁用返回 -->
    <div v-if="item && item.forceAck && !item.isRead" class="footer">
      <button class="ack-btn press" @click="ack">我已悉知</button>
    </div>
    <div v-else class="footer">
      <button class="back-btn press" @click="onBack">返回</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notices } from '../data/mock'

const route = useRoute()
const router = useRouter()

const item = computed(() => notices.find((n) => n.id === route.params.id) || null)

function typeLabel(t) {
  return { recall: '召回', version: '版本', activity: '活动', safety: '安全', maintain: '维护' }[t] || '公告'
}

// 点击"已知悉"：标记已读（模块单例持久），返回列表
function ack() {
  if (item.value) item.value.isRead = true
  router.back()
}
// 普通公告返回；召回未确认时 onBack 被调用即视为确认路径（页面内按钮已拦截，这里兜底）
function onBack() {
  if (item.value && item.value.forceAck && !item.value.isRead) {
    // 召回未确认：引导先确认（兜底，正常走底部按钮）
    return
  }
  if (window.history.length > 1) router.back()
  else router.push('/notices')
}
</script>

<style scoped>
.ndetail {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(env(safe-area-inset-bottom) + 80px);
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #ffffff;
  position: relative;
}
.back { display: flex; align-items: center; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.right { width: 24px; }

.body { padding: 16px; }
.head { border-bottom: 1px solid var(--line); padding-bottom: 16px; }
.tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
}
.tag--recall { background: var(--price); }
.tag--version { background: var(--brand); }
.tag--activity { background: #FA8C16; }
.tag--safety { background: #52C41A; }
.tag--maintain { background: #722ED1; }
.title { font-size: 18px; margin: 10px 0 0; line-height: 1.4; }
.meta { font-size: 12px; color: var(--text-hint); margin-top: 8px; }
.content {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  margin-top: 16px;
  white-space: pre-wrap;
}
.ack-tip {
  margin-top: 16px;
  font-size: 13px;
  color: #CF1322;
  background: #FFF1F0;
  border: 1px solid #FFCCC7;
  border-radius: var(--radius);
  padding: 10px 12px;
}
.footer {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid var(--line);
}
.ack-btn {
  width: 100%;
  height: 48px;
  background: var(--brand);
  color: #fff;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
}
.back-btn {
  width: 100%;
  height: 48px;
  background: #2F2F2F;
  color: #fff;
  border-radius: 10px;
  font-size: 16px;
}
</style>

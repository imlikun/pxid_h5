<template>
  <div class="ndetail">
    <TopBar :title="t('notice.detailTitle')" :back="onBack" />

    <div v-if="item" class="body">
      <div class="head fade-up stagger-1">
        <span class="tag" :class="'tag--' + item.type">{{ typeLabel(item.type) }}</span>
        <h1 class="title">{{ item.title }}</h1>
        <div class="meta">{{ item.publisher }} · {{ t('notice.publishedAt') }} {{ item.publishTime }}</div>
        <div class="meta">{{ t('notice.effectiveTime') }}{{ item.effectiveTime }}</div>
      </div>
      <div class="content fade-up stagger-2">{{ item.content }}</div>

      <div v-if="item.forceAck && !acked" class="ack-tip fade-up stagger-3">
        {{ t('notice.recallWarn') }}
      </div>
    </div>

    <!-- 召回强提醒：未「已知悉」前底部固定确认按钮并拦截返回（合规强确认，不因点开看过而解除） -->
    <div v-if="item && item.forceAck && !acked" class="footer">
      <button class="ack-btn press" @click="ack">{{ t('notice.ackBtn') }}</button>
    </div>
    <div v-else class="footer">
      <button class="back-btn press" @click="onBack">{{ t('notice.back') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notices } from '../data/mock'
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'
import { markNoticeRead, markNoticeAck, isNoticeAcked } from '../store/noticeStore'

const route = useRoute()
const router = useRouter()

const id = computed(() => route.params.id)
const item = computed(() => notices.find((n) => n.id === id.value) || null)
// 召回强确认状态（响应式）：未确认前保留横幅与强制确认按钮
const acked = computed(() => isNoticeAcked(id.value))

// 进入详情即标记已读 → 发现页「官方公告」入口红点与列表未读圆点立即消失（产品诉求：读完就消）
// 召回公告同样消除红点，但其强提醒由 ack 状态单独控制，不因点开而解除
watch(id, (v) => { if (v) markNoticeRead(v) }, { immediate: true })

function typeLabel(type) {
  return {
    recall: t('notice.type.recall'),
    version: t('notice.type.version'),
    activity: t('notice.type.activity'),
    safety: t('notice.type.safety'),
    maintain: t('notice.type.maintain'),
  }[type] || t('notice.type.default')
}

// 点击"已知悉"：标记已读 + 已确认（store 持久化），随后返回列表
function ack() {
  if (item.value) markNoticeAck(item.value.id)
  onBack()
}
// 普通公告返回；召回未确认时拦截返回（合规强提醒，正常走底部按钮）
function onBack() {
  if (item.value && item.value.forceAck && !acked.value) {
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
  padding-bottom: calc(env(safe-area-inset-bottom) + 80px);
}

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

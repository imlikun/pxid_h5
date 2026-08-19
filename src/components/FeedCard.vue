<template>
  <div class="fcard press" @click="go">
    <img class="fcard__cover" :src="item.cover || (item.images && item.images[0]) || defaultAvatar" :alt="item.title" />
    <span v-if="isOfficial" class="fcard__badge">官方</span>
    <div class="fcard__title">{{ item.title }}</div>
    <div class="fcard__foot">
      <div class="author">
        <img class="avatar" :src="item.avatar || defaultAvatar" :alt="item.author" />
        <span class="name">{{ item.author }}</span>
      </div>
      <div class="foot-right">
        <span class="like" :class="{ liked }" @click.stop="onLike">
          <svg viewBox="0 0 24 24" width="14" height="14" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span class="like__num">{{ likeCount }}</span>
        </span>
        <button class="freport" @click.stop="openReport">举报</button>
      </div>
    </div>

    <!-- 举报理由浮层 -->
    <div v-if="showReport" class="report-mask" @click.stop="showReport = false">
      <div class="report-sheet" @click.stop>
        <div class="report-title">举报内容</div>
        <button v-for="r in reportReasons" :key="r" class="report-opt" @click.stop="submitReport(r)">{{ r }}</button>
        <button class="report-cancel" @click.stop="showReport = false">取消</button>
      </div>
    </div>
    <div v-if="toastMsg" class="f-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { defaultAvatar } from '../data/mock'
import { likeFeed, reportFeed } from '../api/feed'
import { setFeedCache } from '../store/feedCache'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()
const liked = ref(!!props.item.isLiked)
const likeCount = ref(props.item.likes || 0)
const isOfficial = computed(() => props.item.kind === 'official')

async function onLike() {
  const willLike = !liked.value
  liked.value = willLike
  likeCount.value += willLike ? 1 : -1
  const res = await likeFeed(props.item.id)
  if (!res.ok) {
    liked.value = !willLike
    likeCount.value += willLike ? -1 : 1
  }
}

function go() {
  setFeedCache(props.item.id, props.item)
  router.push('/feed/' + props.item.id)
}

// ---- 举报（UGC 内容安全闭环）----
const showReport = ref(false)
const reportReasons = ['辱骂攻击', '广告导流', '不实信息', '色情低俗', '其他']
const toastMsg = ref('')
let toastTimer = null
function toast(m) {
  toastMsg.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 1600)
}
function openReport() { showReport.value = true }
async function submitReport(reason) {
  const res = await reportFeed(props.item.id, reason)
  showReport.value = false
  toast(res.ok ? '举报已提交，感谢反馈' : (res.message || '举报失败'))
}
</script>

<style scoped>
.fcard {
  background: transparent;
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
.fcard__badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--brand);
  border-radius: 4px;
  padding: 2px 7px;
  z-index: 2;
}
.fcard__cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.fcard__title {
  padding: 10px 0 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.45;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fcard__foot {
  padding: 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.foot-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.author {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.name {
  font-size: 12px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.like {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--text-hint);
  flex: none;
}
.like__num {
  transform: translateY(0.5px);
}
.like.liked {
  color: var(--price);
}
.freport {
  flex: none;
  font-size: 12px;
  color: var(--text-hint);
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-pill);
  padding: 3px 9px;
}

/* 举报浮层 */
.report-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.report-sheet {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 8px 0 16px;
}
.report-title {
  text-align: center;
  font-size: 14px;
  color: var(--text-hint);
  padding: 12px 0;
}
.report-opt {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 15px;
  color: var(--text);
  background: #fff;
  padding: 14px 0;
  border: none;
  border-top: 1px solid #f0f1f3;
}
.report-cancel {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 15px;
  color: var(--text-sub);
  font-weight: 600;
  background: #fff;
  padding: 14px 0;
  margin-top: 8px;
  border: none;
  border-top: 1px solid #f0f1f3;
}
.f-toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: var(--radius);
  z-index: 100;
}
</style>

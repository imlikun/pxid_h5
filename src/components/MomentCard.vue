<template>
  <div class="moment press" @click="open">
    <div class="m-head">
      <img class="m-avatar" :src="item.avatar || defaultAvatar" :alt="item.author" />
      <div class="m-meta">
        <div class="m-name">
          {{ item.author }}
          <span v-if="isOfficial" class="m-official">官方</span>
        </div>
        <div class="m-time">{{ item.time }}</div>
      </div>
      <button
        v-if="!isOfficial && !following"
        class="m-follow"
        @click.stop="onFollow"
      >+ 关注</button>
      <button
        v-else-if="!isOfficial && following"
        class="m-followed-btn"
        @click.stop="onUnfollow"
      >已关注</button>
      <button v-if="!isOfficial" class="m-report" @click.stop="openReport">举报</button>
    </div>

    <div class="m-title">{{ item.title }}</div>
    <div class="m-body">{{ item.content }}</div>

    <div class="m-imgs" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <img
        v-for="(img, i) in item.images"
        :key="i"
        class="m-img"
        :class="{ single: cols === 1 }"
        :src="img"
        :alt="item.title"
        @click.stop="onPreview(img)"
      />
    </div>

    <div class="m-foot">
      <span v-if="item.carModel" class="m-tag" @click.stop="onCar(item.carModel)">#{{ item.carModel }}</span>
      <div class="m-acts">
        <span class="m-act" :class="{ liked }" @click.stop="onLike">
          <svg viewBox="0 0 24 24" width="16" height="16" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span>{{ likeCount }}</span>
        </span>
        <span class="m-act" @click.stop="open">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          <span>{{ item.comments }}</span>
        </span>
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
    <div v-if="toastMsg" class="m-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import bridge from '../bridge'
import { defaultAvatar } from '../data/mock'
import { likeFeed, followUser, unfollowUser, checkFollow, reportFeed } from '../api/feed'
import { setFeedCache } from '../store/feedCache'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()

const liked = ref(!!props.item.isLiked)
const likeCount = ref(props.item.likes || 0)
const isOfficial = computed(() => props.item.kind === 'official')

// 关注状态（后端驱动；官方帖无关注）
const following = ref(false)
onMounted(async () => {
  if (!isOfficial.value && props.item.deviceId) {
    following.value = await checkFollow(props.item.deviceId)
  }
})

const cols = computed(() => {
  const n = props.item.images ? props.item.images.length : 0
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
})

function open() {
  setFeedCache(props.item.id, props.item)
  router.push('/feed/' + props.item.id)
}
function onPreview(img) {
  console.log('preview image:', img)
}
function onCar(model) {
  bridge.openNative('vehicle/' + model)
}
async function onLike() {
  const willLike = !liked.value
  liked.value = willLike
  likeCount.value += willLike ? 1 : -1
  const res = await likeFeed(props.item.id)
  if (!res.ok) {
    liked.value = !willLike
    likeCount.value += willLike ? -1 : 1
  }
  bridge.openNative('feed/interact?type=like&id=' + props.item.id)
}
async function onFollow() {
  if (!props.item.deviceId) return
  const res = await followUser(props.item.deviceId)
  if (res.ok) following.value = true
  bridge.openNative('feed/follow?id=' + props.item.id)
}
async function onUnfollow() {
  if (!props.item.deviceId) return
  const res = await unfollowUser(props.item.deviceId)
  if (res.ok) following.value = false
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
  bridge.openNative('feed/report?id=' + props.item.id + '&reason=' + encodeURIComponent(reason))
  toast(res.ok ? '举报已提交，感谢反馈' : (res.message || '举报失败'))
}
</script>

<style scoped>
.moment {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: 12px;
  margin: 0 12px 12px;
  position: relative;
}
.m-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.m-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.m-meta { flex: 1; min-width: 0; }
.m-name { font-size: 14px; font-weight: 600; color: var(--text); }
.m-time { font-size: 12px; color: var(--text-hint); margin-top: 2px; }
.m-official {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--brand);
  border-radius: 4px;
  padding: 1px 6px;
  vertical-align: middle;
  transform: translateY(-1px);
}
.m-follow {
  flex: none;
  font-size: 13px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 5px 12px;
}
.m-followed-btn {
  flex: none;
  font-size: 13px;
  color: var(--text-hint);
  background: #f0f1f3;
  border-radius: var(--radius-pill);
  padding: 5px 12px;
}
.m-report {
  flex: none;
  font-size: 12px;
  color: var(--text-hint);
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  margin-left: 6px;
}
.m-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.45;
  margin-top: 10px;
}
.m-body {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
  margin-top: 6px;
}
.m-imgs {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}
.m-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--radius);
  display: block;
}
.m-img.single {
  aspect-ratio: 4 / 3;
  max-height: 280px;
}
.m-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.m-tag {
  font-size: 13px;
  color: var(--text-sub);
  background: #f0f1f3;
  border-radius: var(--radius-pill);
  padding: 4px 12px;
}
.m-acts { display: flex; align-items: center; gap: 18px; }
.m-act {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--text-hint);
}
.m-act.liked { color: var(--price); }

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
.m-toast {
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

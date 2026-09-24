<template>
  <div :class="['fcard', 'press', { 'is-pinned': item.pinned }]" @click="go" @touchstart.passive="onWarm" @mouseenter="onWarm">
    <div class="fcard__coverwrap">
      <img class="fcard__cover" :src="coverUrl" :alt="item.title" loading="lazy" @error="onImgErr" />
      <span v-if="item.pinned" class="fcard__pin">{{ t('feed.pinned') }}</span>
      <!-- §3 S1：封面内右下标签 chip（≤2 个，半透明黑底白字，图上零描边零阴影） -->
      <div v-if="coverTags.length" class="fcard__tags">
        <span v-for="tag in coverTags" :key="tag" class="fcard__tag">{{ tag }}</span>
      </div>
      <span v-if="item.videoUrl" class="fcard__play"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>
    </div>
    <div class="fcard__title">{{ item.title }}</div>
    <div class="fcard__foot">
      <div class="author" @click.stop="goUser">
        <img class="avatar" :src="avatarUrl" :alt="item.author" loading="lazy" @error="(e) => handleAvatarError(e, item.author)" />
        <span class="name">{{ item.author }}</span>
      </div>
      <span class="like">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span class="like__num">{{ item.likes }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { t } from '../i18n'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'
import { mediaUrl } from '../storage'
import { captureVideoPoster } from '../utils/videoPoster'
import bridge from '../bridge'
import { prefetchFeedDetail, prefetchComments, prewarmFeedMedia } from '../api/feed'
import { putFeedSnapshot } from '../utils/feedSnapshot'

const props = defineProps({
  item: { type: Object, required: true },
  // 可选回调：发现页分栏态（≥600px）下点卡片不跳页，改为通知父级在右栏选中详情。
  // 传了它则点击只触发 onSelect、不再走原生全屏/H5 路由；不传则维持原 go() 行为（其他页不受影响）。
  onSelect: { type: Function, default: null },
})
const router = useRouter()
// 封面兜底：cover → images[0] → 静态占位图（避免 src='' 出现 broken 图）
const FALLBACK = import.meta.env.BASE_URL + 'feed_default.jpg'
// 视频封面：优先 videoCover；为空时 canvas 截首帧兜底，失败回 FALLBACK
const coverUrl = ref(FALLBACK)
function updateCover() {
  const it = props.item || {}
  if (it.videoUrl) {
    const c = mediaUrl(it.videoCover)
    if (c) { coverUrl.value = c; return }
    coverUrl.value = FALLBACK
    const src = mediaUrl(it.videoUrl)
    if (src) nextTick(() => captureVideoPoster(src).then((d) => { if (d) coverUrl.value = d }))
    return
  }
  coverUrl.value = it.cover || (Array.isArray(it.images) && it.images[0]) || FALLBACK
}
updateCover()
watch(() => props.item, updateCover)
const avatarUrl = computed(() => resolveAvatar(props.item.author, props.item.avatar))
// §3 S1：图上标签 chip，最多 2 个（动态自带 tags），半透明黑底白字
const coverTags = computed(() => {
  const tags = (props.item && props.item.tags) || []
  return Array.isArray(tags) ? tags.slice(0, 2) : []
})
function onImgErr(e) {
  // 网络抖动/原图失效 → 换兜底（再失败也不再递归）
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}

function go() {
  // 分栏态（发现页 ≥600px）：点卡片不改页、不跳原生，交给父级在右栏选中详情
  if (props.onSelect) {
    props.onSelect(props.item)
    return
  }
  // 先把卡片手里的这份数据交给详情页直出（省掉转场里的加载圈，见 utils/feedSnapshot.js）
  putFeedSnapshot(props.item)
  // App 环境：交 Flutter 原生右进左出路由全屏打开（根页与底栏原样保留），
  // 发送成功必须 return，不得再 router.push（对接说明 2026-09-07）
  if (bridge.openFeedDetailNative(props.item.id)) return
  // 浏览器预览/桌面端/旧 App 回退：H5 自身路由
  // onOpenDetail 通知原生即将进详情（旧契约：Flutter 转场首帧前藏底栏，未实现时静默）
  bridge.onOpenDetail(props.item.id)
  router.push('/feed/' + props.item.id)
}
// 预热：手指按下/鼠标移入就提前拉详情+详情页图片，点进去时多数已返回
function onWarm() {
  prefetchFeedDetail(props.item.id)
  prefetchComments(props.item.id)
  prewarmFeedMedia(props.item)
}
// 点作者 → 个人主页（他人/自己统一由主页按 id 识别）
// /user/:id 在全屏白名单内（2026-09-08 对接说明）：根 WebView 发全屏通道，
// 用户主页等二级 WebView 内 openFullscreenRoute 自动回退 router.push
function goUser() {
  if (props.item && props.item.deviceId) {
    const r = '/user/' + encodeURIComponent(props.item.deviceId)
    if (bridge.openFullscreenRoute(r)) return
    router.push(r)
  }
}
</script>

<style scoped>
.fcard {
  /* 白底卡片（2026-09-21 坤哥反馈：发现页推荐列表每条改白色背景）。
     对齐 MomentCard 的既有白卡规范：--card 底 + 卡片档圆角 + 极轻阴影，
     与「动态」tab 单列白卡在视觉上统一（此前这里是 transparent，文字直接压在灰底上）。
     图片仍通栏贴顶（靠 overflow:hidden 裁出上方圆角），文字区留 10px 内边距。 */
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow); /* §2 统一单层 6%，取代旧 4% */
  overflow: hidden;
}
/* §3 S2 官方/置顶卡：品牌蓝 1.5px 实色描边（一屏 ≤2 张，超了退 S1） */
.fcard.is-pinned {
  border: 1.5px solid var(--brand);
}
.fcard__coverwrap {
  position: relative;
}
.fcard__cover {
  width: 100%;
  /* §3 S1：统一 3:4 竖图（生成规格 768×1024），错落靠标题 1~2 行，不做封面比例乱跳 */
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}
/* §2 图上标签 chip：半透明黑底 + 10px 白字/500，≤2 个，右下角；零描边零阴影 */
.fcard__tags {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  gap: 4px;
  z-index: 2;
  pointer-events: none;
}
.fcard__tag {
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 6px;
  max-width: 72px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fcard__pin {
  position: absolute;
  top: 6px;
  left: 6px;
  background: var(--brand);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 4px;
  z-index: 2;
}
.fcard__play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  pointer-events: none;
}
.fcard__title {
  /* §2.5 卡片标题 13px/500；不再固定 min-height —— 1~2 行差就是瀑布流错落的来源（§5），
     列高差交给贪心分列补偿（≤15%）。 */
  padding: 10px 10px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fcard__foot {
  padding: 8px 10px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  /* §2.5 metadata 11px/400 灰 */
  font-size: 11px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.like {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-hint);
  flex: none;
}
.like__num {
  transform: translateY(0.5px);
}
</style>
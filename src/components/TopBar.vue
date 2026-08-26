<template>
  <div class="tb-bar" :class="{ 'tb-sticky': sticky }">
    <!-- 左：默认返回箭头（22px）／可用 left slot 覆盖（如 Tab 组） -->
    <div class="tb-left">
      <slot name="left">
        <span v-if="showBack" class="tb-back press" @click="onBack">
          <svg v-if="close" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </span>
      </slot>
    </div>

    <!-- 中：标题（绝对居中，16/600） -->
    <div class="tb-title" :class="{ 'tb-title-interactive': interactive }">
      <slot name="title">{{ title }}</slot>
    </div>

    <!-- 右：操作区（图标统一 24px） -->
    <div class="tb-right">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  /** 居中标题 */
  title: { type: String, default: '' },
  /** 是否显示返回箭头 */
  showBack: { type: Boolean, default: true },
  /** 左侧用 × 关闭图标（替代返回箭头），如筛选页 */
  close: { type: Boolean, default: false },
  /** 标题区可交互（如放搜索输入框时需开启） */
  interactive: { type: Boolean, default: false },
  /** 主 Tab 页吸顶（滚动时顶栏保持在顶部） */
  sticky: { type: Boolean, default: false },
  /** 自定义返回逻辑；不传则默认 router.back() */
  back: { type: Function, default: null },
})

const router = useRouter()
function onBack() {
  if (props.back) props.back()
  else router.back()
}
</script>

<style>
/* 全站统一顶栏：48px 高 · 三栏布局 · 返回箭头 22 / 操作图标 24
   类名 tb-* 全局唯一，slot 内容样式仍由各页面 scoped 样式负责 */
.tb-bar {
  position: relative;
  min-height: 48px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: var(--bg, #ffffff);
}
.tb-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  /* 沉浸式：吸在视口最顶，自身内边距把内容推到状态栏下方，背景铺到状态栏之上
     兜底 44px：Flutter 内嵌 WebView 不向 H5 注入 env(safe-area-inset-top)（真机返回 0），
     不加固定兜底则顶栏贴 y=0 被状态栏遮挡。env 生效时取其值，否则用 44px */
  padding-top: max(env(safe-area-inset-top, 0px), 44px);
  background: var(--bg, #fff);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
}
.tb-left,
.tb-right {
  flex: none;
  min-width: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tb-right {
  justify-content: flex-end;
}
.tb-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: -8px;
  border-radius: 50%;
  color: var(--text, #1a1a1a);
}
.tb-back:active {
  background: rgba(0, 0, 0, 0.05);
}
.tb-title {
  position: absolute;
  top: max(env(safe-area-inset-top, 0px), 44px);
  left: 56px;
  right: 56px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
.tb-title-interactive {
  pointer-events: auto;
}
</style>

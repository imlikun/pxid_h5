<template>
  <div class="tb-bar" :class="{ 'tb-sticky': sticky }">
    <!-- 左：默认返回箭头（22px）／可用 left slot 覆盖（如 Tab 组） -->
    <div class="tb-left">
      <slot name="left">
        <span v-if="showBack" class="tb-back press" @click="onBack">
          <svg v-if="close" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 19.5-7.5-7.5 7.5-7.5"/></svg>
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
import { bridge } from '../bridge'

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
  if (props.back) {
    props.back()
    return
  }
  // 原生全屏 WebView 第一层（2026-09-08 二级页全屏右滑对接）：
  // 本 WebView 无 H5 内部历史可退，通知原生关闭全屏路由回根页（根页滚动/状态原样露出）。
  // 有 H5 历史（position>0，如 /notice/:id ← /notices）仍走 router.back()。
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function' && bridge.isWebViewFirstPage()) {
    app.postMessage('closeWebView')
    return
  }
  router.back()
}
</script>

<style>
/* 全站统一顶栏（2026-09-21 对齐 Flutter 原生 AppBar 基准）
   规格来源：坤哥给的 Flutter 侧 AppBar 精确规格 ——
     · 高度 56px（不含状态栏；status bar 由 Flutter SafeArea 承担，H5 不再叠加 env）
     · 背景纯白 #FFFFFF，无边框/无阴影/无滚动染色
     · 标题 18px / 500 / #000000DD，工具栏内垂直居中（中心距上沿 28px）
     · 返回键：18×18 图标盒、单尖括号（无箭杆），热区 48×48 距左 4px、距上沿 4px，
       故图标中心落在 (28, 28)；左/右布局槽均 56px
   类名 tb-* 全局唯一，slot 内容样式仍由各页面 scoped 样式负责 */
.tb-bar {
  position: relative;
  height: 56px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 8px 基础内边距：返回键用 -4px 抵消后热区左缘正好落在 4px（见 .tb-back），
     而 root 页（发现/精选/服务）的 Tab 组仍保持 8+8=16px 的左对齐，不被牵动 */
  padding: 0 8px;
  background: #ffffff;
}
.tb-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
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
  /* 与返回键对称：24px 图标右缘落在 16px 处 → 图标中心距右 28px */
  padding-right: 8px;
}
.tb-back {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 48×48 点击热区（Material 默认），距工具栏上沿 4px（56-48)/2 */
  width: 48px;
  height: 48px;
  /* 8px 内边距 - 4px = 热区左缘 4px；图标中心 = 4 + 24 = 28px */
  margin-left: -4px;
  border-radius: 50%;
  color: #000000DD;
}
.tb-back:active {
  /* 对应 Flutter 主题覆盖色 #26808080（ARGB）= 15% 灰；无扩散水波纹 */
  background: rgba(128, 128, 128, 0.15);
}
.tb-title {
  position: absolute;
  left: 56px;
  right: 56px;
  text-align: center;
  font-size: 18px;
  font-weight: 500;
  color: #000000DD;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
.tb-title-interactive {
  pointer-events: auto;
}
</style>

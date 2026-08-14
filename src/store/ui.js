// 轻量全局 UI 状态（无 Pinia，模块级 reactive 单例即可）
import { reactive } from 'vue'

export const uiState = reactive({
  // 动态红点：有新动态时显示（mock 默认 true 用于演示；进入动态 tab 即清）
  hasNewMoment: true,
})

export function clearNewMoment() {
  uiState.hasNewMoment = false
}
